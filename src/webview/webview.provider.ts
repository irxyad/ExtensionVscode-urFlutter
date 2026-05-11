import { appContext } from '@common/app-context';
import FileUtils from '@common/utils/file.utils';
import { logger } from '@common/utils/logger.utils';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { handleWebviewMessage } from './utils/webview-message-handler.utils';

export class WebViewProvider implements vscode.WebviewViewProvider {
	constructor(private context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		// init webview instance di app context
		appContext.webview.setWebview(webviewView);

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(
					path.join(this.context.extensionPath, 'out', 'webview', 'views'),
				),
				vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'script')),
			],
		};

		const htmlPath = path.join(this.context.extensionPath, 'src', 'index.html');
		let html = fs.readFileSync(htmlPath, 'utf-8');

		const styleUri = webviewView.webview.asWebviewUri(
			vscode.Uri.file(
				path.join(
					this.context.extensionPath,
					'out',
					'webview',
					'views',
					'main.css',
				),
			),
		);

		const scriptUri = webviewView.webview.asWebviewUri(
			vscode.Uri.file(
				path.join(
					this.context.extensionPath,
					'out',
					'webview',
					'views',
					'main.js',
				),
			),
		);

		const nonce = FileUtils.getCSP();

		html = html.replace(
			'<script src="main.js"></script>',
			`
			<script nonce="${nonce}" src="${scriptUri}"></script>
			`,
		);

		html = html.replace(
			'<link href="" rel="stylesheet" />',
			`<link href="${styleUri}" rel="stylesheet">`,
		);

		webviewView.webview.html = html;

		// Handle message
		webviewView.webview.onDidReceiveMessage(async (message) => {
			logger.log('Received message from webview:', message);
			await handleWebviewMessage(message, webviewView.webview);
		});
	}
}
