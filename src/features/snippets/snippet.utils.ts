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
import { appContext } from '../../common/app-context';
import { SnippetAction, SnippetConstant } from './snippet.constants';

/**
 * @returns seluruh filename storage snippet
 */
async function getFilenameStorages(): Promise<string[]> {
	const dir = await appContext.storage.readDir();

	return dir
		.filter(([file]) => file.endsWith(SnippetConstant.SuffixStorage))
		.map(([filename]) => filename);
}

/**
 * @returns Uri storage snippet berdasarkan filename storage
 */
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

/**
 * @returns isi dari file storage
 */
async function readJsonFile(
	filename: string,
): Promise<Record<string, unknown> | null> {
	return appContext.storage.readFile<Record<string, unknown>>(filename);
}

/**
 * @returns [StorageSnippetInterface] dari raw file
 */
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

/**
 * @returns Daftar storage
 */
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

/**
 * @returns storage tertentu berdsarkan nama storage nya
 */
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

/**
 * Dipakai jika ada snippet yang diubah
 * @param opt
 */
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

/**
 * Load storage yang kemudian akan dikirimkan ke webview
 */
async function loadStorages(webview: WebviewView): Promise<void> {
	const storages = await readStorages();

	webview.webview.postMessage({
		action: SnippetAction.LoadStorage,
		storages,
	});
}

/**
 * Untuk mengecek apakah ada snippet dengan prefix atau name tertentu yang sudah ada
 */
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

/**
 * @returns Nama file storage berdasarkan workspace dan combine dengan SuffixStorage
 */
function convertToStorageName(workspaceName: string): string {
	return `${workspaceName}${SnippetConstant.SuffixStorage}`;
}

const SnippetUtils = {
	readStorage,
	readStorages,
	loadStorages,
	updateStorage,
	checkPrefixOrName,
	getUriByWsName,
	convertToStorageName,
};

export default SnippetUtils;
