import { appContext } from '@common/app-context';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import * as vscode from 'vscode';
import SnippetUtils from '../snippet.utils';
import { ActionSnippetOption } from '../types/snippet.types';

export async function deleteGroupSnippet(name: string): Promise<boolean> {
	const uri = await SnippetUtils.getUriByWsName(name);

	if (!uri) {
		VscodeMessage.error(`Group snippet with name "${name}" not found.`);
		return false;
	}

	try {
		await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: true });
		vscode.window.showInformationMessage(
			`Group snippet "${name}" deleted successfully.`,
		);

		return true;
	} catch (error) {
		VscodeMessage.error(`Failed to delete group snippet: ${error}`);
		return false;
	}
}
export async function deleteSnippet(
	props: ActionSnippetOption,
): Promise<boolean> {
	try {
		const storage = await SnippetUtils.readStorage(props.storage.name);

		if (!storage) {
			VscodeMessage.error('Failed to read storage.');
			return false;
		}

		const index = storage.snippets.findIndex(
			(v) => v.name === props.snippetName,
		);

		if (index === -1) {
			vscode.window.showWarningMessage(
				`Snippet "${props.snippetName}" not found.`,
			);
			return false;
		}

		storage.snippets.splice(index, 1);
		const filename = SnippetUtils.convertToStorageName(storage.name);

		await appContext.storage.writeFile({
			filename: filename,
			content: storage,
			overWrite: true,
		});

		vscode.window.showInformationMessage(
			`Snippet "${props.snippetName}" deleted successfully.`,
		);
		return true;
	} catch (error) {
		VscodeMessage.error(error, 'Failed to delete snippet');
		return false;
	}
}
