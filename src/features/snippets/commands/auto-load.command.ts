import { AppConstant } from '@common/constants/common.constants';
import { SnippetInterface } from '@features/snippets/types/snippet.types';
import * as vscode from 'vscode';
import { SnippetConstant } from '../snippet.constants';

function isSnippetInterface(value: unknown): value is SnippetInterface {
  return (
    typeof value === 'object' &&
    value !== null &&
    'prefix' in value &&
    'body' in value &&
    Array.isArray((value as SnippetInterface).body)
  );
}

function toCompletionItem(snippet: SnippetInterface): vscode.CompletionItem {
  const item = new vscode.CompletionItem(
    snippet.prefix,
    vscode.CompletionItemKind.Snippet
  );

  item.insertText = new vscode.SnippetString(snippet.body.join('\n'));

  const hover = new vscode.MarkdownString(
    `**${AppConstant.ExtensionName}**\n\n${snippet.description}`
  );
  hover.supportHtml = true;
  hover.isTrusted = true;
  item.documentation = hover;

  return item;
}

async function loadAllSnippets(
  storageUri: vscode.Uri
): Promise<SnippetInterface[]> {
  const files = await vscode.workspace.fs.readDirectory(storageUri);
  const snippetMap: Record<string, unknown> = {};

  for (const [fileName, fileType] of files) {
    if (
      fileType !== vscode.FileType.File ||
      !fileName.endsWith(SnippetConstant.SuffixGroupSnippet)
    ) {
      continue;
    }

    try {
      const fileUri = vscode.Uri.joinPath(storageUri, fileName);
      const data = await vscode.workspace.fs.readFile(fileUri);
      const parsed = JSON.parse(new TextDecoder().decode(data));
      Object.assign(snippetMap, parsed);
    } catch {
      // skip file yang gagal di-parse
    }
  }

  return Object.values(snippetMap).filter(isSnippetInterface);
}

export async function autoLoadSnippets(
  context: vscode.ExtensionContext
): Promise<vscode.Disposable> {
  let cachedItems: vscode.CompletionItem[] | null = null;

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(context.globalStorageUri, '*')
  );

  const invalidateCache = () => { cachedItems = null; };
  watcher.onDidChange(invalidateCache);
  watcher.onDidCreate(invalidateCache);
  watcher.onDidDelete(invalidateCache);
  context.subscriptions.push(watcher);

  const provider = vscode.languages.registerCompletionItemProvider('dart', {
    async provideCompletionItems() {
      if (cachedItems) {return cachedItems;}

      try {
        const snippets = await loadAllSnippets(context.globalStorageUri);
        cachedItems = snippets.map(toCompletionItem);
        return cachedItems;
      } catch {
        return [];
      }
    },
  });

  return provider;
}
