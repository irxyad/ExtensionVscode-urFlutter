import * as vscode from 'vscode';

export function registerRevealWorkspace(
	context: vscode.ExtensionContext,
) {
	const reveal = vscode.commands.registerCommand(
		'extension.revealWorkspace',
		(folderPath: string) => {
			vscode.env.openExternal(vscode.Uri.file(folderPath));
		},
	);

	context.subscriptions.push(reveal);
}
