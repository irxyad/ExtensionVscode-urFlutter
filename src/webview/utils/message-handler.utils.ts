import { AppConstant } from '@common/constants/common.constants';
import { SidebarMenu } from '@common/constants/menus/sidebar-menu.constants';
import { logger } from '@common/utils/logger.utils';
import { installFirebase } from '@features/firebase/commands/install.command';
import { buildRunner } from '@features/generate/commands/build-runner.command';
import buildLauncherIcon, {
  generateLauncherIcon,
} from '@features/generate/commands/launcher-icon.command';
import { installOrAddLocalization } from '@features/localization/commands/install.command';
import { buildFlutter } from '@features/project/commands/build.command';
import { createFlutter } from '@features/project/commands/create.command';
import { initFolder } from '@features/project/commands/init-folder.command';
import { installScrcpy } from '@features/scrcpy/commands/install.command';
import { runScrcpy } from '@features/scrcpy/commands/run.command';
import { editCustomParams } from '@features/scrcpy/scrcpy.params';
import {
  isMenuScript,
  runMenuScript,
} from '@features/script-runner/script.utils';
import {
  deleteGroupSnippet,
  deleteSnippet,
} from '@features/snippets/commands/delete.command';
import { editSnippet } from '@features/snippets/commands/edit.command';
import { renameSnippetName } from '@features/snippets/commands/rename.command';
import SnippetUtils from '@features/snippets/snippet.utils';
import {
  ActionBridgeWebview,
  ReturnBridgeWebview,
} from '@webview/webview.constants';
import * as vscode from 'vscode';

type MessageHandler = (extra: any, webview: vscode.Webview) => Promise<void>;

const messageHandlers: Partial<Record<string, MessageHandler>> = {
	// Flutter
	[SidebarMenu.GenerateFlutter]: async () => {
		await createFlutter();
	},
	[SidebarMenu.InitFolder]: async () => {
		await initFolder();
	},

	// Install or Add
	[SidebarMenu.Setup.Firebase.Install]: async () => {
		await installFirebase();
	},
	[SidebarMenu.Localization.Install]: async () => {
		await installOrAddLocalization(true);
	},
	[SidebarMenu.Localization.AddLocale]: async () => {
		await installOrAddLocalization(false);
	},

	// Build
	[SidebarMenu.Build.LauncherIcon]: async () => {
		await buildLauncherIcon();
	},
	[SidebarMenu.Build.Project]: async () => {
		await buildFlutter();
	},

	// Generate
	[SidebarMenu.Generate.LauncherIcon]: async () => {
		await generateLauncherIcon();
	},
	[SidebarMenu.Generate.BuildRunner]: async () => {
		await buildRunner();
	},

	// Scrcpy
	[SidebarMenu.Scrcpy.Install]: async () => {
		await installScrcpy();
	},
	[SidebarMenu.Scrcpy.Run]: async () => {
		await runScrcpy();
	},
	[SidebarMenu.Scrcpy.EditCustomParams]: async () => {
		await editCustomParams();
	},
	[SidebarMenu.Scrcpy.Documentation]: async () => {
		vscode.env.openExternal(
			vscode.Uri.parse('https://github.com/Genymobile/scrcpy/tree/master/doc'),
		);
	},

	// Footer
	[AppConstant.AboutMe]: async () => {
		vscode.env.openExternal(
			vscode.Uri.parse('https://irsyadizzulhaq-portfolio.vercel.app'),
		);
	},

	// Snippet handlers
	[ActionBridgeWebview.GetSnippets]: async (_, webview) => {
		const storages = await SnippetUtils.readStorages();

		webview.postMessage({
			action: ReturnBridgeWebview.SnippetsData,
			data: storages,
		});
	},
	[ActionBridgeWebview.DeleteGroupSnippet]: async (storageName, webview) => {
		const isDeleted = await deleteGroupSnippet(storageName);

		if (isDeleted) {
			webview.postMessage({ action: ReturnBridgeWebview.IsDeletedSnippet });
		}
	},
	[ActionBridgeWebview.DeleteSnippet]: async (extra, webview) => {
		const isDeleted = await deleteSnippet(extra);

		if (isDeleted) {
			webview.postMessage({ action: ReturnBridgeWebview.IsDeletedSnippet });
		}
	},
	[ActionBridgeWebview.EditSnippet]: async (extra) => {
		editSnippet(extra);
	},
	[ActionBridgeWebview.RenameSnippet]: async (extra) => {
		await renameSnippetName(extra);
	},
	[ActionBridgeWebview.Log]: async (message) => {
		const { level, message: msg, data } = message;
		logger[level as 'log' | 'error' | 'warn'](msg, data);
	},
};

export async function handleWebviewMessage(
	message: any,
	webview: vscode.Webview,
): Promise<void> {
	const action = message.action as string;

	if (isMenuScript(action)) {
		await runMenuScript(action);
		return;
	}

	const handler = messageHandlers[action];
	if (handler) {
		await handler(message.extra, webview);
	} else {
		logger.error('Unknown action from webview:', action);
	}
}
