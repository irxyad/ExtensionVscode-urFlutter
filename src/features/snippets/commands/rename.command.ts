import { appContext } from '@common/app-context';
import { AppConstant } from '@common/constants/common.constants';
import StringUtils from '@common/utils/string.utils';
import ValidationUtils from '@common/utils/validation.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import { ReturnBridgeWebview } from '@webview/webview.constants';
import path from 'path';
import * as vscode from 'vscode';
import SnippetUtils from '../snippet.utils';
import { RenameSnippetNameOption } from '../types/snippet.types';

export async function renameSnippetName(
	opt: RenameSnippetNameOption,
): Promise<void> {
	const { storage, snippetName } = opt;

	try {
		// Untuk mendapatkan semua file yang terbuka dan hanya mengambil filenamenya saja
		const allOpenFiles = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
    .filter(Boolean)
    .map((filePath) => path.basename(filePath).split('.')[0]);

		const filename = StringUtils.encode(
			`${AppConstant.ExtensionName}-${snippetName}`,
		);

		// Kalau file snippetnya terbuka, kasih warning dan gk bisa rename
		// harus di tutup dulu biar bisa handle pengecekan [checkPrefixOrName]
		if (allOpenFiles.includes(filename)) {
			VscodeMessage.error(
				`Please close this file "${filename}" before renaming`,
				'',
			);
			return;
		}

		const newName = await vscode.window.showInputBox({
			title: 'Rename snippet',
			prompt: 'Enter new snippet name',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) {
					return 'Snippet name cannot be empty';
				}

				if (!ValidationUtils.snippetName(value)) {
					return 'Invalid snippet name';
				}

				return null;
			},
		});

		if (!newName) {
			VscodeMessage.info(`Cancelled`);
			return;
		}

		const isDuplicate = await SnippetUtils.checkPrefixOrName({
			key: newName,
			storageName: storage.name,
			checkFor: 'snippetName',
			snippetName: snippetName,
		});

		if (isDuplicate) {
			VscodeMessage.error(
				`Oops! "${newName}" is already used as a snippet name. Please choose another`,
			);
			return;
		}

		const uri = await SnippetUtils.getUriByWsName(
			storage.metadata.from_workspace ?? '',
		);

		if (!uri) {
			VscodeMessage.error(`Can't find snippet file`);
			return;
		}

		const index = storage.snippets.findIndex((val) => val.name === snippetName);

		if (index === -1) {
			VscodeMessage.error(`Can't find snippet to rename`);
			return;
		}

		storage.snippets[index] = { ...storage.snippets[index], name: newName };

		await appContext.storage.writeFile({
			filename: uri.path.split('/').pop()!,
			content: storage,
			overWrite: true,
		});

		VscodeMessage.info(`Successfully renamed!`);

		const listSnippets = await SnippetUtils.readStorages();
		appContext.webview.postMessage(
			ReturnBridgeWebview.SnippetsData,
			listSnippets,
		);
	} catch (error) {
		VscodeMessage.error(error, 'Failed to rename snippet');
	}
}
