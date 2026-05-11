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
						FileUtils.create({
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

				progress.report({ message: 'Adding package easy_localization...' });
				await PubspecUtils.installPackages(terminal, ['easy_localization']);

				progress.report({ message: 'Adding translations in pubspec.yaml...' });
				await PubspecUtils.addAssets([`${JSON_LOCALIZATION_PATH}/`]);

				progress.report({ message: 'Formatting pubspec.yaml...' });
				await PubspecUtils.format();

				progress.report({ message: 'Configuring app...' });
				const isInit = !(await FileUtils.isExists(APP_LOCALIZATION_PATH))
					.isExists;

				if (isInit) {
					const allFiles = await FileUtils.getFiles(JSON_LOCALIZATION_PATH);

					const allLocales = allFiles.map((f) => getLocaleName(f));
					if (allLocales.length > 0) {
						await configurationApp(true, allLocales);

						vscode.window.showInformationMessage(
							`Created: ${allLocales.join(', ')}`,
						);
					}
				} else {
					const createdFiles = results
						.filter((r) => r && !r.isExists)
						.map((r) => getLocaleName(r!.filename));

					if (createdFiles.length > 0) {
						await configurationApp(false, createdFiles);

						vscode.window.showInformationMessage(
							`Created: ${createdFiles.join(', ')}`,
						);
					}
				}

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
	const projectName = await FlutterUtils.getProjectName();
	const importPath = `package:${projectName.rawName}/${APP_LOCALIZATION_PATH.split('/').slice(1).join('/')}`;

	const instructions = [
		'If not yet added, add this import to your main.dart:',
		'',
		`   import 'package:easy_localization/easy_localization.dart';`,
		'',
		'Add this inside main() after WidgetsFlutterBinding.ensureInitialized():',
		'',
		'   await EasyLocalization.ensureInitialized();',
		'',
		'Wrap your root widget with EasyLocalization and add locale in MaterialApp:',
		'',
		`   import '${importPath}';`,
		'',
		'   EasyLocalization(',
		'     supportedLocales: AppLocalizations.supportedLocales,',
		'     path: AppLocalizations.path,',
		'     fallbackLocale: AppLocalizations.supportedLocales.first,',
		'     child: MaterialApp(',
		'       localizationsDelegates: context.localizationDelegates,',
		'       supportedLocales: context.supportedLocales,',
		'       locale: context.locale,',
		'     ),',
		'   )',
	];

	logger.instruction('Localization Setup', instructions);
}

async function configurationApp(isInit: boolean, locales: string[]) {
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
		await createAppLocalization(isInit, locales);
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to create app_localizations: ${error}`,
		);
		logger.error('Error Inject to main:', error);
		return;
	}

	// Show instruksi jika pertama kali install
	if (isInit) {
		showInstructionToWrap();
	}
}

async function injectToMain() {
	await FlutterUtils.insertIntoMain({
		label: 'Localization Setup',
		detectKeyword: 'EasyLocalization.ensureInitialized',
		insertText: 'await EasyLocalization.ensureInitialized();',
		afterKeyword: 'WidgetsFlutterBinding.ensureInitialized',
		prependText: '  WidgetsFlutterBinding.ensureInitialized();',
	});

	// Kemudian kita inject imports nya
	await FlutterUtils.insertImportsIntoMain('Localization Setup', {
		imports: ["import 'package:easy_localization/easy_localization.dart';"],
	});
}

function generateNameLocale(localeFile: string) {
	const [lang, countryCode] = localeFile.split('.')[0].split('-');

	const cc = countryCode.toLowerCase();
	const isSameCC = lang === cc;
	const varName = isSameCC ? lang : `${lang}${cc.firstUppercase}`;

	return `${varName}Locale`;
}

function generateLocale(localeFiles: string[]): string {
	return localeFiles
		.map((localeFile) => {
			const [lang, countryCode] = localeFile.split('.')[0].split('-');

			const varName = generateNameLocale(localeFile);

			return `  static const Locale ${varName} = Locale('${lang}', '${countryCode ?? ''}');`;
		})
		.join('\n');
}

// function generateSupportedLocales(newLocales: string[]) {
// 	const txt = [
// 		`  static const List<Locale> supportedLocales = [`,
// 		newLocales
// 			.map((locale) => {
// 				return generateNameLocale(locale);
// 			})
// 			.join(',\n'),
// 		'  ];',
// 	];

// 	return txt;
// }

function generateSupportedLocales(newLocales: string[]) {
	return newLocales
		.map((locale) => {
			return generateNameLocale(locale);
		})
		.join(',\n');
}

async function createAppLocalization(isInit: boolean, locales: string[]) {
	if (locales.isEmpty) {
		vscode.window.showInformationMessage('No localization files found.');
		return;
	}

	const appLocalizationContent = [
		'// GENERATED CODE - DO NOT MODIFY BY HAND',
		'',
		"import 'package:flutter/material.dart';",
		'',
		'class AppLocalizations {',
		generateLocale(locales),
		'',
		`  static const List<Locale> supportedLocales = [`,
		generateSupportedLocales(locales),
		'// DO NOT REMOVE THIS LINE, IT IS USED FOR FLAG',
		'  ];',
		'',
		`  static const path = '${JSON_LOCALIZATION_PATH}';`,
		'}',
	].join('\n');

	if (!isInit) {
		await FileUtils.edit({
			filePath: APP_LOCALIZATION_PATH,
			insertAt: {
				text: generateLocale(locales),
				line: {
					afterKeyword: 'static const Locale',
					last: true,
				},
			},
		});
		// Update supportedLocales list
		// await FileUtils.updateLine({
		// 	filePath: APP_LOCALIZATION_PATH,
		// 	keyword: ['static const List<Locale> supportedLocales = [', '['],
		// 	endKeyword: '];',
		// 	newText: generateSupportedLocales([...oldLocales, ...newLocales]).join(
		// 		'\n',
		// 	),
		// });

		// Update supportedLocales
		await FileUtils.edit({
			filePath: APP_LOCALIZATION_PATH,
			insertAt: {
				text: generateSupportedLocales(locales),
				line: {
					afterKeyword: ['Locale,'],
					last: true,
				},
			},
		});

		return;
	}

	await FileUtils.create({
		filename: APP_LOCALIZATION_PATH,
		data: appLocalizationContent,
	});

	// kita format
	await FlutterUtils.dartFormat(APP_LOCALIZATION_PATH, 0);
}
