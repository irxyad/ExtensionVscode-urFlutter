import { appContext } from '@common/app-context';
import FileUtils from '@common/utils/file.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import * as vscode from 'vscode';
import { ScrcpyConstant } from './scrcpy.constants';

const DEFAULT_SCRCPY_PARAMS =
	'scrcpy --max-size 1080 --video-bit-rate 16M --audio-bit-rate 128K --max-fps 60 --stay-awake --turn-screen-off';

function getScrcpyParamsUri(): vscode.Uri {
	return vscode.Uri.joinPath(
		appContext.storage.uri,
		ScrcpyConstant.CustomParamFilename,
	);
}

export async function getScrcpyParams(): Promise<string> {
	try {
		const data = await FileUtils.read(getScrcpyParamsUri());
		return data.replace(/"/g, '').trim();
	} catch {
		return '';
	}
}

export async function editCustomParams(): Promise<void> {
	const fileUri = getScrcpyParamsUri();

	// Inisialisasi file jika belum ada
	const currentParams = await getScrcpyParams();
	if (!currentParams) {
		await appContext.storage.writeFile({
			content: DEFAULT_SCRCPY_PARAMS,
			filename: ScrcpyConstant.CustomParamFilename,
		});
	}

	const newParams = await vscode.window.showInputBox({
		title: 'Add your new Scrcpy Params',
		value: currentParams || DEFAULT_SCRCPY_PARAMS,
		placeHolder: '--max-size 1080 --bit-rate 8M --fullscreen',
		ignoreFocusOut: true,
	});

	if (!newParams) {
		vscode.window.showWarningMessage('No parameters entered. Aborted.');
		return;
	}

	try {
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(`"${newParams}"`));
		vscode.window.showInformationMessage('Scrcpy parameters updated.');
	} catch (err: unknown) {
		VscodeMessage.error(err, 'Failed to save scrcpy params');
	}
}
