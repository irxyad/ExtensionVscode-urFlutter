import ProjectPath from '@common/constants/project-path.constants';
import { AppError } from '@common/error/app.error';
import FileUtils from '@common/utils/file.utils';
import FlutterUtils from '@common/utils/flutter.utils';
import PubspecUtils from '@common/utils/pubspec.utils';
import { PseudoTerminalService } from '@services/pseudo-terminal.service';
import { TerminalService } from '@services/terminal.service';

const JSON_LOCALIZATION_PATH = ProjectPath.localization.jsonFolder;
const APP_LOCALIZATION_PATH = ProjectPath.localization.appLocalization;

const getLocaleName = (filename: string): string =>
	filename.split('/').last.replace('.json', '');

export async function createLocalizationFiles(
	isInstalling: boolean,
	languages: string[],
): Promise<void> {
	const title = isInstalling ? 'Setup Localization' : 'Add Locale';

	const terminal = new TerminalService(title);
	const pseudo = new PseudoTerminalService(title);

	pseudo.show();
	pseudo.writeTitle(title);

	if (languages.length === 0) {
		pseudo.writeError('No languages selected for localization.');
		return;
	}

	const locales = await Promise.all(
		languages.map((lang) =>
			FileUtils.create({
				filename: `${JSON_LOCALIZATION_PATH}/${lang}.json`,
				data: '{}',
			}),
		),
	);

	const existingLocales = locales
		.filter((r) => r?.isExists)
		.map((r) => getLocaleName(r!.filename));

	const newLocales = locales
		.filter((r) => !r?.isExists)
		.map((r) => getLocaleName(r!.filename));

	if (existingLocales.length === locales.length) {
		pseudo.writeError(
			`Locale (${existingLocales.join(', ')}) already exist. Aborted!`,
		);
		return;
	}

	if (existingLocales.length > 0) {
		pseudo.writeWarning(
			`Already exists: (${existingLocales.join(', ')}). Skipped!`,
		);
	}

	pseudo.writeSuccess(`Created locale json: (${newLocales.join(', ')})`);

	const valueConfigure: ConfigureLocalizationStepOptions = {
		pseudo,
		isInstalling,
		newLocales: newLocales,
		getLocaleName,
	};

	if (isInstalling) {
		await pseudo.multiAsyncFunction({
			msgSuccess: 'Localization configured!',
			funcs: [
				{
					label: 'Adding package easy_localization',
					funcs: () =>
						PubspecUtils.installPackages(terminal, ['easy_localization']),
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
					funcs: () => configureLocalizationStep(valueConfigure),
				},
			],
		});
	}
	// Ini jika add locale
	else {
		await pseudo.multiAsyncFunction({
			msgSuccess: 'New locale added!',
			funcs: [
				{
					label: 'Configuring app',
					funcs: () => configureLocalizationStep(valueConfigure),
				},
			],
		});
	}
}

interface ConfigureLocalizationStepOptions {
	pseudo: PseudoTerminalService;
	isInstalling: boolean;
	newLocales: string[];
	getLocaleName: (f: string) => string;
}

// Extract
async function configureLocalizationStep(
	opt: ConfigureLocalizationStepOptions,
): Promise<string | void> {
	const { pseudo, isInstalling, newLocales, getLocaleName } = opt;

	const hasAppLocalization = (await FileUtils.isExists(APP_LOCALIZATION_PATH))
		.isExists;

	// Kalau belum ada class AppLocalization
	// maka kita ambil semua json di folder translation buat dimasukkin
	// kalau sudah ada, maka ambil yang baru di created
	const locales = !hasAppLocalization
		? (await FileUtils.getFiles(JSON_LOCALIZATION_PATH)).map(getLocaleName)
		: newLocales;

	if (!locales.length) {
		throw new AppError('No locales found');
	}

	await configurationApp({
		hasAppLocalization,
		isInstalling,
		locales: locales,
		pseudo,
	});

	return `Locales created: ${locales.join(', ')}`;
}

interface ConfigurationAppOptions {
	pseudo: PseudoTerminalService;
	isInstalling: boolean;
	hasAppLocalization: boolean;
	locales: string[];
}

async function configurationApp(opt: ConfigurationAppOptions) {
	const { pseudo, isInstalling, hasAppLocalization, locales } = opt;

	// Inject import dan EasyLocalization.ensureInitialized jika install
	if (isInstalling) {
		try {
			await injectToMain();
		} catch (error) {
			throw new AppError(`Failed to inject to main:`, error);
		}
	}

	// Membuat file app_localizations
	try {
		await createAppLocalization(hasAppLocalization, locales);
	} catch (error) {
		throw new AppError(`Failed to create app_localizations:`, error);
	}

	// Show instruksi jika pertama kali install
	if (isInstalling) {
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

async function createAppLocalization(
	hasAppLocalization: boolean,
	locales: string[],
) {
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

	if (hasAppLocalization) {
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

	// Jika belum ada, maka kita buat
	await FileUtils.create({
		filename: APP_LOCALIZATION_PATH,
		data: appLocalizationContent,
	});

	// kita format
	await FlutterUtils.dartFormat(APP_LOCALIZATION_PATH, 0);
}
