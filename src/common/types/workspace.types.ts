import * as vscode from 'vscode';

export type WorkspaceInterface = {
	workspaceName: string;
	workspaceUri: vscode.Uri;
};
