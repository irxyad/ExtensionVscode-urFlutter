import * as vscode from 'vscode';
import { logger } from './logger.utils';

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}

export function handleError(error: unknown, context?: string): void {
	const msg = error instanceof Error ? error.message : String(error);
	const fullMsg = context ? `[${context}] ${msg}` : msg;

	vscode.window.showErrorMessage(fullMsg);
	logger.error(fullMsg, error);
}
