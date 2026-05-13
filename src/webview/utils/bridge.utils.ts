const vscodeAcquire = acquireVsCodeApi();

/**
 * Fungsi untuk mengirim pesan dari webview ke extension
 */
export const postMessageToExtension = (id: string, extra?: {}) => {
	vscodeAcquire.postMessage({ action: id, ...extra });
};
