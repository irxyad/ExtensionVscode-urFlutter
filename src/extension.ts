import { appContext } from '@common/app-context';
import { AppConstant } from '@common/constants/common.constants';
import StorageKey from '@common/constants/storage-key.constants';
import '@common/extensions/primitive.ext';
import { logger } from '@common/utils/logger.utils';
import { generateFromToEntity } from '@features/generate/commands/entity.command';
import { registerRevealWorkspace } from '@features/platform/commands/reveal-workspace.command';
import { initFolder } from '@features/project/commands/init-folder.command';
import { registerSnippet } from '@features/snippets/commands/auto-load.command';
import { registerCreateSnippet } from '@features/snippets/commands/create.command';
import { WebViewProvider } from '@webview/webview.provider';
import * as vscode from 'vscode';

async function registerAll(context: vscode.ExtensionContext) {
	// Load snippets
	const loadMySnippets = await registerSnippet(context);

	// Register create snippet command
	registerCreateSnippet(context);

	// Register reveal workspace
	// Digunakan di hover snippet agar bisa diklik ke workspace
	registerRevealWorkspace(context);

	// Belum diperbaiki template nya jadi kita skip dulu handleAutoInitFolder

	// Handle auto init folder
	// await handleAutoInitFolder();

	// Register webview panel provider
	let panel = vscode.window.registerWebviewViewProvider(
		AppConstant.MainPanel,
		new WebViewProvider(context),
	);

	return [panel, generateFromToEntity, loadMySnippets];
}

async function handleAutoInitFolder() {
	const shouldAutoInitFolder = appContext.state.get<boolean>(
		StorageKey.AutoInitFoder,
	);

	// Dijalankan ketika vscode dibuka kembali ketika setelah buat projek flutter
	// jadi akan meng copy template folder ke projek flutter yang baru dibuat
	if (shouldAutoInitFolder) {
		await initFolder();

		// Value nya diganti kembali biar gk terus jalan ketika vscode dibuka
		appContext.state.set(StorageKey.AutoInitFoder, !shouldAutoInitFolder);
	}
}

// hanya menangkap error di extension side
// tidak bisa menangkap error di webview side

function catchGlobalError() {
	process.on('uncaughtException', (error) => {
		logger.error('Uncaught Exception', error.message);
	});

	process.on('unhandledRejection', (reason) => {
		logger.error('Unhandled Rejection', reason);
	});
}

// Main entry point of the extension
export async function activate(context: vscode.ExtensionContext) {
	// Catch global error
	catchGlobalError();

	// Init singleton context
	appContext.init(context);

	const subscriptions = await registerAll(context);

	context.subscriptions.push(...subscriptions, {
		dispose: () => appContext.dispose(),
	});
}
