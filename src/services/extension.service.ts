import * as vscode from 'vscode';

type ExtensionFlavor = 'development' | 'production';

export class ExtensionService {
	private _context?: vscode.ExtensionContext;

	init(context: vscode.ExtensionContext): void {
		this._context = context;
	}

	get flavor(): ExtensionFlavor {
		if (!this._context) {
			return 'production';
		}

		return this._context.extensionMode === vscode.ExtensionMode.Production
			? 'production'
			: 'development';
	}

	get isDevelopment(): boolean {
		return this.flavor === 'development';
	}

	get isProduction(): boolean {
		return this.flavor === 'production';
	}

	get context(): vscode.ExtensionContext {
		if (!this._context) {
			throw new Error('ExtensionService not initialized');
		}
		return this._context;
	}
}
