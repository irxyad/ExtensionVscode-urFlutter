import { GlobalStateService } from '@services/global-state.service';
import { GlobalStorageService } from '@services/global-storage.service';
import { WebviewService } from '@services/webview.service';
import { WorkspaceService } from '@services/workspace.service';
import * as vscode from 'vscode';
import { logger } from './utils/logger.utils';

class AppContext {
	private static instance: AppContext;

	private _context: vscode.ExtensionContext | undefined;
	private _storage: GlobalStorageService | undefined;
	private _state: GlobalStateService | undefined;
	private _workspace: WorkspaceService | undefined;
	private _webview: WebviewService | undefined;

	private constructor() {}

	static getInstance(): AppContext {
		if (!AppContext.instance) {
			AppContext.instance = new AppContext();
		}
		return AppContext.instance;
	}

	init(context: vscode.ExtensionContext): void {
		if (this._context) {
			throw new Error('AppContext already initialized.');
		}

		logger.init();

		this._context = context;
		this._state = new GlobalStateService(context);
		this._storage = new GlobalStorageService(context);
		this._workspace = new WorkspaceService();
		this._webview = new WebviewService();
	}

	get context(): vscode.ExtensionContext {
		return this.assertInitialized(this._context, 'context');
	}

	get storage(): GlobalStorageService {
		return this.assertInitialized(this._storage, 'storage');
	}

	get state(): GlobalStateService {
		return this.assertInitialized(this._state, 'state');
	}

	get workspace(): WorkspaceService {
		return this.assertInitialized(this._workspace, 'workspace');
	}

	get extensionUri(): vscode.Uri {
		return this.context.extensionUri;
	}

	get secrets(): vscode.SecretStorage {
		return this.context.secrets;
	}

	get webview(): WebviewService {
		return this.assertInitialized(this._webview, 'webview');
	}

	get getVersion() {
		return this.context.extension.packageJSON.version;
	}

	private assertInitialized<T>(value: T | undefined, name: string): T {
		if (value === undefined) {
			throw new Error(
				`AppContext.${name} is not initialized. Call appContext.init() first inside activate().`,
			);
		}
		return value;
	}

	dispose(): void {
		logger.dispose();

		this._storage = undefined;
		this._state = undefined;
		this._workspace = undefined;
		this._context = undefined;
		this._webview = undefined;
	}
}

export const appContext = AppContext.getInstance();
