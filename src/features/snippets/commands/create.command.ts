import { appContext } from '@common/app-context';
import { AppError } from '@common/error/app.error';
import { WorkspaceInterface } from '@common/types/workspace.types';
import ValidationUtils from '@common/utils/validation.utils';
import SnippetUtils from '@features/snippets/snippet.utils';
import {
  SnippetInterface,
  StorageSnippetInterface,
} from '@features/snippets/types/snippet.types';
import { ReturnBridgeWebview } from '@webview/webview.constants';
import * as vscode from 'vscode';
import { SnippetConstant } from '../snippet.constants';

export function createSnippet(context: vscode.ExtensionContext) {
	const command = vscode.commands.registerCommand(
		'extension.createSnippet',
		async (_) => {
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
					return;
				}

				const selectedText = editor.document.getText(editor.selection);
				if (!selectedText.trim()) {
					vscode.window.showErrorMessage('Please select some text!');
					return;
				}

				const snippetName = await vscode.window.showInputBox({
					title: 'Enter Snippet Name',
					prompt:
						'Snippet name must contain only lowercase letters and no spaces.',
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

				const alreadyExists = await SnippetUtils.checkPrefixOrName(snippetName);
				if (alreadyExists) {
					vscode.window.showWarningMessage(
						`Snippet "${snippetName}" already exists.`,
					);
					return;
				}

				await saveNewSnippet({ wsp, snippetName, selectedText });

				vscode.window.showInformationMessage(
					`Snippet "${snippetName}" created!`,
				);
			} catch (e) {
				const message =
					e instanceof AppError ? e.message : 'Something went wrong.';
				vscode.window.showErrorMessage(message);
			}
		},
	);

	context.subscriptions.push(command);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function saveNewSnippet(opts: {
	wsp: WorkspaceInterface;
	snippetName: string;
	selectedText: string;
}): Promise<void> {
	const { wsp, snippetName, selectedText } = opts;

	await ensureGroupSnippetExists(wsp);

	const filename = `${wsp.workspaceName}-${SnippetConstant.SuffixGroupSnippet}`;
	const existing =
		await appContext.storage.readFile<StorageSnippetInterface>(filename);

	const newSnippet: SnippetInterface = {
		name: snippetName,
		prefix: snippetName,
		body: selectedText.split('\n'),
    description: `Snippet from workspace **${wsp.workspaceName}**`,
	};

	const updated: StorageSnippetInterface = {
		metadata: existing?.metadata ?? {
			from_workspace: wsp.workspaceName,
			uri_workspace: wsp.workspaceUri.path,
		},
		name: existing?.name ?? wsp.workspaceName,
		snippets: [...(existing?.snippets ?? []), newSnippet],
	};

	await appContext.storage.writeFile({ filename, content: updated });
	await saveSyncSnippet();

	const listSnippets = await SnippetUtils.readStorages();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

async function ensureGroupSnippetExists(
	wsp: WorkspaceInterface,
): Promise<void> {
	const filename = `${wsp.workspaceName}-${SnippetConstant.SuffixGroupSnippet}`;
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

async function saveSyncSnippet(): Promise<void> {
	const listSnippets = await SnippetUtils.readStorages();

	const dataCompressed = Object.fromEntries(
		listSnippets.map((val) => [val.name, val]),
	) satisfies Record<string, StorageSnippetInterface>;

	await SnippetUtils.save(dataCompressed);
}
