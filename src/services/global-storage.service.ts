import * as vscode from 'vscode';

export class GlobalStorageService {
	constructor(private context: vscode.ExtensionContext) {}

	get uri() {
		return this.context.globalStorageUri;
	}

	async readDir(): Promise<[string, vscode.FileType][]> {
		try {
			return await vscode.workspace.fs.readDirectory(
				this.context.globalStorageUri,
			);
		} catch {
			return [];
		}
	}

	async writeFile<T>({
		filename,
		content,
	}: {
		filename: string;
		content: T;
	}): Promise<vscode.Uri> {
		const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
		const data = Buffer.from(JSON.stringify(content, null, 2));

		await vscode.workspace.fs.writeFile(uri, data);
		return uri;
	}

	async readFile<T>(filename: string): Promise<T | null> {
		try {
			const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
			const raw = await vscode.workspace.fs.readFile(uri);
			return JSON.parse(Buffer.from(raw).toString('utf-8')) as T;
		} catch {
			return null;
		}
	}

	async deleteFile(filename: string): Promise<void> {
		const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
		await vscode.workspace.fs.delete(uri, { useTrash: false });
	}

	async exists(filename: string): Promise<boolean> {
		try {
			const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
			await vscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}
}
