import FileUtils from '@common/utils/file.utils';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
const parentLauncherIconsYaml = 'launcher_icons_flavors';
const filenameDevYaml = `${parentLauncherIconsYaml}/flutter_launcher_icons-dev.yaml`;
const filenameStagYaml = `${parentLauncherIconsYaml}/flutter_launcher_icons-stag.yaml`;
const filenameProdYaml = `${parentLauncherIconsYaml}/flutter_launcher_icons-prod.yaml`;
const filenameDefaultYaml = 'flutter_launcher_icons.yaml';

const outputChannel = vscode.window.createOutputChannel('Launcher Icon');

async function hasFile(filename: string): Promise<boolean> {
	return (await vscode.workspace.findFiles(filename)).length > 0;
}

async function ensureInstallLauncherIcons(
	terminal: TerminalService,
): Promise<void> {
	terminal.execute('flutter pub add flutter_launcher_icons', true);
}

export default async function buildLauncherIcon(): Promise<void> {
	const terminal = new TerminalService('Build Launcher Icon');

	const dLauncher = 'Default Launcher Icon';
	const fLauncher = 'Launcher Icon by Flavor';

	const selection = await vscode.window.showQuickPick([dLauncher, fLauncher], {
		placeHolder: 'Select launcher icon mode',
	});

	if (!selection) {
		vscode.window.showWarningMessage('Operation cancelled.');
		return;
	}

	if (selection === dLauncher) {
		await buildDefaultLauncher(terminal);
	} else {
		await buildLauncherFlavor();
	}

	terminal.dispose();
}

function showInfoMsg(): void {
	vscode.window.showInformationMessage('Launcher icon built successfully!');

	outputChannel.clear();
	outputChannel.appendLine('Launcher icons generated successfully!');
	outputChannel.appendLine(`Output folder: root/${parentLauncherIconsYaml}`);
	outputChannel.appendLine(
		'Customize launcher icon configs inside that folder.',
	);
	outputChannel.appendLine('');
	outputChannel.appendLine(
		'Now select [Generate Launcher Icon] in [Generate Options] to finish it up.',
	);
	outputChannel.show(true);
}

export async function generateLauncherIcon(): Promise<void> {
	const terminal = new TerminalService('Generate Launcher Icon');

	const options = {
		default: 'Default Launcher Icon',
		dev: 'Development Launcher Icon',
		stag: 'Staging Launcher Icon',
		prod: 'Production Launcher Icon',
	} as const;

	const selection = await vscode.window.showQuickPick(Object.values(options), {
		placeHolder: 'Select launcher icon to generate',
	});

	if (!selection) {
		vscode.window.showWarningMessage('Operation cancelled.');
		return;
	}

	switch (selection) {
		case options.default:
			await execScriptDefaultLauncher(terminal);
			break;
		case options.dev:
			await execScriptLauncherDev(terminal);
			break;
		case options.stag:
			await execScriptLauncherStag(terminal);
			break;
		case options.prod:
			await execScriptLauncherProd(terminal);
			break;
	}
}

export async function execScriptDefaultLauncher(
	terminal: TerminalService,
): Promise<void> {
	if (!(await hasFile(filenameDefaultYaml))) {
		vscode.window.showErrorMessage(`${filenameDefaultYaml} not found`);
		return;
	}
	await ensureInstallLauncherIcons(terminal);
	terminal.execute('dart run flutter_launcher_icons', true);
}

export async function execScriptLauncherDev(
	terminal: TerminalService,
): Promise<void> {
	if (!(await hasFile(filenameDevYaml))) {
		vscode.window.showErrorMessage(`${filenameDevYaml} not found`);
		return;
	}
	await ensureInstallLauncherIcons(terminal);
	terminal.execute(
		`dart run flutter_launcher_icons -f ${filenameDevYaml}`,
		true,
	);
}

export async function execScriptLauncherStag(
	terminal: TerminalService,
): Promise<void> {
	if (!(await hasFile(filenameStagYaml))) {
		vscode.window.showErrorMessage(`${filenameStagYaml} not found`);
		return;
	}
	await ensureInstallLauncherIcons(terminal);
	terminal.execute(
		`dart run flutter_launcher_icons -f ${filenameStagYaml}`,
		true,
	);
}

export async function execScriptLauncherProd(
	terminal: TerminalService,
): Promise<void> {
	if (!(await hasFile(filenameProdYaml))) {
		vscode.window.showErrorMessage(`${filenameProdYaml} not found`);
		return;
	}
	await ensureInstallLauncherIcons(terminal);
	terminal.execute(
		`dart run flutter_launcher_icons -f ${filenameProdYaml}`,
		true,
	);
}

async function copyIfMissing(
	filename: string,
	sourceFolder: string,
	destFolder: string,
): Promise<void> {
	if (!(await hasFile(filename))) {
		await FileUtils.copyTemplate({ sourceFolder, destFolder });
	}
}

async function buildDefaultLauncher(terminal: TerminalService): Promise<void> {
	await removeYamlFlavors();

	await copyIfMissing(
		'assets/img/launcher.png',
		'templates/assets/img/launcher.png',
		'\\assets/img/',
	);

	await copyIfMissing(
		filenameDefaultYaml,
		`templates/${filenameDefaultYaml}`,
		`\\${filenameDefaultYaml}`,
	);

	await execScriptDefaultLauncher(terminal);
}

async function buildLauncherFlavor(): Promise<void> {
	await removeYamlDefault();

	await copyIfMissing(
		'assets/img/launcher*.png',
		'templates/assets/img/',
		'\\assets/img/',
	);

	await Promise.all([
		copyIfMissing(
			filenameDevYaml,
			`templates/${filenameDevYaml}`,
			`\\${filenameDevYaml}`,
		),
		copyIfMissing(
			filenameStagYaml,
			`templates/${filenameStagYaml}`,
			`\\${filenameStagYaml}`,
		),
		copyIfMissing(
			filenameProdYaml,
			`templates/${filenameProdYaml}`,
			`\\${filenameProdYaml}`,
		),
	]);

	showInfoMsg();
}

async function removeYamlDefault(): Promise<void> {
	await FileUtils.deleteFile(`\\${filenameDefaultYaml}`);
}

async function removeYamlFlavors(): Promise<void> {
	await FileUtils.deleteFiles(`\\${parentLauncherIconsYaml}/*.yaml`);
}
