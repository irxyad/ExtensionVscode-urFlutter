import { appContext } from '@common/app-context';
import { WorkspaceInterface } from '@common/types/workspace.types';
import { logger } from '@common/utils/logger.utils';
import ValidationUtils from '@common/utils/validation.utils';
import SnippetUtils from '@features/snippets/snippet.utils';
import {
  SnippetInterface,
  StorageSnippetInterface,
} from '@features/snippets/types/snippet.types';
import { ReturnBridgeWebview } from '@webview/webview.constants';
import * as vscode from 'vscode';

export function registerCreateSnippet(context: vscode.ExtensionContext) {
	const command = vscode.commands.registerCommand(
		'extension.createSnippet',
		async (_) => {
			await createSnippet();
		},
	);

	context.subscriptions.push(command);
}

export async function createSnippet() {
	try {
		const wsp = appContext.workspace.getWorkspaceFolder();
		if (!wsp) {
			vscode.window.showErrorMessage(
				"Can't create, no workspace folder found.",
			);
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Please open a file first!');
			return;
		}

		const selectedText = editor.document.getText(editor.selection);
		logger.log('selectedText', selectedText);
		logger.log('body', selectedText.split('\n'));
		if (!selectedText.trim()) {
			vscode.window.showErrorMessage('Please select some text!');
			return;
		}

		const snippetName = await vscode.window.showInputBox({
			title: 'Enter Snippet Name',
			prompt: 'Snippet name must contain only lowercase letters and no spaces.',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) {
					return 'Snippet name cannot be empty.';
				}
				if (!ValidationUtils.snippetName(value)) {
					return 'Invalid snippet name.';
				}
				return null;
			},
		});

		if (!snippetName) {
			vscode.window.showWarningMessage('Snippet creation canceled.');
			return;
		}

		const alreadyExists = await SnippetUtils.checkPrefixOrName({
			key: snippetName,
			storageName: wsp.workspaceName,
		});

		if (alreadyExists) {
			vscode.window.showWarningMessage(
				`Snippet "${snippetName}" already exists.`,
			);
			return;
		}

		await saveNewSnippet({
			filePath: vscode.workspace.asRelativePath(editor.document.fileName),
			wsp,
			snippetName,
			selectedText,
		});

		vscode.window.showInformationMessage(`Snippet "${snippetName}" created!`);
	} catch (e) {
		vscode.window.showErrorMessage(`Failed to create snippet: ${e}`);
	}
}

async function saveNewSnippet(opts: {
	filePath: string;
	wsp: WorkspaceInterface;
	snippetName: string;
	selectedText: string;
}): Promise<void> {
	const { filePath, wsp, snippetName, selectedText } = opts;

	await ensureGroupSnippetExists(wsp);

	const filename = SnippetUtils.convertToStorageName(wsp.workspaceName);
	const existing =
		await appContext.storage.readFile<StorageSnippetInterface>(filename);

	const newSnippet: SnippetInterface = {
		name: snippetName,
		prefix: snippetName,
		body: selectedText.split('\n'),
		description: `Snippet from workspace **${wsp.workspaceName}**`,
		filePath: filePath,
	};

	const updated: StorageSnippetInterface = {
		metadata: existing?.metadata ?? {
			from_workspace: wsp.workspaceName,
			uri_workspace: wsp.workspaceUri.path,
		},
		name: existing?.name ?? wsp.workspaceName,
		snippets: [...(existing?.snippets ?? []), newSnippet],
	};

	await appContext.storage.writeFile({
		filename,
		content: updated,
		overWrite: true,
	});

	const listSnippets = await SnippetUtils.readStorages();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

async function ensureGroupSnippetExists(
	wsp: WorkspaceInterface,
): Promise<void> {
	const filename = SnippetUtils.convertToStorageName(wsp.workspaceName);
	const existing =
		await appContext.storage.readFile<StorageSnippetInterface>(filename);

	if (existing) {
		return;
	}

	const initial: StorageSnippetInterface = {
		metadata: {
			from_workspace: wsp.workspaceName,
			uri_workspace: wsp.workspaceUri.path,
		},
		name: wsp.workspaceName,
		snippets: [],
	};

	await appContext.storage.writeFile({ filename, content: initial });
}
