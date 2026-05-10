import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
import FileUtils from './file.utils';

async function getPubspecDocument(): Promise<{
	doc: vscode.TextDocument;
	pubspecUri: vscode.Uri;
} | null> {
	const fileResult = await FileUtils.isExists('pubspec.yaml');

	if (!fileResult.isExists) {
		throw Error('File pubspec.yaml not found.');
	}

	const doc = await vscode.workspace.openTextDocument(fileResult.uri!);
	return { doc, pubspecUri: doc.uri };
}

async function applyPubspecEdit(newText: string): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	const result = await getPubspecDocument();

	if (!result) {
		return;
	}

	const { doc, pubspecUri } = result;

	const fullRange = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length),
	);

	edit.replace(pubspecUri, fullRange, newText);

	await vscode.workspace.applyEdit(edit);
	await doc.save();
}

async function addAssets(assets: string[]): Promise<void> {
	const result = await getPubspecDocument();
	if (!result) {
		return;
	}

	const { doc } = result;
	const originalText = doc.getText();

	const cleanedText = originalText
		.replace(/#.*/g, '')
		.replace(/^\s*[\r\n]/gm, '\n')
		.trim();

	const missingAssets = assets.filter((val) => !cleanedText.includes(val));
	if (!missingAssets.length) {
		return;
	}

	const lines = cleanedText.split('\n');

	// Cari index flutter: section
	const flutterLineIndex = lines.findIndex((l) => l.match(/^flutter:\s*$/));

	if (flutterLineIndex === -1) {
		// Kalau gk ada flutter: section maka buat di akhir
		const assetsSection = [
			'flutter:',
			'  assets:',
			...missingAssets.map((a) => `    - ${a}`),
		].join('\n');

		const finalText = `${cleanedText}\n\n${assetsSection}`;
		await applyPubspecEdit(finalText);
		return;
	}

	// Cari assets: di bawah flutter: section
	const assetsLineIndex = lines.findIndex(
		(l, i) => i > flutterLineIndex && l.match(/^\s{2}assets:\s*$/),
	);

	if (assetsLineIndex !== -1) {
		// Kalau sudah ada assets maka tambahkan di bawahnya
		lines.splice(
			assetsLineIndex + 1,
			0,
			...missingAssets.map((a) => `    - ${a}`),
		);
	} else {
		// Kalau belum ada assets: di dalam flutter: maka tambahkan setelah flutter:
		lines.splice(
			flutterLineIndex + 1,
			0,
			'  assets:',
			...missingAssets.map((a) => `    - ${a}`),
		);
	}

	await applyPubspecEdit(lines.join('\n'));
}

async function installPackages(terminal: TerminalService, packages: string[]) {
	return terminal.executeAsync(`flutter pub add ${packages.join(' ')}`);
}

async function installDevPackages(
	terminal: TerminalService,
	devPackages: string[],
) {
	return terminal.executeAsync(`flutter pub add -d ${devPackages.join(' ')}`);
}

const PUBSPEC_SECTION_KEYWORDS = [
	'environment:',
	'dependencies:',
	'dev_dependencies:',
	'flutter:',
];

async function format(): Promise<void> {
	const pubspecDoc = await getPubspecDocument();
	if (!pubspecDoc) {
		return;
	}

	const { doc } = pubspecDoc;
	const originalText = doc.getText();

	const lines = originalText.split('\n');
	const result: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		const isSectionKeyword = PUBSPEC_SECTION_KEYWORDS.some(
			(keyword) => trimmed === keyword,
		);

		const prevIsEmpty = result.length === 0 || result[result.length - 1] === '';

		if (isSectionKeyword && !prevIsEmpty) {
			result.push('');
		}

		result.push(line);
	}

	await applyPubspecEdit(result.join('\n'));
}

const PubspecUtils = {
	addAssets,
	installPackages,
	installDevPackages,
	format,
};

export default PubspecUtils;
