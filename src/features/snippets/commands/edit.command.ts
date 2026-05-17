import { appContext } from '@common/app-context';
import { AppConstant } from '@common/constants/common.constants';
import { AppError } from '@common/error/app.error';
import StringUtils from '@common/utils/string.utils';
import ValidationUtils from '@common/utils/validation.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import { TempFileService } from '@services/temp-file.service';
import { ReturnBridgeWebview } from '@webview/webview.constants';
import * as vscode from 'vscode';
import { SnippetConstant } from '../snippet.constants';
import SnippetUtils from '../snippet.utils';
import {
  EditSnippetOption,
  SnippetInterface,
  StorageSnippetInterface,
} from '../types/snippet.types';

export async function editSnippet(opt: EditSnippetOption): Promise<void> {
	try {
		const { snippetName, storage } = opt;

		const snippet = storage.snippets.find((val) => val.name === snippetName);

		if (!snippet) {
			throw new AppError("Can't open, snippet not found");
		}

		const encoded = StringUtils.encode(
			`${AppConstant.ExtensionName}-${snippetName}`,
		);
		const filename = `${encoded}.dart`;

		const txt = `${SnippetConstant.TitlePrefix}${snippet.prefix}\n\n${snippet.body.join('\n')}`;

		const filePath = await TempFileService.create(filename, txt);
		const doc = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(doc);

		const listener = vscode.workspace.onWillSaveTextDocument((event) => {
			if (
				event.reason === vscode.TextDocumentSaveReason.Manual &&
				event.document.uri.toString() === doc.uri.toString()
			) {
				event.waitUntil(
					saveEditing({
						newSnippet: event.document.getText(),
						snippetName,
						storage,
						body: snippet,
					}).catch((error) => {
						VscodeMessage.error(error, 'Error while saving');
					}),
				);
			}
		});

		vscode.workspace.onDidCloseTextDocument((closed) => {
			if (closed.uri.toString() === doc.uri.toString()) {
				listener.dispose();
			}
		});
	} catch (error) {
		VscodeMessage.error(error, 'Failed edit snippet');
	}
}

async function saveEditing({
	newSnippet,
	snippetName,
	storage,
	body,
}: {
	newSnippet: string;
	snippetName: string;
	storage: StorageSnippetInterface;
	body: SnippetInterface;
}): Promise<void> {
	const lines = newSnippet.split('\n');

	const prefixLine = lines.find((val) =>
		val.includes(SnippetConstant.TitlePrefix),
	);

	if (!prefixLine) {
		throw new AppError(
			`Prefix is required. Add this into new line first: ${SnippetConstant.TitlePrefix} <your_prefix>`,
		);
	}

	const prefix = prefixLine.split(' ')[2].replaceAll('\r', '');

	if (!ValidationUtils.snippetName(prefix)) {
		throw new AppError(`Invalid prefix`);
	}

	const existing = await SnippetUtils.checkPrefixOrName({
		key: prefix,
		storageName: storage.name,
		checkFor: 'prefix',
		snippetName: snippetName,
	});

	if (existing) {
		throw new AppError(
			`Oops! "${prefix}" is already used as a prefix for "${existing.name}". Please choose another`,
		);
	}

	await SnippetUtils.updateStorage({
		snippetName: snippetName,
		storageName: storage.metadata.from_workspace ?? '',
		snippet: {
			...body,
			prefix,
			body: lines
				.filter((val) => !val.includes('@prefix'))
				.filter((val, index, arr) => {
					// hapus baris kosong di awal dan akhir
					if (index === 0 || index === arr.length - 1) {
						return val.trim() !== '';
					}
					return true;
				}),
		},
	});

	VscodeMessage.success('Update saved!');

	const listSnippets = await SnippetUtils.readStorages();

	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}
