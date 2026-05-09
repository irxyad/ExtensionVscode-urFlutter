import { DeleteorRenameSnippetProp } from '@features/snippets/types/snippet.types';
import * as vscode from 'vscode';
import SnippetUtils from '../snippet.utils';

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function deleteGroupSnippet(name: string): Promise<boolean> {
	const uri = await SnippetUtils.getUriSnippetBasedName(name);

	if (!uri) {
		vscode.window.showErrorMessage(
			`Group snippet with name "${name}" not found.`,
		);
		return false;
	}

	try {
		await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
		return true;
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to delete group snippet: ${toErrorMessage(error)}`,
		);
		return false;
	}
}

export async function deleteSnippet(
	props: DeleteorRenameSnippetProp,
): Promise<boolean> {
	const uri = await SnippetUtils.getUriSnippetBasedName(props.groupSnippet);

	if (!uri) {
		vscode.window.showErrorMessage(
			`Group snippet with name "${props.groupSnippet}" not found.`,
		);
		return false;
	}

	try {
		const raw = await vscode.workspace.fs.readFile(uri);
		const parsed = JSON.parse(new TextDecoder().decode(raw)) as Record<
			string,
			unknown
		>;

		if (!(props.keySnippet in parsed)) {
			vscode.window.showWarningMessage(
				`Snippet "${props.keySnippet}" not found in group "${props.groupSnippet}".`,
			);
			return false;
		}

		const updated = Object.fromEntries(
			Object.entries(parsed).filter(([key]) => key !== props.keySnippet),
		);

		await vscode.workspace.fs.writeFile(
			uri,
			Buffer.from(JSON.stringify(updated, null, 2)),
		);

		vscode.window.showInformationMessage(
			`Snippet "${props.keySnippet}" deleted successfully.`,
		);
		return true;
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to delete snippet: ${toErrorMessage(error)}`,
		);
		return false;
	}
}
