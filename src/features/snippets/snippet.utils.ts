import { AppError } from '@common/error/app.error';
import ProjectUtils from '@common/utils/project.utils';
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
import { SnippetAction, SnippetConstant } from './snippet.constants';

async function getFilenameStorages(): Promise<string[]> {
	const dir = await appContext.storage.readDir();

	return dir
		.filter(([file]) => file.endsWith(SnippetConstant.SuffixGroupSnippet))
		.map(([filename]) => filename);
}

async function getUriByFilename(filename: string): Promise<vscode.Uri | null> {
	const dir = await appContext.storage.readDir();
	const storageUri = appContext.storage.uri;

	for (const [file] of dir) {
		if (file === filename) {
			return vscode.Uri.joinPath(storageUri, file);
		}
	}

	return null;
}

async function getUriByWorkspace(
	workspaceName: string,
): Promise<vscode.Uri | null> {
	return getUriByFilename(
		`${workspaceName}-${SnippetConstant.SuffixGroupSnippet}`,
	);
}

async function readJsonFile(
	filename: string,
): Promise<Record<string, unknown> | null> {
	return appContext.storage.readFile<Record<string, unknown>>(filename);
}

function parseToStorageSnippet(
	parsed: Record<string, unknown>,
): StorageSnippetInterface | null {
	const metadata = parsed.metadata as MetadataStorageSnippet | undefined;
	const snippets = parsed.snippets as SnippetInterface[] | undefined;

	if (!metadata || !snippets) {
		return null;
	}

	return {
		metadata,
		name: ProjectUtils.formatToTitle(metadata.from_workspace ?? 'Unknown'),
		snippets,
	};
}

async function readStorages(): Promise<StorageSnippetInterface[]> {
	const storageFiles = await getFilenameStorages();
	const results: StorageSnippetInterface[] = [];

	for (const storageFile of storageFiles) {
		const parsed = await readJsonFile(storageFile);
		if (!parsed) {
			continue;
		}

		const storage = parseToStorageSnippet(parsed);
		if (storage) {
			results.push(storage);
		}
	}

	return results;
}

async function readStorage(
	uri: vscode.Uri,
): Promise<StorageSnippetInterface | null> {
	const workspaceName = vscode.workspace.getWorkspaceFolder(uri)?.name;

	if (!workspaceName) {
		throw new AppError("Can't detect name workspace");
	}

	const storageFiles = await getFilenameStorages();

	for (const storageFile of storageFiles) {
		const storageName = storageFile.split('-')[0];
		if (storageName !== workspaceName) {
			continue;
		}

		const parsed = await readJsonFile(storageFile);
		if (!parsed) {
			continue;
		}

		const result = parseToStorageSnippet(parsed);
		if (result) {
			return result;
		}
	}

	return null;
}

async function updateStorage(
	workspaceName: string,
	snippetName: string,
	body: SnippetInterface,
): Promise<void> {
	const uri = await getUriByWorkspace(workspaceName);

	if (!uri) {
		throw new AppError(`Can't find workspace`);
	}

	const storage = await readStorage(uri);

	if (!storage) {
		throw new AppError("Can't find storage snippet");
	}

	const index = storage.snippets.findIndex((val) => val.name === snippetName);

	if (index === -1) {
		throw new AppError(`Snippet "${snippetName}" not found`);
	}

	storage.snippets[index] = body;

	await appContext.storage.writeFile({
		filename: uri.path.split('/').pop() as string,
		content: storage,
	});
}

async function save(data: object): Promise<void> {
	const compressed = zlib.gzipSync(JSON.stringify(data)).toString('base64');
	await appContext.state.update(SnippetConstant.KeySyncSnippet, compressed);
}

async function load(): Promise<object | null> {
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

async function loadStorages(webview: WebviewView): Promise<void> {
	const storages = await readStorages();

	webview.webview.postMessage({
		action: SnippetAction.LoadStorageSnippets,
		storages,
	});
}

async function checkPrefixOrName(
	key: string,
	checkFor: 'both' | 'prefix' | 'snippetName' = 'both',
): Promise<SnippetInterface | undefined> {
	const ws = appContext.workspace.getWorkspaceFolder();

	if (!ws) {
		throw new AppError("Can't detect name workspace");
	}

	const storage = await readStorage(ws.workspaceUri);

	if (!storage) {
		return undefined;
	}

	if (checkFor === 'snippetName') {
		return storage.snippets.find((val) => val.name === key);
	}

	if (checkFor === 'prefix') {
		return storage.snippets.find((val) => val.prefix === key);
	}

	// both
	return storage.snippets.find((val) => val.name === key || val.prefix === key);
}

async function edit({
	storage,
	snippetName,
}: {
	storage: StorageSnippetInterface;
	snippetName: string;
}): Promise<void> {
	const snippet = storage.snippets.find((val) => val.name === snippetName);

	if (!snippet) {
		throw new AppError("Can't open, snippet not found");
	}

	const fileName = [
		AppConstant.ExtensionName,
		new Date().toISOString().replaceAll(':', '-'),
		storage.metadata.from_workspace,
		`${snippetName}.dart`,
	].join('-');

	const txt =
		`${SnippetConstant.TitlePrefix}${snippet.prefix}\n\n\t${snippet.body}`.replaceAll(
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
				saveEditing({
					newSnippet: event.document.getText(),
					snippetName,
					storage,
					body: snippet,
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

	const existing = await checkPrefixOrName(prefix, 'prefix');

	if (existing) {
		throw new AppError(
			`Oops! "${prefix}" is already used as a prefix for "${existing.name}". Please choose another`,
		);
	}

	await updateStorage(storage.metadata.from_workspace ?? '', snippetName, {
		...body,
		prefix,
		body: lines.filter((val) => !val.includes('@prefix')),
	});

	const listSnippets = await readStorages();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

async function rename({
	storage,
	snippetName,
	rename,
}: {
	storage: StorageSnippetInterface;
	snippetName: string;
	rename: string;
}): Promise<void> {
	if (!rename) {
		throw new AppError('Snippet name cannot be empty');
	}

	if (!ValidationUtils.snippetName(rename)) {
		throw new AppError('Invalid snippet name');
	}

	const isDuplicate = await checkPrefixOrName(rename, 'snippetName');

	if (isDuplicate) {
		throw new AppError(
			`Oops! "${rename}" is already used as a snippet name. Please choose another`,
		);
	}

	const uri = await getUriByWorkspace(storage.metadata.from_workspace ?? '');

	if (!uri) {
		throw new AppError("Can't find snippet file");
	}

	const index = storage.snippets.findIndex((val) => val.name === snippetName);

	if (index === -1) {
		throw new AppError("Can't find snippet to rename");
	}

	storage.snippets[index] = { ...storage.snippets[index], name: rename };

	await appContext.storage.writeFile({
		filename: uri.path.split('/').pop()!,
		content: storage,
	});

	const listSnippets = await readStorages();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

const SnippetUtils = {
	edit,
	save,
	load,
	readStorage,
	readStorages,
	loadStorages,
	updateStorage,
	checkPrefixOrName,
	rename,
};

export default SnippetUtils;
