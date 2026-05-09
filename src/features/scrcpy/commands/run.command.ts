import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
import { ScrcpyProfiles } from '../profile-launcher.utils';
import { getScrcpyParams } from '../scrcpy.params';

export async function runScrcpy() {
	const terminal = new TerminalService('Scrcpy Terminal');

	const customParams = await getScrcpyParams();

	const choice = await vscode.window.showQuickPick(
		[
			...Object.values(ScrcpyProfiles).map((p) => ({
				label: p.label,
				description: p.description,
				command: p.command,
			})),

			{
				label: '✨ Custom Params',
				description:
					'Runs with your saved custom params. Edit them anytime in the menu.',
				command: customParams,
			},
		],
		{
			title: 'Run scrcpy',
			placeHolder: 'Choose how you want to run scrcpy',
		},
	);

	if (!choice) {
		return;
	}

	terminal.execute(choice.command, true);
}
