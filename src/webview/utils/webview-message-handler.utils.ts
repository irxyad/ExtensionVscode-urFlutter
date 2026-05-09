import { AppConstant } from '@common/constants/common.constants';
import { SidebarMenu } from '@common/constants/menus/sidebar-menu.constants';
import { logger } from '@common/utils/logger.utils';
import { installFirebase } from '@features/firebase/commands/install.command';
import buildLauncherIcon, {
  generateLauncherIcon,
} from '@features/generate/commands/launcher-icon.command';
import { installLocalization } from '@features/localization/commands/install.command';
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
import SnippetUtils from '@features/snippets/snippet.utils';
import {
  ActionBridgeWebview,
  ReturnBridgeWebview,
} from '@webview/webview.constants';
import * as vscode from 'vscode';

type MessageHandler = (message: any, webview: vscode.Webview) => Promise<void>;

const messageHandlers: Partial<Record<string, MessageHandler>> = {
	[SidebarMenu.GenerateFlutter]: async () => {
		await createFlutter();
	},
	[SidebarMenu.InitFolder]: async () => {
		await initFolder();
	},
	[SidebarMenu.Firebase.Install]: async () => {
		await installFirebase();
	},
	[SidebarMenu.Build.LauncherIcon]: async () => {
		await buildLauncherIcon();
	},
	[SidebarMenu.Build.Project]: async () => {
		await buildFlutter();
	},
	[SidebarMenu.Generate.LauncherIcon]: async () => {
		await generateLauncherIcon();
	},
	[SidebarMenu.Scrcpy.InstallScrcpy]: async () => {
		await installScrcpy();
	},
	[SidebarMenu.Scrcpy.RunScrcpy]: async () => {
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
	[SidebarMenu.Install.Localization]: async () => {
		await installLocalization();
	},
	[AppConstant.AboutMe]: async () => {
		vscode.env.openExternal(
			vscode.Uri.parse('https://irsyadizzulhaq-portfolio.vercel.app'),
		);
	},

	// Snippet handlers
	[ActionBridgeWebview.GetSnippets]: async (_, webview) => {
		const listSnippets = await SnippetUtils.readAllSnippets();
		webview.postMessage({
			action: ReturnBridgeWebview.SnippetsData,
			data: listSnippets,
		});
	},
	[ActionBridgeWebview.DeleteGroupSnippet]: async (message, webview) => {
		const isDeleted = await deleteGroupSnippet(message.storageName);
		if (isDeleted) {
			webview.postMessage({ action: ActionBridgeWebview.IsDeletedSnippet });
		}
	},
	[ActionBridgeWebview.DeleteSnippet]: async (message, webview) => {
		const isDeleted = await deleteSnippet(message.props);
		if (isDeleted) {
			webview.postMessage({ action: ActionBridgeWebview.IsDeletedSnippet });
		}
	},
	[ActionBridgeWebview.EditSnippet]: async (message) => {
		SnippetUtils.editSnippet({
			snippetName: message.snippetName,
			storage: message.storage,
		});
	},
	[ActionBridgeWebview.RenameSnippet]: async (message, webview) => {
		const isRenamed = await SnippetUtils.renameSnippetName({
			snippetName: message.snippetName,
			storage: message.storage,
		});
		if (isRenamed) {
			webview.postMessage({ action: ActionBridgeWebview.IsRenamedSnippet });
		}
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
		await handler(message, webview);
	} else {
		logger.error('Unknown action from webview:', action);
	}
}
