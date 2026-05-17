import { AppError } from '@common/error/app.error';
import * as vscode from 'vscode';
import { logger } from './logger.utils';

export const VscodeMessage = {
	error(error: unknown, message: string = 'An error occurred'): void {
		const err = error instanceof AppError ? error.message : String(error);
		logger.error(`${message}: ${err}`);

		if (message.isEmpty) {
			vscode.window.showErrorMessage(err);
		} else {
			vscode.window.showErrorMessage(`${message}: ${err}`);
		}
	},

	success(message: string = 'Success'): void {
		logger.log(message);
		vscode.window.showInformationMessage(message);
	},

	info(message: string): void {
		vscode.window.showInformationMessage(message);
	},

	warning(message: string): void {
		vscode.window.showWarningMessage(message);
	},
};
