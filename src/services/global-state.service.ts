import * as vscode from 'vscode';

export class GlobalStateService {
	constructor(private context: vscode.ExtensionContext) {}

	 set<T>(key: string, value: T) {
		return this.context.globalState.update(key, value);
	}

	 get<T>(key: string): T | undefined {
		return this.context.globalState.get<T>(key);
	}

  update<T>(key: string, value: T) {
    return this.context.globalState.update(key, value);
  }
}
