import * as vscode from 'vscode';
import FileUtils from './file.utils';
import { logger } from './logger.utils';

interface InsertIntoMainOptions {
	// Nama command
	label: string;
	// Text yang akan diinsert
	insertText: string;
	// Keyword yang jika ditemukan, insert setelehanya
	afterKeyword?: string;
	// Jika afterKeyword tidak ditemukan, insert ini dulu sebelum insertText
	prependText?: string;
	// Instructions yang akan ditampilkan jika main.dart tidak ditemukan
	instructions?: string[];
	// Jika detectKeyword diset dan ditemukan di main.dart,
	// maka proses insert akan dibatalkan
	detectKeyword?: string;
}

/**
 * @returns Nama project flutter yang didapat dari pubspec.yaml
 */
async function getProjectName(): Promise<string> {
	const pubspec = await FileUtils.find('pubspec.yaml');

	if (!pubspec) {
		throw new Error("Can't find pubspec.yaml");
	}

	const linesWithName = await FileUtils.findLines(pubspec, 'name');

	if (!linesWithName?.length) {
		throw new Error("No 'name' field found in pubspec.yaml");
	}

	const nameLine = linesWithName.find((line) => /^name\s*:/.test(line.trim()));
	const rawName = nameLine?.split(':')[1]?.trim();

	if (!rawName) {
		throw new Error('Invalid name format in pubspec.yaml');
	}

	// Capitalize setiap kata, snake_case → Title Case
	return rawName
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * @returns Uri main file baik dari `lib/main.dart` atau `lib/init_main.dart`
 */
async function findUriMainFile(
	label: string,
	instructions?: string[],
): Promise<vscode.Uri | null> {
	const [initMainFile, mainFile] = await Promise.all([
		FileUtils.find('lib/init_main.dart'),
		FileUtils.find('lib/main.dart'),
	]);

	const target = initMainFile ?? mainFile;

	const instructionsText = [
		`${label} failed.`,
		'',
		'Cannot find entry file:',
		'  - lib/main.dart',
		'  - lib/init_main.dart',
		'',
		'Add these manually into your main.dart or init_main.dart:',
		'',
	];

	if (!target) {
		const action = await vscode.window.showErrorMessage(
			'Main.dart or init_main.dart not found',
			instructions ? 'Show Instructions' : 'OK',
		);
		if (action === 'Show Instructions') {
			logger.instruction(label, [...instructionsText, ...(instructions ?? [])]);
		}

		return null;
	}

	return target;
}

// Untuk cari void main line buat patokan line untuk inject
async function findMainLine(uri: vscode.Uri): Promise<number | null> {
	return (
		(await FileUtils.findLine(uri, 'void main(')) ??
		(await FileUtils.findLine(uri, 'Future<void> main(')) ??
		(await FileUtils.findLine(uri, 'Future main('))
	);
}

// Untuk inject text ke void main()
async function insertIntoMain(options: InsertIntoMainOptions): Promise<void> {
	const { insertText, afterKeyword, prependText } = options;

	const mainUri = await findUriMainFile(options.label, options.instructions);

	if (!mainUri) {
		throw new Error('Cannot find main file');
	}

	const lineMain = await findMainLine(mainUri);

	if (lineMain === null) {
		throw new Error('Cannot find main() — add the code manually');
	}

	if (options.detectKeyword) {
		const detected = await FileUtils.findLines(mainUri, options.detectKeyword);

		// Keyword sudah ada, skip insert
		if (detected !== null) {
			return;
		}
	}

	if (afterKeyword) {
		await FileUtils.edit({
			filePath: mainUri.fsPath,
			insertAt: {
				text: insertText,
				line: { afterKeyword },
			},
		});
		return;
	}

	// Insert prependText dulu (kalau ada), baru insertText
	const finalText = prependText
		? `\n${prependText}\n\n${insertText}`
		: `\n${insertText}`;

	await FileUtils.edit({
		filePath: mainUri.fsPath,
		insertAt: {
			text: finalText,
			line: lineMain + 1,
		},
	});
}

interface InsertImportOptions {
	uri: vscode.Uri;
	imports: string[];
}

// private helper buat inject imports
async function insertImports(options: InsertImportOptions): Promise<void> {
	const { uri, imports } = options;

	// Biar gk duplikat, cek imports dulu
	const missingImports: string[] = [];
	for (const imp of imports) {
		const exists = await FileUtils.findLines(uri, imp);
		if (exists === null) {
			missingImports.push(imp);
		}
	}

	if (!missingImports.length) {
		return;
	}

	// Inject imports baru ke line terakhir imports
	const lastImportLine = (await FileUtils.findLine(uri, "import '")) ?? 0;

	await FileUtils.edit({
		filePath: uri.fsPath,
		insertAt: {
			text: missingImports.join('\n'),
			line: lastImportLine + 1,
		},
	});
}

/**
 * Insert imports ke main.dart
 */
async function insertImportsIntoMain(
	label: string,
	{ imports }: { imports: string[] },
): Promise<void> {
	const mainUri = await findUriMainFile(label, imports);

	if (!mainUri) {
		return;
	}

	await insertImports({
		uri: mainUri,
		imports: imports,
	});
}

const FlutterUtils = {
	getProjectName,
	insertIntoMain,
	insertImports,
	findUriMainFile,
	insertImportsIntoMain,
};

export default FlutterUtils;
