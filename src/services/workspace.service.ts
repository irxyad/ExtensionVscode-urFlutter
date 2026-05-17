import { WorkspaceInterface } from '@common/types/workspace.types';
import { logger } from '@common/utils/logger.utils';
import * as vscode from 'vscode';

export class WorkspaceService {
	 getWorkspaceFolder(): WorkspaceInterface | null {
		const folders = vscode.workspace.workspaceFolders;

		if (!folders?.length) {
			logger.error('No workspace folder open');
			return null;
		}

		return {
			workspaceName: folders[0].name,
			workspaceUri: folders[0].uri,
		};
	}
}
