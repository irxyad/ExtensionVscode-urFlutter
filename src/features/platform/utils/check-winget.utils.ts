import { exec } from 'child_process';
import * as vscode from 'vscode';

const WINGET_STORE_URL = 'ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1';

export function isWingetInstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		exec('winget --version', (error) => {
			if (error) {
				vscode.window
					.showErrorMessage(
						'Winget not found. The client is distributed within the App Installer package. Open Microsoft Store?',
						'Open Store',
					)
					.then((selection) => {
						if (selection === 'Open Store') {
							vscode.env.openExternal(vscode.Uri.parse(WINGET_STORE_URL));
						}
					});

				resolve(false);
			} else {
				resolve(true);
			}
		});
	});
}
