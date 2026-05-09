import { AppConstant } from '@common/constants/common.constants';
import * as vscode from 'vscode';

class Logger {
	private static instance: Logger;
	private _channel: vscode.LogOutputChannel | undefined;

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
	}

	log(message: string, data?: unknown): void {
		this._channel?.info(message, data ?? '');
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

	show(): void {
		this._channel?.show();
	}

	dispose(): void {
		this._channel?.dispose();
		this._channel = undefined;
	}
}

export const logger = Logger.getInstance();
