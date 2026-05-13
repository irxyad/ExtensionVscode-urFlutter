import { AppError } from '@common/error/app.error';
import FileUtils, { CreateResult } from '@common/utils/file.utils';
import FlutterUtils from '@common/utils/flutter.utils';
import { logger } from '@common/utils/logger.utils';
import PubspecUtils from '@common/utils/pubspec.utils';
import { PseudoTerminalService } from '@services/pseudo-terminal.service';
import { TerminalService } from '@services/terminal.service';

const JSON_LOCALIZATION_PATH = 'assets/translations';
const APP_LOCALIZATION_PATH = 'lib/core/constants/app_localizations.dart';

const getLocaleName = (filename: string): string =>
	filename.split('/').last.replace('.json', '');

export async function createLocalizationFiles(
	languages: string[],
): Promise<void> {
	const title = 'Install Localization';
	const terminal = new TerminalService(title);
	const pseudo = new PseudoTerminalService(title);

	pseudo.show();
	pseudo.writeTitle(title);

	if (languages.length === 0) {
		pseudo.writeError('No languages selected for localization.');
		return;
	}

	const results = await Promise.all(
		languages.map((lang) =>
			FileUtils.create({
				filename: `${JSON_LOCALIZATION_PATH}/${lang}.json`,
				data: '{}',
			}),
		),
	);

	const existingFiles = results
		.filter((r) => r?.isExists)
		.map((r) => getLocaleName(r!.filename));

	if (existingFiles.length === results.length) {
		pseudo.writeError(
			`Locale (${existingFiles.join(', ')}) already exist. Aborted!`,
		);
		return;
	}

	if (existingFiles.length > 0) {
		pseudo.writeWarning(
			`Already exists: (${existingFiles.join(', ')}). Skipped!`,
		);
	}

	pseudo.writeSuccess(
		`Created locale json: (${results.map((r) => getLocaleName(r!.filename)).join(', ')})`,
	);

	await pseudo.multiAsyncFunction({
		msgSuccess: 'Localization installed & configured!',
		funcs: [
			{
				label: 'Adding package easy_localization',
				funcs: (signal) =>
					PubspecUtils.installPackages(terminal, ['easy_localization'], signal),
			},
			{
				label: 'Adding translations in pubspec.yaml',
				funcs: () => PubspecUtils.addAssets([`${JSON_LOCALIZATION_PATH}/`]),
			},
			{
				label: 'Formatting pubspec.yaml',
				funcs: () => PubspecUtils.format(),
			},
			{
				label: 'Configuring app',
				funcs: () => configureLocalizationStep(pseudo, results, getLocaleName),
			},
		],
	});
}

// Extract
async function configureLocalizationStep(
	pseudo: PseudoTerminalService,
	results: CreateResult[],
	getLocaleName: (f: string) => string,
): Promise<string | void> {
	const isInit = !(await FileUtils.isExists(APP_LOCALIZATION_PATH)).isExists;

	if (isInit) {
		const allFiles = await FileUtils.getFiles(JSON_LOCALIZATION_PATH);
		const allLocales = allFiles.map(getLocaleName);

		if (allLocales.length > 0) {
			await configurationApp(pseudo, true, allLocales);

			return `Locales created: ${allLocales.join(', ')}`;
		}
	} else {
		const createdFiles = results
			.filter((r) => r && !r.isExists)
			.map((r) => getLocaleName(r!.filename));

		if (createdFiles.length > 0) {
			await configurationApp(pseudo, false, createdFiles);

			return `Locales created: ${createdFiles.join(', ')}`;
		}
	}
}

async function configurationApp(
	pseudo: PseudoTerminalService,
	isInit: boolean,
	locales: string[],
) {
	// Inject import dan EasyLocalization.ensureInitialized
	try {
		await injectToMain();
	} catch (error) {
		logger.error('Error Inject to main:', error);

		throw new AppError(`Failed to inject to main:`, error);
	}

	// Membuat file app_localizations
	try {
		await createAppLocalization(isInit, locales);
	} catch (error) {
		logger.error('Error Inject to main:', error);

		throw new AppError(`Failed to create app_localizations:`, error);
	}

	// Show instruksi jika pertama kali install
	if (isInit) {
		showInstructionToWrap(pseudo);
	}
}

async function showInstructionToWrap(pseudo: PseudoTerminalService) {
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

	pseudo.writeInstruction('Localization Setup', instructions);
}

async function injectToMain() {
	await FlutterUtils.insertIntoMain({
		label: 'Localization Setup',
		detectKeyword: 'EasyLocalization.ensureInitialized',
		insertText: 'await EasyLocalization.ensureInitialized();',
		afterKeyword: ['WidgetsFlutterBinding.ensureInitialized', 'main('],
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
		return 'No localization files found.';
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
