import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';

const opt = [
	{
		label: 'Build Once',
		description: 'Run build_runner a single time',
		command: 'dart run build_runner build --delete-conflicting-outputs',
	},
	{
		label: 'Watch Mode',
		description: 'Automatically rebuild on file changes',
		command: 'dart run build_runner watch --delete-conflicting-outputs',
	},
];

export async function buildRunner() {
	const terminal = new TerminalService('Build Runner Terminal');

	const choice = await vscode.window.showQuickPick(opt, {
		title: 'Build Runner',
		placeHolder: 'Select a build_runner mode',
	});

	if (choice) {
		terminal.execute(choice.command, true);
	}
}
