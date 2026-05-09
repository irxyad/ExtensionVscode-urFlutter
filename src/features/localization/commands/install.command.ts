import * as vscode from 'vscode';
import { createLocalizationFiles } from './create-file.command';

export async function installLocalization() {
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
		placeHolder: 'Example: en,id,ja,en_US',
		prompt: 'Enter multiple language codes separated by commas',
		ignoreFocusOut: true,
		validateInput: (value) => {
			if (!value.trim()) {
				return 'Language codes cannot be empty';
			}

			const codes = value.split(',').map((v) => v.trim());
			const invalid = codes.filter((c) => !/^[a-z]{2}(_[A-Z]{2})?$/.test(c));
			if (invalid.length > 0) {
				return `Invalid codes: ${invalid.join(', ')}`;
			}

			return null;
		},
	});

	if (!input) {
		return;
	}

	const codes = input.split(',').map((v) => {
		const trimmed = v.trim();
		const [lang, country] = trimmed.split('_');
		return country
			? `${lang.toLowerCase()}_${country.toUpperCase()}`
			: lang.toLowerCase();
	});

	vscode.window.showInformationMessage(`Adding languages: ${codes.join(', ')}`);
	await createLocalizationFiles(codes);
}
