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
  options?: ExecOptions & { timeoutMs?: number },
): Promise<{ stdout: string; stderr: string }> {
  const cwd =
    options?.cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!cwd) {
    return Promise.reject(new Error('No workspace folder open'));
  }

  return new Promise((resolve, reject) => {
    const timeoutMs = options?.timeoutMs ?? 60_000; // 60 detik

    const childProcess = exec(
      command,
      { ...options, cwd },
      (error, stdout, stderr) => {
        clearTimeout(timer);

        if (error && !stdout) {
          reject(
            new Error(`Command failed: ${command}\n${stderr || error.message}`),
          );
          return;
        }

        resolve({ stdout, stderr });
      },
    );

    // Timeout handler untuk mencegah proses yang menggantung tanpa batas waktu
    const timer = setTimeout(() => {
      childProcess.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    childProcess.stderr?.on('data', (data: string) => {
      logger.warn(`[${this.label}] stderr:`, data);
    });

    childProcess.stdout?.on('data', (data: string) => {
      logger.log(`[${this.label}] stdout:`, data);
    });
  });
}

	// Untuk mengecek apakah command tersedia
	commandExists(command: string): Promise<boolean> {
		return new Promise((resolve) => {
			exec(command, (error) => {
				resolve(!error);
			});
		});
	}

	dispose(): void {
		this.terminal?.dispose();
		this.terminal = undefined;
	}
}
