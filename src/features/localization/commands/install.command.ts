import {
  SidebarMenu,
  getSidebarData,
} from '@common/constants/menus/sidebar-menu.constants';
import ProjectPath from '@common/constants/project-path.constants';
import FileUtils from '@common/utils/file.utils';
import PubspecUtils from '@common/utils/pubspec.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import * as vscode from 'vscode';
import { createLocalizationFiles } from '../create-files.utils';

export async function installOrAddLocalization(isInstalling: boolean) {
	if (!isInstalling) {
		// Kita cek dlu sebelum add Locale
		const { isExists: hasFolderTranslation } = await FileUtils.isExists(
			ProjectPath.localization.jsonFolder,
		);

		const hasPackageLocalization =
			await PubspecUtils.isPackageInstalled('easy_localization');
		const isLocalizationSetup = hasPackageLocalization && hasFolderTranslation;

		if (!isLocalizationSetup) {
			const sidebarLocalization = SidebarMenu.Localization.Install;
			const sidebarLocalName = getSidebarData(sidebarLocalization);

			VscodeMessage.error(
				`Localization is not set up yet. Please run "${sidebarLocalName?.title}" first.`,
			);

			return;
		}
	}

	vscode.window
		.showInformationMessage(
			'You can see valid language codes (ISO 639-1) for easy_localization',
			'See Codes',
		)
		.then((val) => {
			if (val === 'See Codes') {
				vscode.env.openExternal(
					vscode.Uri.parse(
						'https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes',
					),
				);
			}
		});

	const input = await vscode.window.showInputBox({
		title: 'Add Localization Languages',
		placeHolder: 'Example: en-US, id-ID, ja-JP',
		prompt:
			'Enter multiple language codes separated by commas (format: lang-COUNTRY)',
		ignoreFocusOut: true,
		validateInput: (value) => {
			if (!value.trim()) {
				return 'Language codes cannot be empty';
			}

			const codes = value.split(',').map((v) => v.trim());

			const invalid = codes.filter((c) => !/^[a-z]{2}-[A-Z]{2}$/.test(c));
			if (invalid.length > 0) {
				return `Invalid codes: ${invalid.join(', ')} — format must be: en-US, id-ID`;
			}

			return null;
		},
	});

	if (!input) {
		return;
	}

	const codes = input.split(',').map((v) => {
		const [lang, country] = v.trim().split('-');
		return `${lang.toLowerCase()}-${country.toUpperCase()}`;
	});

	await createLocalizationFiles(isInstalling, codes);
}
