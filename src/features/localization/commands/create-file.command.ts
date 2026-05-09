import FileUtils from '@common/utils/file.utils';
import * as vscode from 'vscode';


export async function createLocalizationFiles(languages: string[]): Promise<void> {
	if (languages.length === 0) {
		return;
	}

	const results = await Promise.allSettled(
		languages.map((lang) =>
			FileUtils.createFile(
				`/assets/translations/${lang}.json`,
				`${lang} is already defined`,
			),
		),
	);

	const failed = results
		.map((r, i) => (r.status === 'rejected' ? languages[i] : null))
		.filter(Boolean);

	if (failed.length > 0) {
		vscode.window.showWarningMessage(
			`Failed to create files for: ${failed.join(', ')}`,
		);
	}
}
