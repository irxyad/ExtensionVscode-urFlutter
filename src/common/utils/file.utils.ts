import * as fs from 'fs-extra';
import { unlink } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import * as vscode from 'vscode';
import { appContext } from '../app-context';
import { AppConstant } from '../constants/common.constants';
import { logger } from './logger.utils';

function getProjectPath() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('Tidak ada folder terbuka!');
		return;
	}

	const projectPath = vscode.Uri.joinPath(workspaceFolders[0].uri);

	return projectPath.fsPath;
}

async function fileExists(
	uri: vscode.Uri,
	filename?: string,
): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(uri);
		return true;
	} catch (err) {
		if (err instanceof vscode.FileSystemError) {
			vscode.window.showErrorMessage(
				`File ${filename} tidak ditemukan`,
				err.message,
			);
		}
		return false;
	}
}

async function copyTemplate({
	destFolder,
	sourceFolder,
}: {
	destFolder: string;
	sourceFolder: string;
}) {
	const projectPath = getProjectPath();

	if (projectPath) {
		const targetPath = path.join(projectPath, destFolder);
		const sourcePath = appContext.context.asAbsolutePath(sourceFolder);

		try {
			const exists = await fs.pathExists(targetPath);
			if (exists) {
				const stat = await fs.stat(targetPath);
				if (stat.isFile()) {
					await fs.remove(targetPath);
				}
			}

			await fs.copy(sourcePath, targetPath, { overwrite: true });
		} catch (err: any) {
			vscode.window.showErrorMessage('Failed copy data: ' + err.message);
		}
	}
}

async function insertText(
	uri: vscode.Uri,
	{
		addText,
	}: {
		addText: string;
	},
) {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `${AppConstant.ExtensionName} : Mengedit file...`,
		},
		async (progress) => {
			progress.report({ increment: 0 });

			const doc = await vscode.workspace.openTextDocument(uri);
			const originalText = doc.getText();

			const finalText = `${originalText}${addText}`;

			const edit = new vscode.WorkspaceEdit();
			const fullRange = new vscode.Range(
				doc.positionAt(0),
				doc.positionAt(originalText.length),
			);

			edit.replace(uri, fullRange, finalText);

			await vscode.workspace.applyEdit(edit);

			await doc.save();

			progress.report({ increment: 100, message: 'Selesai' });
		},
	);
}
async function insertTextAtLine(
	uri: vscode.Uri,
	{
		addText,
		line,
	}: {
		addText: string;
		line: number | ((totalLines: number) => number);
	},
): Promise<{ totalLines: number }> {
	return await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: `${AppConstant.ExtensionName} : Menyisipkan teks...`,
		},
		async (progress) => {
			progress.report({ increment: 0 });

			const doc = await vscode.workspace.openTextDocument(uri);
			const edit = new vscode.WorkspaceEdit();

			let totalLines = doc.lineCount;

			const lastLine = doc.lineAt(totalLines - 1);
			if (lastLine.text.trim() === '' || lastLine.text.trim() === '\r') {
				// Hapus baris terakhir
				const range = new vscode.Range(
					lastLine.range.start,
					lastLine.rangeIncludingLineBreak.end,
				);
				edit.delete(uri, range);
				totalLines -= 1;
			}

			const resolvedLine = typeof line === 'function' ? line(totalLines) : line;
			const clampedLine = Math.min(Math.max(resolvedLine, 0), totalLines);

			const position = new vscode.Position(clampedLine, 0);
			edit.insert(uri, position, `${addText}\n`);

			await vscode.workspace.applyEdit(edit);
			await doc.save();

			progress.report({ increment: 100, message: 'Teks berhasil disisipkan' });

			return { totalLines };
		},
	);
}

async function getText(uri: vscode.Uri) {
	try {
		// cek apakah file lagi kebuka di editor
		const openDoc = vscode.workspace.textDocuments.find(
			(doc) => doc.uri.fsPath === uri.fsPath,
		);

		if (openDoc) {
			// ambil langsung dari buffer editor
			return openDoc.getText();
		}

		const raw = await fs.readFile(uri.fsPath, 'utf8');
		return raw;
	} catch (err) {
		// file belum ada atau gagal dibaca
		return '';
	}
}

function getNonce() {
	let text = '';
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
async function findLinesWithKeyword(
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

async function findLastLineWithKeyword(
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

async function readLinesWithKeyword(
	uri: vscode.Uri,
	keyword: string,
): Promise<string[]> {
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

async function updateLineWithKeyword(
	uri: vscode.Uri,
	keyword: string,
	newText: string,
): Promise<void> {
	const doc = await vscode.workspace.openTextDocument(uri);
	const edit = new vscode.WorkspaceEdit();

	const lines = doc.getText().split('\n');

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
			const range = new vscode.Range(i, 0, i, lines[i].length);
			edit.replace(uri, range, newText);
			break;
		}
	}

	await vscode.workspace.applyEdit(edit);
	await doc.save();
}

async function deleteFile(target: string) {
	try {
		const projectPath = getProjectPath();

		if (projectPath) {
			const targetPath = path.join(projectPath, target);

			await unlink(targetPath);
			vscode.window.showInformationMessage(
				`File ${path} deleted successfully!`,
			);
		}
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to delete ${path}:`);
		logger.error(`Failed to delete ${path}:`, err);
	}
}

async function deleteFiles(pattern: string) {
	try {
		const projectPath = getProjectPath();
		if (projectPath) {
			const fullPattern = path.join(projectPath, pattern).replace(/\\/g, '/'); // force slash kanan

			const files = await glob(fullPattern);

			if (files.length === 0) {
				return;
			}

			for (const file of files) {
				try {
					await unlink(file);
				} catch (e) {
					logger.error(`Failed to delete ${file}:`, e);
				}
			}
		}
	} catch (err) {
		logger.error('Error finding files:', err);
	}
}

async function createFile(filename: string, msgExist?: string) {
	try {
		const projectPath = getProjectPath();

		if (!projectPath) {
			vscode.window.showErrorMessage("Can't detect project path");
			return;
		}

		const filePath = projectPath + '/' + filename;

		await fs.mkdir(filePath.substring(0, filePath.lastIndexOf('/')), {
			recursive: true,
		});

		await fs
			.writeFile(filePath, '{}', { flag: 'wx' }) // 'wx' biar ga overwrite kalau sudah ada
			.catch(() => {
				vscode.window.showWarningMessage(
					msgExist ?? `File already exists: ${filePath}`,
				);
			});

		logger.log('Created file:', filePath);
	} catch (err) {
		logger.error('Error creating file:', err);
	}
}

const FileUtils = {
	fileExists,
	copyTemplate,
	getProjectPath,
	insertText,
	getText,
	insertTextAtLine,
	getNonce,
	findLinesWithKeyword,
	readLinesWithKeyword,
	updateLineWithKeyword,
	deleteFile,
	deleteFiles,
	createFile,
	findLastLineWithKeyword,
};

export default FileUtils;
