import { isWingetInstalled } from '@features/platform/utils/check-winget.utils';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';

enum OptPlatform {
	Windows = 'Windows',
	Linux = 'Linux',
	Macos = 'MacOs',
}

export async function installScrcpy() {
	const terminal = new TerminalService('Install Scrcpy');

	const platform = await vscode.window.showQuickPick(
		Object.values(OptPlatform),
		{
			title: 'Choose your platform',
		},
	);

	if (!platform) {
		vscode.window.showInformationMessage('Cancelled');
		return;
	}

	switch (platform) {
		case OptPlatform.Windows:
			await onWindows(terminal);
			break;
		case OptPlatform.Linux:
			onLinux();
			break;
		case OptPlatform.Macos:
			onMacos(terminal);
			break;
	}
}

function onMacos(terminal: TerminalService) {
	terminal.execute(
		'brew install scrcpy && brew install --cask android-platform-tools',
		true,
	);
}

function onLinux() {
	vscode.window
		.showInformationMessage(
			'On Linux, installation depends on your distro. Please check the official guide.',
			'See Documentation',
		)
		.then((selection) => {
			if (selection === 'See Documentation') {
				vscode.env.openExternal(
					vscode.Uri.parse(
						'https://github.com/Genymobile/scrcpy/blob/master/doc/linux.md',
					),
				);
			}
		});
}

async function onWindows(terminal: TerminalService) {
	const isInstalled = await isWingetInstalled();

	if (isInstalled) {
		terminal.execute('winget install --exact Genymobile.scrcpy', true);
	}
}
