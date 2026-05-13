import * as vscode from 'vscode';

const DEFAULT_LABEL = 'urFlutter';

interface AsyncFunctionOptions {
	title?: string;
	func: () => Promise<void>;
	labelLoading?: string;
	msgSuccess?: string;
	msgError?: string;
}

interface MultiAsyncFunctionOptions {
	label: string;
	funcs: (signal: AbortSignal) => Promise<unknown>;
	stopOnError?: boolean;
	labelLoading?: string;
	msgSuccess?: string;
	msgError?: string;
}

export class PseudoTerminalService {
	private pseudoTerminal?: vscode.Terminal;
	private writeEmitter = new vscode.EventEmitter<string>();
	private isReady = false;
	private pendingWrites: string[] = [];
	private abortController?: AbortController;

	private readonly C = {
		reset: '\x1b[0m',
		bold: '\x1b[1m',
		dim: '\x1b[2m',
		italic: '\x1b[3m',

		success: '\x1b[38;5;82m',
		error: '\x1b[38;5;203m',
		warning: '\x1b[38;5;220m',
		info: '\x1b[38;5;81m',
		title: '\x1b[38;5;171m',
		muted: '\x1b[38;5;244m',
		white: '\x1b[38;5;255m',

		bgTitle: '\x1b[48;5;54m',
	} as const;

	constructor(private label = DEFAULT_LABEL) {}

	get signal(): AbortSignal | undefined {
		return this.abortController?.signal;
	}

	private getOrCreate(): vscode.Terminal {
		if (this.pseudoTerminal && !this.pseudoTerminal.exitStatus) {
			return this.pseudoTerminal;
		}

		this.isReady = false;
		this.pendingWrites = [];

		const pty: vscode.Pseudoterminal = {
			onDidWrite: this.writeEmitter.event,

			open: () => {
				this.isReady = true;
				this.writeEmitter.fire('\x1b[2J\x1b[3J\x1b[H');
				for (const text of this.pendingWrites) {
					this.writeEmitter.fire(text);
				}
				this.pendingWrites = [];
			},

			close: () => {
				this.isReady = false;
			},

			handleInput: (data: string) => {
				// Ctrl+C
				if (data === '\x03') {
					this.abortController?.abort();
					this.stopLoading();
					this.writeWarning('Cancelled by user (Ctrl+C)');
				}
			},
		};

		this.pseudoTerminal = vscode.window.createTerminal({
			name: this.label,
			pty,
		});

		return this.pseudoTerminal;
	}

	show(): void {
		this.getOrCreate().show(true);
	}

	private write(text = ''): void {
		const formatted = text.replace(/\n/g, '\r\n');

		if (!this.isReady) {
			this.pendingWrites.push(formatted);
			return;
		}

		this.writeEmitter.fire(formatted);
	}

	clear(): void {
		this.write('\x1b[2J\x1b[3J\x1b[H');
	}

	showText(texts: string[]): void {
		this.getOrCreate().show(true);
		this.clear();

		for (const text of texts) {
			this.write(`${this.C.white}${text}${this.C.reset}\n`);
		}
	}

	writeTitle(text: string): void {
		this.write(`\n\u001b[3m\u001b[38;2;220;120;255m${text}\u001b[0m\n`);
	}

	writeSuccess(text: string): void {
		const { bold, success, white, reset } = this.C;
		this.write(`${bold}${success}✔${reset} ${white}${text}${reset}\n`);
	}

	writeError(text: string): void {
		const { bold, error, reset } = this.C;
		this.write(`${bold}${error}✖${reset} ${error}${text}${reset}\n`);
	}

	writeWarning(text: string): void {
		const { bold, warning, reset } = this.C;
		this.write(`${bold}${warning}⚠${reset} ${warning}${text}${reset}\n`);
	}

	writeInfo(text: string): void {
		const { bold, info, reset } = this.C;

		this.write(`${bold}${info}ℹ${reset} ${info}${text}${reset}\n`);
	}

	private loadingInterval?: NodeJS.Timeout;

	private readonly SPINNER_FRAMES = [
		'⠋',
		'⠙',
		'⠹',
		'⠸',
		'⠼',
		'⠴',
		'⠦',
		'⠧',
		'⠇',
		'⠏',
	];

	private readonly SPINNER_COLORS = [
		'\x1b[38;5;81m', // sky blue
		'\x1b[38;5;171m', // purple
		'\x1b[38;5;82m', // lime
		'\x1b[38;5;220m', // amber
		'\x1b[38;5;203m', // coral
	];

	startLoading(message = 'Loading…'): void {
		this.stopLoading();
		this.getOrCreate().show(true);

		let frame = 0;

		this.loadingInterval = setInterval(() => {
			const spinner = this.SPINNER_FRAMES[frame % this.SPINNER_FRAMES.length];
			const spinnerColor =
				this.SPINNER_COLORS[frame % this.SPINNER_COLORS.length];

			this.writeEmitter.fire(
				`\r${spinnerColor}${this.C.bold}${spinner}${this.C.reset} ${this.C.white}${message}${this.C.reset}  ${this.C.muted}ctrl+c to cancel${this.C.reset}   `,
			);

			frame++;
		}, 80);
	}

	stopLoading(): void {
		if (this.loadingInterval) {
			clearInterval(this.loadingInterval);
			this.loadingInterval = undefined;
			this.writeEmitter.fire('\r\x1b[2K');
		}
	}

	async asyncFunction({
		options,
	}: {
		options: AsyncFunctionOptions;
	}): Promise<void> {
		const { title, func, labelLoading, msgSuccess, msgError } = options;

		this.getOrCreate().show(true);

		if (title) {
			this.writeTitle(title);
		}

		this.startLoading(labelLoading);

		try {
			await func();

			this.stopLoading();
			this.writeSuccess(msgSuccess ?? 'Done!');
		} catch (error) {
			this.stopLoading();

			if (msgError) {
				this.writeError(msgError);
			}

			this.writeError(`${error}`);
		}
	}

	async multiAsyncFunction({
		funcs,
		msgSuccess,
		stopOnError = true,
	}: {
		funcs: MultiAsyncFunctionOptions[];
		msgSuccess?: string;
		stopOnError?: boolean;
	}): Promise<void> {
		this.getOrCreate().show(true);
		this.abortController = new AbortController();
		let hasError = false;
		let currentIndex = 0;

		for (const option of funcs) {
			if (this.abortController.signal.aborted) {
				break;
			}

			const txtLoading = option.labelLoading ?? `Loading ${option.label}…`;
			const txtSuccess = option.msgSuccess ?? `Done ${option.label}`;

			this.startLoading(txtLoading);

			try {
				const result = await option.funcs(this.abortController.signal);

				this.stopLoading();

				if (this.abortController.signal.aborted) {
					break;
				}

				const successMsg = typeof result === 'string' ? result : txtSuccess;
				this.writeSuccess(successMsg);
				currentIndex++;
			} catch (error) {
				this.stopLoading();

				if (this.abortController.signal.aborted) {
					break;
				}
        const isInstanceError=error instanceof Error;

				const txtError = option.msgError ?? `Error ${option.label}: ${isInstanceError?error.message:error}`;
				this.writeError(txtError);
				hasError = true;
				currentIndex++;

				if (option.stopOnError ?? stopOnError) {
					break;
				}
			}
		}

		if (this.abortController.signal.aborted) {
			const skipped = funcs.slice(currentIndex);

			skipped.forEach((opt) => {
				this.write(`${this.C.muted}  Skipped ${opt.label}${this.C.reset}\n`);
			});
			return;
		}

		if (!hasError) {
			this.writeSuccess(msgSuccess ?? 'Done!');
		} else {
			this.writeError('Completed with errors.');
		}
	}

	writeInstruction(label: string, instructions: string[]): void {
		const { muted, bold, white, reset, info, title } = this.C;
		const divider = `${muted}${'─'.repeat(45)}${reset}`;

		this.write('\n');
		this.write(`${divider}\n`);
		this.write(`${bold}${title} ${label}${reset}\n`);
		this.write(`${divider}\n`);
		this.write('\n');

		for (const line of instructions) {
			// Baris code (indent dengan spasi)
			if (line.startsWith('   ')) {
				this.write(`${info}${line}${reset}\n`);
			} else if (line === '') {
				this.write('\n');
			} else {
				this.write(`${white}${line}${reset}\n`);
			}
		}

		this.write('\n');
	}

	dispose(): void {
		this.stopLoading();
		this.pseudoTerminal?.dispose();
		this.pseudoTerminal = undefined;
	}
}
