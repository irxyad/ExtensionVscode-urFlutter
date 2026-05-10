import FileUtils from '@common/utils/file.utils';
import FlutterUtils from '@common/utils/flutter.utils';
import { logger } from '@common/utils/logger.utils';
import PubspecUtils from '@common/utils/pubspec.utils';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';

const JSON_LOCALIZATION_PATH = 'assets/translations';
const APP_LOCALIZATION_PATH = 'lib/core/constants/app_localizations.dart';

export async function createLocalizationFiles(
	languages: string[],
): Promise<void> {
	const terminal = new TerminalService('Install Localization');

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Install Localization',
			cancellable: true,
		},
		async (progress, token) => {
			token.onCancellationRequested(() => {
				vscode.window.showWarningMessage(
					'Localization installation cancelled.',
				);
			});

			try {
				if (token.isCancellationRequested) {
					return;
				}

				if (languages.length === 0) {
					vscode.window.showInformationMessage(
						'No languages selected for localization.',
					);
					return;
				}

				progress.report({ message: 'Creating files...' });
				const results = await Promise.all(
					languages.map((lang) =>
						FileUtils.createFile({
							filename: `${JSON_LOCALIZATION_PATH}/${lang}.json`,
							data: '{}',
						}),
					),
				);

				const getLocaleName = (filename: string) => {
					const parts = filename.split('/');
					return parts.last.replace('.json', '');
				};

				const existingFiles = results
					.filter((r) => r && r.isExists)
					.map((r) => getLocaleName(r!.filename));

				const createdFiles = results
					.filter((r) => r && !r.isExists)
					.map((r) => getLocaleName(r!.filename));

				if (existingFiles.length === results.length) {
					vscode.window.showErrorMessage(
						`Locale (${existingFiles.join(', ')}) already exist. Aborted!`,
					);
					return;
				}

				if (existingFiles.length > 0) {
					vscode.window.showWarningMessage(
						`Already exists: (${existingFiles.join(', ')}). Skipped!`,
					);
				}

				if (createdFiles.length > 0) {
					vscode.window.showInformationMessage(
						`Created: ${createdFiles.join(', ')}`,
					);
				}

				progress.report({ message: 'Adding package easy_localization...' });
				await PubspecUtils.installPackages(terminal, ['easy_localization']);

				progress.report({ message: 'Adding translations in pubspec.yaml...' });
				await PubspecUtils.addAssets([`${JSON_LOCALIZATION_PATH}/`]);

				progress.report({ message: 'Formatting pubspec.yaml...' });
				await PubspecUtils.formatPubspec();

				progress.report({ message: 'Configuring app...' });
				await configurationApp(createdFiles);

				vscode.window.showInformationMessage(
					'Localization installed & configured!',
				);
			} catch (err) {
				if (!token.isCancellationRequested) {
					vscode.window.showErrorMessage(`Localization setup failed: ${err}`);
				}
			}
		},
	);
}

async function showInstructionToWrap() {
	const projectName = await FlutterUtils.getFlutterProjectName();
	const importPath = `package:${projectName}/${APP_LOCALIZATION_PATH}`;

	const instructions = [
		'1. Add this import to your main.dart:',
		'',
		`   import 'package:easy_localization/easy_localization.dart';`,
		`   import '${importPath}';`,
		'',
		'2. Wrap your root widget with EasyLocalization:',
		'',
		'   EasyLocalization(',
		'     supportedLocales: const [',
		'       AppLocalizations.idLocale,',
		'       AppLocalizations.enLocale,',
		'     ],',
		'     path: AppLocalizations.path,',
		'     fallbackLocale: AppLocalizations.enLocale,',
		'     child: const MyApp(),',
		'   )',
		'',
		'3. Add locale in MaterialApp:',
		'',
		'   MaterialApp(',
		'     localizationsDelegates: context.localizationDelegates,',
		'     supportedLocales: context.supportedLocales,',
		'     locale: context.locale,',
		'   )',
	];

	logger.instruction('Localization Setup', instructions);
}

async function configurationApp(newLocales: string[]) {
	// Inject import dan EasyLocalization.ensureInitialized
	try {
		await injectToMain();
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to inject to main: ${error}`);
		logger.error('Error Inject to main:', error);
		return;
	}

	// Membuat file app_localizations
	try {
		await createFileAppLocalization(newLocales);
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to create app_localizations: ${error}`,
		);
		logger.error('Error Inject to main:', error);
		return;
	}

	// Show instruksi untuk wrap manual di root widget
	showInstructionToWrap();
}

async function injectToMain() {
	const injectText = 'await EasyLocalization.ensureInitialized();';

	const success = await FlutterUtils.insertIntoMain({
		label: 'Localization Setup',
		detectKeyword: 'EasyLocalization.ensureInitialized',
		insertText: injectText,
		afterKeyword: 'WidgetsFlutterBinding.ensureInitialized',
		prependText: '  WidgetsFlutterBinding.ensureInitialized();',
		instructions: [injectText],
	});

	if (!success) {
		return;
	}

	// Kemudian kita inject imports nya
	await FlutterUtils.insertImportsIntoMain('Localization Setup', {
		imports: ["import 'package:easy_localization/easy_localization.dart';"],
	});
}

function generateLocale(localeFiles: string[]): string {
	return localeFiles
		.map((localeFile) => {
			const [lang, countryCode] = localeFile.split('.')[0].split('-');

			const cc = countryCode.toLowerCase();
			const isSameCC = lang === cc;
			const varName = isSameCC ? lang : `${lang}${cc.firstUppercase}`;

			return `  static const Locale ${varName}Locale = Locale('${lang}', '${countryCode ?? ''}');`;
		})
		.join('\n');
}

async function createFileAppLocalization(newLocales: string[]) {
	if (newLocales.isEmpty) {
		vscode.window.showInformationMessage('No localization files found.');
		return;
	}

	const appLocalizationContent = [
		"import 'package:flutter/material.dart';",
		'',
		'class AppLocalizations {',
		generateLocale(newLocales),
		'',
		`  static const path = '${JSON_LOCALIZATION_PATH}';`,
		'}',
	].join('\n');

	const fileResult = await FileUtils.isExistsFile(APP_LOCALIZATION_PATH);

	if (fileResult.isExists) {
		vscode.window.showInformationMessage('Update Applocalization...');

		await FileUtils.editFile({
			filePath: APP_LOCALIZATION_PATH,
			insertAt: {
				text: generateLocale(newLocales),
				line: {
					afterKeyword: 'static const Locale',
					last: true,
				},
			},
		});

		return;
	}

	await FileUtils.createFile({
		filename: APP_LOCALIZATION_PATH,
		data: appLocalizationContent,
	});
}
