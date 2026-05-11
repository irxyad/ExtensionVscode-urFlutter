import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
import FileUtils from './file.utils';
import { logger } from './logger.utils';

interface InsertIntoMainOptions {
	// Nama command
	label: string;
	// Text yang akan diinsert
	insertText: string;
	// Keyword yang jika ditemukan, insert setelehanya
	afterKeyword: string | string[];
	// Jika afterKeyword tidak ditemukan, insert ini dulu sebelum insertText
	prependText?: string;
	// Instructions yang akan ditampilkan jika main.dart tidak ditemukan
	instructions?: string[];
	// Jika detectKeyword diset dan ditemukan di main.dart,
	// maka proses insert akan dibatalkan
	detectKeyword?: string;
}

interface FindMainFileResult {
	uri: vscode.Uri;
	relativePath: string;
}

interface FindMainLineResult {
	line: number;
	keyword: string;
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
async function findMainFile(
	label: string,
	instructions?: string[],
): Promise<FindMainFileResult | null> {
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

	return {
		uri: target,
		relativePath: vscode.workspace.asRelativePath(target),
	};
}
const KeywordMainLines = ['void main(', 'Future<void> main(', 'Future main('];
// Untuk cari void main line buat patokan line untuk inject
async function findMainLine(
	uri: vscode.Uri,
): Promise<FindMainLineResult | null> {
	for (const keyword of KeywordMainLines) {
		const line = await FileUtils.findLine(uri, keyword);
		if (line !== null) {
			return {
				line,
				keyword,
			};
		}
	}
	return null;
}

// Untuk inject text ke void main()
async function insertIntoMain(options: InsertIntoMainOptions): Promise<void> {
	const { insertText, afterKeyword, prependText } = options;

	const mainFile = await findMainFile(options.label, options.instructions);
	if (!mainFile) {
		throw new Error('Cannot find main file');
	}

	// Ini untuk mencari baris void main
	const lineMain = await findMainLine(mainFile.uri);
	if (lineMain === null) {
		throw new Error('Cannot find main() — add the code manually');
	}

	// Keyword sudah ada, skip insert
	if (options.detectKeyword) {
		const detected = await FileUtils.findLine(
			mainFile.uri,
			options.detectKeyword,
		);
		if (detected !== null) {
			return;
		}
	}

	// Kita format dulu file main.dart dan beri delay 5s kemudian run dibawahnya
	await dartFormat(mainFile.relativePath, 5_000);

	const hasAwaitAtInsertText = insertText.includes('await ');

	if (hasAwaitAtInsertText) {
		const isOnlyVoidMain = lineMain.keyword === KeywordMainLines[0]; // 0 karena index 0 itu keyword void main
		if (isOnlyVoidMain) {
			await FileUtils.updateLine(
				mainFile.uri,
				lineMain.keyword,
				'Future<void> main() async {',
			);
		}
	}

	const prependLine =
		prependText !== undefined
			? await FileUtils.findLine(mainFile.uri, prependText)
			: null;

	const hasPrepend = prependLine !== null;

	// Untuk mengecek apakah keyword yang dicari memiliki kata di baris void main
	const matchKeyword = afterKeyword.includes(lineMain.keyword);

	// Jika matchKeyword = true, kita sisipikan tepat di bawah line void main
	// kalau gk berarti kita sisipkan setelah baris afterKeyword
	const line = matchKeyword
		? lineMain.line + 1
		: {
				afterKeyword: afterKeyword,
			};

	// Jika hasPrepend = true, berarti kita skip prepend text karena sudah ada di file main
	await FileUtils.edit({
		filePath: mainFile.relativePath,
		insertAt: {
			text:
				hasPrepend || !prependText
					? `\n${insertText}`
					: `\n${prependText}\n\n${insertText}`,
			line: line,
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
		const exists = await FileUtils.findLine(uri, imp);

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
		filePath: vscode.workspace.asRelativePath(uri),
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
	const mainFile = await findMainFile(label, imports);

	if (!mainFile) {
		return;
	}

	await insertImports({
		uri: mainFile.uri,
		imports: imports,
	});
}

async function dartFormat(path?: string, delayAfter?: number): Promise<void> {
	const terminal = new TerminalService('Dart Format');

	try {
		// kalau gk ada path, maka format semua file
		await terminal.executeAsync(`dart format ${path ?? '.'}`);
		await new Promise((resolve) => setTimeout(resolve, delayAfter ?? 2_000)); // 2 detik
	} finally {
		terminal.dispose();
	}
}

const FlutterUtils = {
	getProjectName,
	insertIntoMain,
	insertImports,
	findMainFile,
	insertImportsIntoMain,
	dartFormat,
};

export default FlutterUtils;
