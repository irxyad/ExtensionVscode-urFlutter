import { logger } from '@common/utils/logger.utils';
import { exec, ExecOptions } from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';

const DEFAULT_LABEL = 'urFlutter';

export class TerminalService {
	private terminal?: vscode.Terminal;

	constructor(private label = DEFAULT_LABEL) {}

	private getOrCreate(): vscode.Terminal {
		if (this.terminal && !this.terminal.exitStatus) {
			return this.terminal;
		}
		this.terminal = vscode.window.createTerminal(this.label);
		return this.terminal;
	}

  /**
  * [Terminal Umum] Untuk command interaktif yang ingin dilihat outputnya secara real-time di terminal
  */

	execute(command: string, clearFirst = false): void {
		const terminal = this.getOrCreate();
		const clear = os.platform() === 'win32' ? 'cls' : 'clear';

		if (clearFirst) {
			terminal.sendText(clear, true);
		}

		terminal.show(true);

		setTimeout(() => {
			terminal.sendText(command);
		}, 50);
	}

  /**
  * [Exec Child Process] Untuk command yang ingin dijalankan secara async dan gk interaktif
  */
	executeAsync(
		command: string,
		options?: ExecOptions,
	): Promise<{ stdout: string; stderr: string }> {
		const cwd =
			options?.cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!cwd) {
			return Promise.reject(new Error('No workspace folder open'));
		}

		return new Promise((resolve, reject) => {
			const process = exec(command, { ...options, cwd }, (error, stdout, stderr) => {
				if (error) {
					reject(new Error(`Command failed: ${command}\n${stderr || error.message}`));
					return;
				}
				resolve({ stdout, stderr });
			});

			// Log stderr real-time ke output channel
			process.stderr?.on('data', (data: string) => {
				logger.warn(`[${this.label}] stderr:`, data);
			});
		});
	}

	dispose(): void {
		this.terminal?.dispose();
		this.terminal = undefined;
	}
}
