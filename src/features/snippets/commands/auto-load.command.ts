import { AppConstant } from '@common/constants/common.constants';
import { StorageSnippetInterface } from '@features/snippets/types/snippet.types';
import path from 'path';
import * as vscode from 'vscode';
import SnippetUtils from '../snippet.utils';

function toCompletionItems(
	storage: StorageSnippetInterface,
): vscode.CompletionItem[] {
	// const openLink = `[**${storage.metadata.from_workspace}**](command:extension.revealWorkspace?${encodeURIComponent(JSON.stringify(storage.metadata.uri_workspace))})`;

	return storage.snippets
		.filter((snippet) => !!snippet.prefix)
		.map((snippet) => {
			const folderPath = path.dirname(
				vscode.workspace.asRelativePath(snippet.filePath),
			);
			const folderLink = `[Open Folder](command:extension.revealWorkspace?${encodeURIComponent(JSON.stringify(storage.metadata.uri_workspace + '/' + folderPath))})`;
			const fileLink = `[Open File](command:extension.revealWorkspace?${encodeURIComponent(JSON.stringify(storage.metadata.uri_workspace + '/' + snippet.filePath))})`;

			const item = new vscode.CompletionItem(
				snippet.prefix,
				vscode.CompletionItemKind.Snippet,
			);

			item.insertText = new vscode.SnippetString(snippet.body.join('\n'));

			const hover = new vscode.MarkdownString(
				`Created using **${AppConstant.ExtensionName}**\n\n` +
					`${snippet.description}\n\n` +
					`${folderLink} | ${fileLink}\n\n` +
					`\`\`\`dart\n${snippet.body.join('\n')}\n\`\`\``,
			);
			hover.supportHtml = true;
			hover.isTrusted = true;
			item.documentation = hover;
			return item;
		});
}

export async function registerSnippet(
	context: vscode.ExtensionContext,
): Promise<vscode.Disposable> {
	let cachedItems: vscode.CompletionItem[] | null = null;

	const invalidateCache = () => {
		cachedItems = null;
	};

	const watcher = vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(context.globalStorageUri, '*'),
	);
	watcher.onDidChange(invalidateCache);
	watcher.onDidCreate(invalidateCache);
	watcher.onDidDelete(invalidateCache);

	const provider = vscode.languages.registerCompletionItemProvider('dart', {
		async provideCompletionItems() {
			if (cachedItems) {
				return cachedItems;
			}

			try {
				const storages = await SnippetUtils.readStorages();
				cachedItems = storages.flatMap(toCompletionItems);
				return cachedItems;
			} catch {
				return [];
			}
		},
	});

	return provider;
}
