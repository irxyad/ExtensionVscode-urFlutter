import { appContext } from '@common/app-context';
import { AppConstant } from '@common/constants/common.constants';
import * as vscode from 'vscode';

class Logger {
	private static instance: Logger;
	private _channel: vscode.LogOutputChannel | undefined;
	private _instructionChannel: vscode.OutputChannel | undefined;

	private constructor() {}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	init(): void {
		this._channel = vscode.window.createOutputChannel(
			AppConstant.ExtensionName,
			{ log: true },
		);
		this._instructionChannel = vscode.window.createOutputChannel(
			`Instruction ${AppConstant.ExtensionName}`,
		);
	}

	log(message: string, data?: unknown): void {
		if (appContext.extension.isDevelopment) {
			this._channel?.info(message, data ?? '');
		}
	}

	instruction(label: string, instructions: string[]): void {
		this._instructionChannel?.clear();
		this._instructionChannel?.show();

		const instructionTxt = [
			'─────────────────────────────────────────────',
			`${AppConstant.ExtensionName} — ${label}`,
			'─────────────────────────────────────────────',
			'',
			...instructions,
		];

		this._instructionChannel?.appendLine(instructionTxt.join('\n'));
	}

	error(message: string, data?: unknown): void {
		this._channel?.error(message, data ?? '');
	}

	warn(message: string, data?: unknown): void {
		this._channel?.warn(message, data ?? '');
	}

	debug(message: string, data?: unknown): void {
		this._channel?.debug(message, data ?? '');
	}

	show(instruction = false): void {
		if (instruction) {
			this._instructionChannel?.show();
		} else {
			this._channel?.show();
		}
	}

	clear(instruction = false): void {
		if (instruction) {
			this._instructionChannel?.clear();
		} else {
			this._channel?.clear();
		}
	}

	dispose(): void {
		this._channel?.dispose();
		this._channel = undefined;
		this._instructionChannel?.dispose();
		this._instructionChannel = undefined;
	}
}

export const logger = Logger.getInstance();
