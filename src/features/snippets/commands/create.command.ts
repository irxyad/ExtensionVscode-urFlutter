import { appContext } from '@common/app-context';
import { WorkspaceInterface } from '@common/types/workspace.types';
import ValidationUtils from '@common/utils/validation.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
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
			VscodeMessage.error("Can't create, no workspace folder found.");
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			VscodeMessage.error('Please open a file first!');
			return;
		}

		const selectedText = editor.document.getText(editor.selection);
		if (!selectedText.trim()) {
			VscodeMessage.error('Please select some text!');
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
			VscodeMessage.info('Snippet creation canceled.');
			return;
		}

		const alreadyExists = await SnippetUtils.checkPrefixOrName({
			key: snippetName,
			storageName: wsp.workspaceName,
		});

		if (alreadyExists) {
			VscodeMessage.warning(`Snippet "${snippetName}" already exists.`);
			return;
		}

		await saveNewSnippet({
			filePath: vscode.workspace.asRelativePath(editor.document.fileName),
			wsp,
			snippetName,
			selectedText,
		});

		VscodeMessage.success('Snippet created successfully!');
	} catch (e) {
		VscodeMessage.error(e, 'Failed to create snippet');
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
