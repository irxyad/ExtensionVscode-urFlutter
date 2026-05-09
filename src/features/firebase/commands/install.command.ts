import FileUtils from '@common/utils/file.utils';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';

export const installFirebase = async () => {
	const workspace = vscode.workspace.workspaceFolders?.[0];

	if (!workspace) {
		vscode.window.showErrorMessage('No workspace found');
		return;
	}

	const hasFirebaseOptions = await vscode.workspace.findFiles(
		'lib/firebase_options.dart',
	);

	if (hasFirebaseOptions.length !== 0) {
		const action = await vscode.window.showErrorMessage(
			'Cancelled: Firebase already installed',
			'Reinstall',
		);

		if (action !== 'Reinstall') {
			return;
		}
	}

	const terminal = new TerminalService('Firebase Install');
	await startInstalling(terminal);
};

async function startInstalling(terminal: TerminalService) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Install Firebase',
			cancellable: true,
		},
		async (progress, token) => {
			token.onCancellationRequested(() => {
				terminal.dispose();
				vscode.window.showWarningMessage('Firebase installation cancelled.');
			});

			try {
				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ message: 'Adding firebase_core... (1/4)' });
				await terminal.executeAsync('flutter pub add firebase_core');

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ message: 'Installing FlutterFire CLI... (2/4)' });
				await terminal.executeAsync('dart pub global activate flutterfire_cli');

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ message: 'Running flutterfire configure... (3/4)' });
				terminal.execute('flutterfire configure');

				// Tunggu firebase_options.dart beneran terbuat via watcher
				await waitForFirebaseOptions(token);

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ message: 'Injecting Firebase init... (4/4)' });
				await handleFirebaseSetup();

				vscode.window.showInformationMessage(
					'Firebase installed & configured!',
				);
			} catch (err) {
				if (!token.isCancellationRequested) {
					vscode.window.showErrorMessage(`Firebase setup failed: ${err}`);
				}
			} finally {
				terminal.dispose();
			}
		},
	);
}

function waitForFirebaseOptions(
	token: vscode.CancellationToken,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const watcher = vscode.workspace.createFileSystemWatcher(
			'**/firebase_options.dart',
			false,
			true,
			true,
		);

		const cleanup = (fn: () => void) => {
			clearTimeout(timeoutId);
			cancelListener.dispose();
			watcher.dispose();
			fn();
		};

		const timeoutId = setTimeout(() => {
			cleanup(() =>
				reject(new Error('Timeout: firebase_options.dart not created')),
			);
		}, 120_000); // 2 menit

		const cancelListener = token.onCancellationRequested(() => {
			cleanup(() => resolve());
		});

		watcher.onDidCreate(() => cleanup(() => resolve()));
	});
}

async function handleFirebaseSetup() {
	const [initMainFiles, mainFiles] = await Promise.all([
		vscode.workspace.findFiles('lib/init_main.dart'),
		vscode.workspace.findFiles('lib/main.dart'),
	]);

	const target = initMainFiles[0] ?? mainFiles[0];

	if (!target) {
		const action = await vscode.window.showErrorMessage(
			'Firebase setup failed: main.dart not found',
			'Show Fix',
		);
		if (action === 'Show Fix') {
			showFirebaseErrorOutput();
		}
		throw new Error('Entry file not found');
	}

	await insertFirebaseInitAppIntoMainFile(target);
}

function showFirebaseErrorOutput() {
	const output = vscode.window.createOutputChannel('Firebase Setup');
	output.clear();
	output.appendLine('Firebase setup failed');
	output.appendLine('');
	output.appendLine('Cannot find entry file:');
	output.appendLine('  - lib/main.dart');
	output.appendLine('  - lib/init_main.dart');
	output.appendLine('');
	output.appendLine('Add this inside your main():');
	output.appendLine('');
	output.appendLine('  WidgetsFlutterBinding.ensureInitialized();');
	output.appendLine('  await Firebase.initializeApp(');
	output.appendLine('    options: DefaultFirebaseOptions.currentPlatform,');
	output.appendLine('  );');
	output.show(true);
}

async function insertFirebaseInitAppIntoMainFile(uri: vscode.Uri) {
	const hasInit = await FileUtils.findLinesWithKeyword(
		uri,
		'Firebase.initializeApp',
	);
   // sudah ada, skip
	if (hasInit !== null) {
		return;
	}

	const lineKeyBinding = await FileUtils.findLinesWithKeyword(
		uri,
		'WidgetsFlutterBinding.ensureInitialized',
	);

	const lineMain = await FileUtils.findLinesWithKeyword(uri, 'void main(');

	if (lineKeyBinding !== null) {
		await FileUtils.insertTextAtLine(uri, {
			addText: `\n  await Firebase.initializeApp(\n    options: DefaultFirebaseOptions.currentPlatform,\n  );`,
			line: lineKeyBinding + 1,
		});
	} else if (lineMain !== null) {
		await FileUtils.insertTextAtLine(uri, {
			addText: `\n  WidgetsFlutterBinding.ensureInitialized();\n\n  await Firebase.initializeApp(\n    options: DefaultFirebaseOptions.currentPlatform,\n  );`,
			line: lineMain + 1,
		});
	} else {
		vscode.window.showWarningMessage(
			'Cannot find void main() — add Firebase init manually',
		);
		showFirebaseErrorOutput();
		return;
	}

	await insertFirebaseImports(uri);
}

async function insertFirebaseImports(uri: vscode.Uri) {
	// Cari baris import terakhir supaya tidak inject di tengah-tengah existing imports
	const lastImportLine =
		(await FileUtils.findLinesWithKeyword(uri, "import '")) ?? 0;

	await FileUtils.insertTextAtLine(uri, {
		addText: `import 'package:firebase_core/firebase_core.dart';\nimport 'firebase_options.dart';`,
		line: lastImportLine + 1,
	});
}
