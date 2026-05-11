import { appContext } from '@common/app-context';
import { WorkspaceInterface } from '@common/types/workspace.types';
import ValidationUtils from '@common/utils/validation.utils';
import SnippetUtils from '@features/snippets/snippet.utils';
import {
  MetadataStorageSnippet,
  StorageSnippetInterface,
} from '@features/snippets/types/snippet.types';
import { ReturnBridgeWebview } from '@webview/webview.constants';
import * as vscode from 'vscode';
import { SnippetConstant } from '../snippet.constants';

export function createSnippet(context: vscode.ExtensionContext) {
	const command = vscode.commands.registerCommand(
		'extension.createSnippet',
		async (_) => {
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

					const isValid = ValidationUtils.snippetName(value);

					if (!isValid) {
						return 'Invalid snippet name.';
					}
					return null;
				},
			});

			if (!snippetName) {
				vscode.window.showWarningMessage('Snippet creation canceled.');
				return;
			}

			const alreadyExists =
				await SnippetUtils.isExistPrefixOrSnippetName(snippetName);
			if (alreadyExists) {
				vscode.window.showWarningMessage(
					`Snippet "${snippetName}" already exists.`,
				);
				return;
			}

			await saveNewSnippet(context, { wsp, snippetName, selectedText });
		},
	);

	context.subscriptions.push(command);
}

async function saveNewSnippet(
	context: vscode.ExtensionContext,
	opts: { wsp: WorkspaceInterface; snippetName: string; selectedText: string },
): Promise<void> {
	const { wsp, snippetName, selectedText } = opts;

	const storage = await createGroupSnippet(context, { wsp });

	const newEntry = {
		[snippetName]: {
			prefix: snippetName,
			body: selectedText.split('\n'),
			description: `Your snippet generated from workspace [${wsp.workspaceName}]`,
		},
	};

	const existingSnippets = await readExistingSnippets(storage);

	const merged = { ...existingSnippets, ...newEntry };
	const encoded = Buffer.from(JSON.stringify(merged, null, 2));

	await vscode.workspace.fs.writeFile(storage, encoded);

	const keyStorage = `${snippetName}-${SnippetConstant.SuffixGroupSnippet}`;
	context.globalState.update(keyStorage, merged);

	await saveSyncSnippet();

	vscode.window.showInformationMessage(`Snippet "${snippetName}" created!`);

	const listSnippets = await SnippetUtils.readAllSnippets();
	appContext.webview.postMessage(
		ReturnBridgeWebview.SnippetsData,
		listSnippets,
	);
}

async function readExistingSnippets(
	uri: vscode.Uri,
): Promise<Record<string, unknown>> {
	try {
		const data = await vscode.workspace.fs.readFile(uri);
		if (data.length === 0) {
			return {};
		}
		return JSON.parse(new TextDecoder().decode(data));
	} catch {
		return {};
	}
}

async function createGroupSnippet(
	context: vscode.ExtensionContext,
	{ wsp }: { wsp: WorkspaceInterface },
): Promise<vscode.Uri> {
	const groupSnippetName = `${wsp.workspaceName}-${SnippetConstant.SuffixGroupSnippet}`;
	const groupSnippetUri = vscode.Uri.joinPath(
		context.globalStorageUri,
		groupSnippetName,
	);

	try {
		await vscode.workspace.fs.stat(groupSnippetUri);
		return groupSnippetUri;
	} catch {
		// Kalau belum ada, lanjut buat
	}

	const metadata: MetadataStorageSnippet = {
		from_workspace: wsp.workspaceName,
		uri_workspace: wsp.workspaceUri.path,
	};

	await vscode.workspace.fs.writeFile(
		groupSnippetUri,
		Buffer.from(JSON.stringify(metadata, null, 2)),
	);

	return groupSnippetUri;
}

async function saveSyncSnippet(): Promise<void> {
	const listSnippets = await SnippetUtils.readAllSnippets();

	const dataCompressed = Object.fromEntries(
		listSnippets.map((val) => [val.storageName, val]),
	) satisfies Record<string, StorageSnippetInterface>;

	await SnippetUtils.saveCompressedSnippets(dataCompressed);
}
