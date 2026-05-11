import { logger } from '@common/utils/logger.utils';
import ValidationUtils from '@common/utils/validation.utils';
import {
  MetadataStorageSnippet,
  SnippetInterface,
  StorageSnippetInterface,
} from '@features/snippets/types/snippet.types';
import { TempFileService } from '@services/temp-file.service';
import type { WebviewView } from 'vscode';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import { appContext } from '../../common/app-context';
import { AppConstant } from '../../common/constants/common.constants';
import { ReturnBridgeWebview } from '../../webview/webview.constants';
import { SnippetConstant } from './snippet.constants';

async function getSnippetUriByFileName(
	filename: string,
): Promise<vscode.Uri | null> {
	const dir = await appContext.storage.readDir();
	const storageUri = appContext.storage.uri;

	for (const [file] of dir) {
		if (file === filename) {
			return vscode.Uri.joinPath(storageUri, file);
		}
	}

	return null;
}

function parseStorageSnippet(
	parsed: Record<string, unknown>,
): StorageSnippetInterface {
	const metadata: MetadataStorageSnippet = {
		from_workspace: parsed.from_workspace as string,
		uri_workspace: parsed.uri_workspace as string,
	};

	const dataSnippets = Object.entries(parsed).filter(
		([, value]) =>
			typeof value === 'object' && value !== null && !Array.isArray(value),
	);

	return {
		metadata,
		storageName: metadata.from_workspace,
		dataSnippet: dataSnippets.map(([snippetName, body]) => ({
			snippetName,
			body: body as SnippetInterface,
		})),
	};
}

async function readSnippetFile(
	uri: vscode.Uri,
): Promise<Record<string, unknown> | null> {
	try {
		const data = await appContext.storage.readFile<Record<string, unknown>>(
			uri.path.split('/').pop()!,
		);
		return data;
	} catch (error) {
		logger.error('Error reading snippet file:', error);
		return null;
	}
}

async function readAllSnippets(): Promise<StorageSnippetInterface[]> {
	const uris = await getAllGlobalStorageSnippetsUri();
	const results: StorageSnippetInterface[] = [];

	for (const uri of uris) {
		const parsed = await readSnippetFile(uri);
		if (parsed) {
			results.push(parseStorageSnippet(parsed));
		}
	}

	return results;
}

async function getAllGlobalStorageSnippetsUri(): Promise<vscode.Uri[]> {
	const dir = await appContext.storage.readDir();
	const storageUri = appContext.storage.uri;

	return dir
		.filter(([file]) => file.endsWith(SnippetConstant.SuffixGroupSnippet))
		.map(([file]) => vscode.Uri.joinPath(storageUri, file));
}

async function getUriSnippetBasedWorkspace(
	name: string,
): Promise<vscode.Uri | null> {
	return getSnippetUriByFileName(
		`${name}-${SnippetConstant.SuffixGroupSnippet}`,
	);
}

async function getUriSnippetBasedName(
	name: string,
): Promise<vscode.Uri | null> {
	return getUriSnippetBasedWorkspace(name);
}

async function reloadSnippets(webview: WebviewView): Promise<void> {
	const snippets = await readAllSnippets();

	webview.webview.postMessage({
		action: 'reloadSnippets',
		snippets,
	});
}

async function saveCompressedSnippets(data: object): Promise<void> {
	const compressed = zlib.gzipSync(JSON.stringify(data)).toString('base64');
	await appContext.state.update(SnippetConstant.KeySyncSnippet, compressed);
}

async function loadCompressedSnippets(): Promise<object | null> {
	const compressed = appContext.state.get<string>(
		SnippetConstant.KeySyncSnippet,
	);
	if (!compressed) {
		return null;
	}

	const decompressed = zlib
		.gunzipSync(Buffer.from(compressed, 'base64'))
		.toString();
	return JSON.parse(decompressed);
}

async function convertRawToStorageSnippet(
	uri: vscode.Uri,
): Promise<StorageSnippetInterface | null> {
	const parsed = await readSnippetFile(uri);
	if (!parsed) {
		return null;
	}
	return parseStorageSnippet(parsed);
}

async function editSnippet({
	storage,
	snippetName,
}: {
	storage: StorageSnippetInterface;
	snippetName: string;
}): Promise<void> {
	const snippet = storage.dataSnippet.find(
		(val) => val.snippetName === snippetName,
	);

	if (!snippet) {
		vscode.window.showInformationMessage("Can't open, snippet not found");
		return;
	}

	const fileName = [
		AppConstant.ExtensionName,
		new Date().toISOString().replaceAll(':', '-'),
		storage.metadata.from_workspace,
		`${snippetName}.dart`,
	].join('-');

	const txt =
		`${SnippetConstant.TitlePrefix}${snippet.body.prefix}\n\n\t${snippet.body.body}`.replaceAll(
			',',
			'',
		);

	const filePath = await TempFileService.create(fileName, txt);
	const doc = await vscode.workspace.openTextDocument(filePath);
	await vscode.window.showTextDocument(doc);

	const listener = vscode.workspace.onWillSaveTextDocument((event) => {
		if (
			event.reason === vscode.TextDocumentSaveReason.Manual &&
			event.document.uri.toString() === doc.uri.toString()
		) {
			event.waitUntil(
				saveEditedSnippet({
					newSnippet: event.document.getText(),
					snippetName,
					storage,
					body: snippet.body,
				}),
			);
		}
	});

	vscode.workspace.onDidCloseTextDocument((closed) => {
		if (closed.uri.toString() === doc.uri.toString()) {
			listener.dispose();
		}
	});
}

async function saveEditedSnippet({
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
	const uriSnippet = await getUriSnippetBasedWorkspace(
		storage.metadata.from_workspace,
	);

	if (!uriSnippet) {
		vscode.window.showErrorMessage("Can't find snippet file");
		return;
	}

	const lines = newSnippet.split('\n');
	const prefixLine = lines.find((val) => val.includes('@prefix'));

	if (!prefixLine) {
		vscode.window.showErrorMessage('Prefix is required');
		return;
	}

	const prefix = prefixLine.split(' ')[2].replaceAll('\r', '');

	const isValid = ValidationUtils.snippetName(prefix);
	if (!isValid) {
		vscode.window.showErrorMessage('Invalid prefix');
		return;
	}

	const isDuplicate = await isExistPrefixOrSnippetName(
		prefix,
		storage,
		'prefix',
	);
	if (isDuplicate) {
		return;
	}

	const parsed = await readSnippetFile(uriSnippet);
	if (!parsed) {
		return;
	}

	parsed[snippetName] = {
		prefix,
		body: lines.filter((val) => !val.includes('@prefix')),
		description: body.description,
	} satisfies SnippetInterface;

	await appContext.storage.writeFile({
		filename: uriSnippet.path.split('/').pop()!,
		content: parsed,
	});

	vscode.window.showInformationMessage(`Snippet ${prefix} updated!`);

	const listSnippets = await readAllSnippets();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

async function renameSnippetName({
	storage,
	snippetName,
}: {
	storage: StorageSnippetInterface;
	snippetName: string;
}): Promise<boolean> {
	const rename = await vscode.window.showInputBox({
		title: 'Rename Snippet',
		prompt: 'Type here to rename it',
		validateInput: (value) => {
			if (!value) {
				return 'Snippet name cannot be empty.';
			}

			const isValid = ValidationUtils.snippetName(value);
			if (!isValid) {
				return 'Invalid snippet name.';
			}
			return null;
		},
	});

	if (!rename) {
		vscode.window.showInformationMessage('Canceled');
		return false;
	}

	const isDuplicate = await isExistPrefixOrSnippetName(
		rename,
		storage,
		'snippetName',
	);
	if (isDuplicate) {
		return false;
	}

	const uriSnippet = await getUriSnippetBasedWorkspace(
		storage.metadata.from_workspace,
	);

	if (!uriSnippet) {
		vscode.window.showErrorMessage("Can't find snippet file");
		return false;
	}

	const parsed = await readSnippetFile(uriSnippet);
	if (!parsed) {
		return false;
	}

	const renamed = Object.fromEntries(
		Object.entries(parsed).map(([key, value]) =>
			key === snippetName ? [rename, value] : [key, value],
		),
	);

	await appContext.storage.writeFile({
		filename: uriSnippet.path.split('/').pop()!,
		content: renamed,
	});

	vscode.window.showInformationMessage(`Rename ${rename} successful!`);

	const listSnippets = await readAllSnippets();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);

	return true;
}

async function isExistPrefixOrSnippetName(
	key: string,
	storage?: StorageSnippetInterface,
	checkFor: 'both' | 'prefix' | 'snippetName' = 'both',
): Promise<boolean> {
	let snippets = storage?.dataSnippet;

	if (!snippets) {
		const workspace = appContext.workspace.getWorkspaceFolder();
		if (!workspace) {
			vscode.window.showErrorMessage("Can't detect name workspace");
			return true;
		}

		const uri = await getUriSnippetBasedWorkspace(workspace.workspaceName);
		if (!uri) {
			return false;
		}

		const converted = await convertRawToStorageSnippet(uri);
		if (!converted) {
			return false;
		}

		snippets = converted.dataSnippet;
		storage = converted;
	}

	if (checkFor === 'snippetName' || checkFor === 'both') {
		const duplicate = snippets.find((val) => val.snippetName === key);
		if (duplicate) {
			vscode.window.showErrorMessage(
				`Oops! "${key}" is already used as a snippet name from "${storage!.metadata.from_workspace}". Please choose another`,
			);
			return true;
		}
	}

	if (checkFor === 'prefix' || checkFor === 'both') {
		const duplicate = snippets.find((val) => val.body.prefix === key);
		if (duplicate) {
			vscode.window.showErrorMessage(
				`Oops! "${key}" is already used as a prefix for "${duplicate.snippetName}". Please choose another`,
			);
			return true;
		}
	}

	return false;
}

const SnippetUtils = {
	readAllSnippets,
	getAllGlobalStorageSnippetsUri,
	getUriSnippetBasedWorkspace,
	getUriSnippetBasedName,
	reloadSnippets,
	saveCompressedSnippets,
	loadCompressedSnippets,
	editSnippet,
	renameSnippetName,
	convertRawToStorageSnippet,
	isExistPrefixOrSnippetName,
};

export default SnippetUtils;
