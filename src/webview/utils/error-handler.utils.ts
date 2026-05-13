import { ActionBridgeWebview } from '@webview/webview.constants';
import { postMessageToExtension } from './bridge.utils';

export function catchWebviewGlobalError(): void {
	window.onerror = (message, source, line, col, error) => {
		postMessageToExtension(ActionBridgeWebview.Log, {
			level: 'error',
			message: `[Window Error] ${message} (${source}:${line}:${col})`,
			data: error?.stack,
		});
	};

	window.onunhandledrejection = (event) => {
		postMessageToExtension(ActionBridgeWebview.Log, {
			level: 'error',
			message: `[Unhandled Rejection] ${event.reason}`,
		});
	};
}
