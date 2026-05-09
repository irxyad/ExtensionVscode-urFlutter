import { appContext } from '@common/app-context';
import { logger } from '@common/utils/logger.utils';
import { isValidFlutterProjectName } from '@common/utils/validation.utils';
import { spawn } from 'child_process';
import path from 'path';
import * as vscode from 'vscode';

export async function createFlutter(): Promise<void> {
	const uris = await vscode.window.showOpenDialog({
		canSelectFolders: true,
		title: 'Select Folder to Create Flutter Project',
	});

	if (!uris?.length) {
		vscode.window.showInformationMessage('No folder selected.');
		return;
	}

	const projectName = await vscode.window.showInputBox({
		prompt: 'Project name must contain only lowercase letters and no spaces.',
		ignoreFocusOut: true,
		title: 'Enter Flutter Project Name',
		validateInput: (value) => {
			if (!value) {
				return 'Project name cannot be empty.';
			}
			if (!isValidFlutterProjectName(value)) {
				return 'Use lowercase letters, numbers, and underscores only. Must start with a letter.';
			}
			return null;
		},
	});

	if (!projectName) {
		return;
	}

	await createFlutterProject(projectName, uris[0]);
}

async function createFlutterProject(
	projectName: string,
	folderUri: vscode.Uri,
): Promise<void> {
	const folderPath = folderUri.fsPath;
	const fullPath = path.join(folderPath, projectName);

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Creating Flutter Project...',
			cancellable: true,
		},
		(progress, token) =>
			new Promise<void>((resolve, reject) => {
				const child = spawn('flutter', ['create', projectName], {
					cwd: folderPath,
					shell: true,
				});

				let errorOutput = '';

				token.onCancellationRequested(() => {
					child.kill();
					reject(new Error('Process cancelled by user.'));
				});

				child.stdout.on('data', (data: Buffer) => {
					logger.log(data.toString());
				});

				child.stderr.on('data', (data: Buffer) => {
					const text = data.toString();
					logger.log(text);
					errorOutput += text;
				});

				child.on('close', (code) => {
					if (code === 0) {
						progress.report({ increment: 100, message: 'Opening Project...' });
						appContext.state.update('autoInitFolder', true);
						vscode.commands.executeCommand(
							'vscode.openFolder',
							vscode.Uri.file(fullPath),
							false,
						);
						resolve();
					} else {
						const msg = `Failed to create Flutter project: ${projectName}`;
						vscode.window.showErrorMessage(msg, 'Show Output').then((val) => {
							if (val === 'Show Output') {
								logger.show();
							}
						});
						reject(new Error(errorOutput));
					}
				});
			}),
	);
}
