import { AppError } from '@common/error/app.error';
import {
  CheckPrefixOrNameOption,
  MetadataStorageSnippet,
  SnippetInterface,
  StorageSnippetInterface,
  UpdateStorageOption,
} from '@features/snippets/types/snippet.types';
import type { WebviewView } from 'vscode';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import { appContext } from '../../common/app-context';
import { SnippetAction, SnippetConstant } from './snippet.constants';

async function getFilenameStorages(): Promise<string[]> {
	const dir = await appContext.storage.readDir();

	return dir
		.filter(([file]) => file.endsWith(SnippetConstant.SuffixStorage))
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

/**
 * Untuk mendapatkan uri snippet dari workspace name
 */
async function getUriByWsName(
	workspaceName: string,
): Promise<vscode.Uri | null> {
	return getUriByFilename(`${workspaceName}${SnippetConstant.SuffixStorage}`);
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
		name: metadata.from_workspace ?? 'Unknown',
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
	storageName: string,
): Promise<StorageSnippetInterface | null> {
	const storageFiles = await getFilenameStorages();

	for (const storageFile of storageFiles) {
		const name = storageFile.replace(SnippetConstant.SuffixStorage, '');
		if (name !== storageName) {
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

async function updateStorage(opt: UpdateStorageOption): Promise<void> {
	const { snippetName, storageName, snippet } = opt;

	const storage = await readStorage(storageName);

	if (!storage) {
		throw new AppError(`Can't find group snippet: ${storageName}`);
	}

	const index = storage.snippets.findIndex((val) => val.name === snippetName);

	if (index === -1) {
		throw new AppError(`Snippet "${snippetName}" not found`);
	}

	storage.snippets[index] = snippet;

	const filename = convertToStorageName(storageName);

	await appContext.storage.writeFile({
		filename: filename,
		content: storage,
		overWrite: true,
	});
}

async function save(data: object): Promise<void> {
	const compressed = zlib.gzipSync(JSON.stringify(data)).toString('base64');
	await appContext.state.update(SnippetConstant.KeySync, compressed);
}

async function load(): Promise<object | null> {
	const compressed = appContext.state.get<string>(SnippetConstant.KeySync);

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
		action: SnippetAction.LoadStorage,
		storages,
	});
}

async function checkPrefixOrName(
	opt: CheckPrefixOrNameOption,
): Promise<SnippetInterface | undefined> {
	const { key, snippetName, storageName, checkFor = 'both' } = opt;

	const storage = await readStorage(storageName);

	if (!storage) {
		return undefined;
	}

	// Skip snippet yang sama
	const snippets = storage.snippets.filter((val) => val.name !== snippetName);

	if (checkFor === 'snippetName') {
		return snippets.find((val) => val.name === key);
	}

	if (checkFor === 'prefix') {
		return snippets.find((val) => val.prefix === key);
	}

	// both
	return snippets.find((val) => val.name === key || val.prefix === key);
}

function convertToStorageName(workspaceName: string): string {
	return `${workspaceName}${SnippetConstant.SuffixStorage}`;
}

const SnippetUtils = {
	save,
	load,
	readStorage,
	readStorages,
	loadStorages,
	updateStorage,
	checkPrefixOrName,
	getUriByWsName,
	convertToStorageName,
};

export default SnippetUtils;
