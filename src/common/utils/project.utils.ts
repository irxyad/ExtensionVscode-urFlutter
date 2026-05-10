import * as fs from 'fs-extra';
import path from 'path';
import * as vscode from 'vscode';
import { appContext } from '../app-context';

/**
 * Untuk mendapatkan Uri projek flutter
 */
function getUri() {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw Error('No workspace folder opened');
	}

	const projectPath = vscode.Uri.joinPath(workspaceFolders[0].uri);

	return projectPath;
}

/**
 * Mengcopy template dari extension ke projek flutter
 * @params destFolder & sourceFolder (relative path)
 */
async function copyTemplate({
	destFolder,
	sourceFolder,
}: {
	destFolder: string;
	sourceFolder: string;
}) {
	const projectUri = ProjectUtils.getUri();

	const targetPath = path.join(projectUri.fsPath, destFolder);
	const sourcePath = appContext.context.asAbsolutePath(sourceFolder);

	const exists = await fs.pathExists(targetPath);

	if (exists) {
		const stat = await fs.stat(targetPath);
		if (stat.isFile()) {
			await fs.remove(targetPath);
		}
	}

	await fs.copy(sourcePath, targetPath, { overwrite: true });
}

const ProjectUtils = { getUri, copyTemplate };

export default ProjectUtils;
