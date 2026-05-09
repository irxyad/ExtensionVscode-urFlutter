import { postMessageToExtension } from '@webview/utils/webview-bridge.utils';
import { ActionBridgeWebview } from '@webview/webview.constants';

/**
 * Logger untuk webview. Mengirim log ke output console
 */
export const wvLogger = {
	log: (message: string, data?: unknown) => {
		postMessageToExtension(ActionBridgeWebview.Log, {
			level: 'log',
			message,
			data,
		});
	},
	error: (message: string, data?: unknown) => {
		postMessageToExtension(ActionBridgeWebview.Log, {
			level: 'error',
			message,
			data,
		});
	},
	warn: (message: string, data?: unknown) => {
		postMessageToExtension(ActionBridgeWebview.Log, {
			level: 'warn',
			message,
			data,
		});
	},
};
