import { logger } from '@common/utils/logger.utils';
import * as vscode from 'vscode';

export class WebviewService {
	private _webview: vscode.WebviewView | undefined;

	setWebview(wv: vscode.WebviewView): void {
		this._webview = wv;
	}

	getWebview(): vscode.WebviewView {
		if (!this._webview) {
			throw new Error('Webview has not been set yet.');
		}
		return this._webview;
	}

	/**
	 * Mengirim pesan dari extension ke webview
	 */
	postMessage(action: string, data?: unknown): void {
		if (!this._webview) {
			logger.error('Webview has not been set yet');
			return;
		}
		this._webview.webview.postMessage({ action, data });
	}
}
