import * as fs from 'fs-extra';
import { unlink } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import * as vscode from 'vscode';
import { AppConstant } from '../constants/common.constants';
import ProjectUtils from './project.utils';

interface editOptions {
	filePath: string;
	// Text yang akan ditambah di akhir file
	appendText?: string;
	// Text yang akan disisipkan di baris tertentu
	insertAt?: {
		text: string;
		line:
			| number
			| ((totalLines: number) => number)
			| { afterKeyword: string | string[]; last?: boolean };
	};
}

interface IsExistsFileResult {
	isExists: boolean;
	fullPath: string | null;
	uri: vscode.Uri | null;
}

interface createOptions {
	filename: string;
	data?: string;
}

interface createResult {
	filePath: string;
	filename: string;
	isExists: boolean;
}

type UpdateLineOptions = {
	filePath: string;
	keyword: string | string[];
	endKeyword?: string;
	newText: string;
};
/**
 * Ngecek file sudah ada atau belum
 * @param filename (relative path)
 */
async function isExistsFile(filename: string): Promise<IsExistsFileResult> {
	const projectUri = ProjectUtils.getUri();
	const fullPath = path.join(projectUri.fsPath, filename);

	try {
		await fs.access(fullPath);
		return { uri: vscode.Uri.file(fullPath), fullPath, isExists: true };
	} catch (err) {
		const isNotFound =
			err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT';

		if (isNotFound) {
			return { uri: vscode.Uri.file(fullPath), fullPath, isExists: false };
		}

		throw err;
	}
}

/**
 * @param filePath (relative path)
 * @param appendText Text yang akan ditambah di akhir file
 * @param options.insertAt.text - Text yang akan disisipkan
 * @param options.insertAt.line - disisipkan sesuai kondisi:
 * - `number` — langsung ke baris tertentu
 * - `(totalLines: number) => number` — ngereturn total line, jadi bisa dibuat patokan
 *   - `afterKeyword` — disisipkan setelah keyword tertentu
 *   - `last` — jika `true`, maka disisipkan setelah `afterKeyword` terakhir
 */
async function edit(
	options: editOptions,
): Promise<{ totalLines: number } | null> {
	const { filePath, appendText, insertAt } = options;

	const projectUri = ProjectUtils.getUri();
	const uri = vscode.Uri.joinPath(projectUri, filePath);

	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `${AppConstant.ExtensionName} : Editing file...`,
		},
		async (progress) => {
			progress.report({ increment: 0 });

			const doc = await vscode.workspace.openTextDocument(uri);
			const edit = new vscode.WorkspaceEdit();

			let totalLines = doc.lineCount;

			// Ini kalau append
			if (appendText) {
				const originalText = doc.getText();
				const fullRange = new vscode.Range(
					doc.positionAt(0),
					doc.positionAt(originalText.length),
				);

				edit.replace(uri, fullRange, `${originalText}${appendText}`);
			} else if (insertAt) {
				// Ini kalau insert

				// Hapus baris kosong terakhir
				const lastLine = doc.lineAt(totalLines - 1);
				if (lastLine.text.trim() === '' || lastLine.text.trim() === '\r') {
					edit.delete(
						uri,
						new vscode.Range(
							lastLine.range.start,
							lastLine.rangeIncludingLineBreak.end,
						),
					);
					totalLines -= 1;
				}

				let resolvedLine: number;
				let keywordLine: number | null = null;

				if (
					typeof insertAt.line === 'object' &&
					'afterKeyword' in insertAt.line
				) {
					const { afterKeyword, last = false } = insertAt.line;

					if (afterKeyword instanceof Array) {
						for (let i = 0; i < afterKeyword.length; i++) {
							const val = afterKeyword[i];

							const line = last
								? await FileUtils.findLastLine(uri, val)
								: await FileUtils.findLine(uri, val);

							if (line !== null) {
								keywordLine = line;
								break;
							}
						}
					} else {
						keywordLine = last
							? await FileUtils.findLastLine(uri, afterKeyword)
							: await FileUtils.findLine(uri, afterKeyword);
					}

					if (keywordLine === null) {
						const keywordLabel =
							afterKeyword instanceof Array
								? afterKeyword.join(' | ')
								: afterKeyword;
						throw new Error(`edit: keyword "${keywordLabel}" not found`);
					}

					resolvedLine = keywordLine + 1;
				} else if (typeof insertAt.line === 'function') {
					resolvedLine = insertAt.line(totalLines);
				} else {
					resolvedLine = insertAt.line;
				}

				const clampedLine = Math.min(Math.max(resolvedLine, 0), totalLines);
				edit.insert(
					uri,
					new vscode.Position(clampedLine, 0),
					`${insertAt.text}\n`,
				);
			} else {
				throw new Error('edit: no operation provided (appendText or insertAt)');
			}

			await vscode.workspace.applyEdit(edit);
			await doc.save();

			progress.report({ increment: 100, message: 'Done' });

			return { totalLines };
		},
	);
}

/**
 * @returns `string` hasil dari file itu
 */
async function read(uri: vscode.Uri) {
	// cek apakah file lagi kebuka di editor
	const openDoc = vscode.workspace.textDocuments.find(
		(doc) => doc.uri.fsPath === uri.fsPath,
	);

	if (openDoc) {
		// ambil langsung dari buffer editor
		return openDoc.getText();
	}

	return fs.readFile(uri.fsPath, 'utf8');
}

// Untuk CSP webview jadi setiap kali webview dibuka, dipakai sebagai token keamanan
// jadi ini cuma di inject di webview provider
function getCSP() {
	let text = '';
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}

/**
 * Cari baris dengan keyword tertentu
 * @param occurrenceIndex - `number` jadi dia akan ngereturn bari ke berapa dengan index yang dicari.
 * cth. jika `occurrenceIndex` = 1, maka dia akan ngereturn baris kemunculan keyword yang kedua,
 * jika yang ditemukan lebih sedikit dari yang diminta, maka dia akan ngereturn `null`
 */
async function findLine(
	uri: vscode.Uri,
	keyword: string,
	occurrenceIndex = 0,
): Promise<number | null> {
	const doc = await vscode.workspace.openTextDocument(uri);
	const lines = doc.getText().split('\n');

	// Cari semua line yang mengandung keyword
	const matchingLines: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
			matchingLines.push(i);
		}
	}

	// Kalau jumlah ditemukan lebih sedikit dari yang diminta, return null
	if (occurrenceIndex >= matchingLines.length) {
		return null;
	}

	return matchingLines[occurrenceIndex];
}

/**
 * @returns List baris yang mengandung keyword
 */
async function findLines(uri: vscode.Uri, keyword: string): Promise<string[]> {
	const doc = await vscode.workspace.openTextDocument(uri);
	const lines = doc.getText().split('\n');

	// Cari semua line yang mengandung keyword
	const matchingLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
			matchingLines.push(lines[i]);
		}
	}

	return matchingLines;
}

/**
 * Ini sama dengan `findLines` tapi ngereturn baris keyword terakhir
 */
async function findLastLine(
	uri: vscode.Uri,
	keyword: string,
): Promise<number | null> {
	const document = await vscode.workspace.openTextDocument(uri);

	let lastLine: number | null = null;

	for (let i = 0; i < document.lineCount; i++) {
		if (document.lineAt(i).text.includes(keyword)) {
			lastLine = i;
		}
	}

	return lastLine;
}

/**
 * Update baris sesuai baris keyword yang pertama ditemukan
 */
async function updateLine(options: UpdateLineOptions): Promise<void> {
	const { filePath, keyword, endKeyword, newText } = options;

	const projectUri = ProjectUtils.getUri();
	const uri = vscode.Uri.joinPath(projectUri, filePath);

	const doc = await vscode.workspace.openTextDocument(uri);
	const edit = new vscode.WorkspaceEdit();

	const lines = doc.getText().split('\n');
	const keywords = Array.isArray(keyword) ? keyword : [keyword];

	let startLine: number | null = null;

	for (const kw of keywords) {
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].toLowerCase().includes(kw.toLowerCase())) {
				startLine = i;
				break;
			}
		}
		if (startLine !== null) {
			break;
		}
	}

	if (startLine === null) {
		return;
	}

	let endLine = startLine;

	if (endKeyword) {
		for (let i = startLine + 1; i < lines.length; i++) {
			if (lines[i].toLowerCase().includes(endKeyword.toLowerCase())) {
				endLine = i;
				break;
			}
		}
	}

	const range = new vscode.Range(startLine, 0, endLine, lines[endLine].length);

	edit.replace(uri, range, newText);

	await vscode.workspace.applyEdit(edit);
	await doc.save();
}

async function deleteFile(target: string): Promise<void> {
	const projectUri = ProjectUtils.getUri();
	const targetPath = path.join(projectUri.fsPath, target);
	await fs.unlink(targetPath);
}

/**
 * @param pattern - `string` cth.`translations/*.json` maka dia akan menghapus semua file .json dalam folder translations
 */
async function deleteFiles(pattern: string): Promise<void> {
	const projectUri = ProjectUtils.getUri();
	const fullPattern = path.join(projectUri.fsPath, pattern).replace(/\\/g, '/');

	const files = await glob(fullPattern);

	for (const file of files) {
		await unlink(file);
	}
}

/**
 * @param filename (relative path)
 * @param data - Text yang ingin dimasukkan ke file
 * @returns `filePath` full path file, `filename` nama file, `isExists` apakah file sudah ada
 */
async function create(options: createOptions): Promise<createResult> {
	const { filename, data = '' } = options;

	const projectUri = ProjectUtils.getUri();
	const filePath = path.join(projectUri.fsPath, filename);
	const dirPath = path.dirname(filePath);

	await fs.mkdir(dirPath, { recursive: true });

	try {
		await fs.writeFile(filePath, data, { flag: 'wx' });
		return { filePath, filename, isExists: false };
	} catch (err) {
		// 'wx' flag throw EEXIST jika file sudah ada
		if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
			return { filePath, filename, isExists: true };
		}
		throw err;
	}
}

/**
 * @param folderPath (relative path folder)
 * @returns List nama filenya yang berada dalam `folderPath`
 */
async function getFiles(folderPath: string): Promise<string[]> {
	const projectUri = ProjectUtils.getUri();
	const dirPath = path.join(projectUri.fsPath, folderPath);
	return fs.readdir(dirPath);
}

/**
 * @param filename (relative path)
 * @returns `vscode.Uri | null` dari file yang dicari
 */
async function find(filename: string): Promise<vscode.Uri | null> {
	const projectUri = ProjectUtils.getUri();
	const dirPath = path.join(projectUri.fsPath, filename);

	const { isExists } = await isExistsFile(filename);

	if (!isExists) {
		return null;
	}

	return vscode.Uri.file(dirPath);
}

const FileUtils = {
	isExists: isExistsFile,
	getCSP,
	findLine,
	updateLine,
	delete: deleteFile,
	deleteFiles,
	create,
	findLastLine,
	getFiles,
	edit,
	find,
	read,
	findLines,
};

export default FileUtils;
