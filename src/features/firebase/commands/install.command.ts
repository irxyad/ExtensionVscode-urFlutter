import { handleError } from '@common/utils/error.utils';
import FileUtils from '@common/utils/file.utils';
import FlutterUtils from '@common/utils/flutter.utils';
import ProjectUtils from '@common/utils/project.utils';
import { TerminalService } from '@services/terminal.service';
import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

export const installFirebase = async () => {
	const terminal = new TerminalService('Install Firebase');

	try {
		ProjectUtils.getUri();

		const hasFirebaseOptions = await FileUtils.find(
			'lib/firebase_options.dart',
		);

		if (hasFirebaseOptions) {
			const action = await vscode.window.showErrorMessage(
				'Cancelled: Firebase already installed',
				'Reinstall',
			);

			if (action !== 'Reinstall') {
				return;
			}
		}

		await startInstalling(terminal);
	} catch (error) {
		handleError(error, 'Install Firebase');
	} finally {
		terminal.dispose();
	}
};

async function startInstalling(terminal: TerminalService) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Install Firebase',
			cancellable: true,
		},
		async (progress, token) => {
			const checkCancelled = () => token.isCancellationRequested;

			token.onCancellationRequested(() => {
				terminal.dispose();
				vscode.window.showWarningMessage('Firebase installation cancelled.');
			});

			try {
				if (checkCancelled()) {
					return;
				}

				// Cek apakah firebase CLI sudah terinstall
				progress.report({ message: 'Checking for firebase CLI...' });
				const hasFirebaseCLI =
					await terminal.commandExists('firebase --version');

				if (checkCancelled()) {
					return;
				}

				if (!hasFirebaseCLI) {
					const hasNpm = await terminal.commandExists('npm --version');

					// Jika firebaseCLI dan NPM gk punya maka nampilin url dokumentasinya saja
					if (!hasNpm) {
						const selection = await vscode.window.showErrorMessage(
							'Firebase CLI not found and npm is not available. Please install Firebase CLI manually.',
							'See Firebase CLI docs',
						);

						if (selection === 'See Firebase CLI docs') {
							vscode.env.openExternal(
								vscode.Uri.parse('https://firebase.google.com/docs/cli'),
							);
						}
						return;
					}

					// Kalau ada npm, kita install firebase CLI
					progress.report({ message: 'Installing firebase CLI...' });
					await terminal.executeAsync('npm install -g firebase-tools');

					if (checkCancelled()) {
						return;
					}
				}

				// Install firebase_core
				progress.report({ message: 'Adding firebase_core... (1/4)' });
				await terminal.executeAsync('flutter pub add firebase_core');

				if (checkCancelled()) {
					return;
				}

				// Install FlutterFire CLI
				progress.report({ message: 'Installing FlutterFire CLI... (2/4)' });
				await terminal.executeAsync('dart pub global activate flutterfire_cli');

				if (checkCancelled()) {
					return;
				}

				// Run flutterfire configure
				progress.report({ message: 'Running flutterfire configure... (3/4)' });
				terminal.execute('flutterfire configure');

				// Tunggu firebase_options.dart beneran terbuat
				await waitForFirebaseOptions(token);

				if (checkCancelled()) {
					return;
				}

				// Inject config dan import ke main.dart
				progress.report({ message: 'Injecting Firebase init... (4/4)' });
				await configFirebase();

				vscode.window.showInformationMessage(
					'Firebase installed & configured!',
				);
			} catch (err) {
				if (!token.isCancellationRequested) {
					handleError(err, 'installFirebase');
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
		const uri = ProjectUtils.getUri();

		const targetPath = path.join(uri.fsPath, 'lib', 'firebase_options.dart');
		const isExist = fs.existsSync(targetPath);

		const watcher = vscode.workspace.createFileSystemWatcher(
			'**/firebase_options.dart',
			false,
			false,
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
		}, 120_000); // 120 detik

		const cancelListener = token.onCancellationRequested(() => {
			cleanup(() => resolve());
		});

		// Kalau file belum ada, tunggu dibuat
		watcher.onDidCreate(() => cleanup(() => resolve()));

		// Kalau file sudah ada, tunggu diubah
		if (isExist) {
			watcher.onDidChange(() => cleanup(() => resolve()));
		}
	});
}

async function configFirebase() {
	await FlutterUtils.insertIntoMain({
		label: 'Firebase Setup',
		detectKeyword: 'Firebase.initializeApp',
		insertText: [
			'  await Firebase.initializeApp(',
			'    options: DefaultFirebaseOptions.currentPlatform,',
			'  );',
		].join('\n'),
		afterKeyword: ['WidgetsFlutterBinding.ensureInitialized', 'main('],
		prependText: '  WidgetsFlutterBinding.ensureInitialized();',
		instructions: [
			'  WidgetsFlutterBinding.ensureInitialized();',
			'  await Firebase.initializeApp(',
			'    options: DefaultFirebaseOptions.currentPlatform,',
			'  );',
		],
	});

	// Kemudian kita inject imports nya
	await FlutterUtils.insertImportsIntoMain('Firebase Setup', {
		imports: [
			"import 'package:firebase_core/firebase_core.dart';",
			"import 'firebase_options.dart';",
		],
	});
}
