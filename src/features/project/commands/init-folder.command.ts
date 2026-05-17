import FileUtils from '@common/utils/file.utils';
import FlutterUtils from '@common/utils/flutter.utils';
import ProjectUtils from '@common/utils/project.utils';
import PubspecUtils from '@common/utils/pubspec.utils';
import { VscodeMessage } from '@common/utils/vscode-message.utils';
import { execScriptLauncherDev } from '@features/generate/commands/launcher-icon.command';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
import { ProjectConstant } from '../project.constants';

export const initFolder = async () => {
	const terminal = new TerminalService('Init Folder Flutter');

	const choice = await vscode.window.showInformationMessage(
		"[Auto Initialize Folder] You're about to change the project folder. Continue?",
		'Yes',
		'Cancel',
	);

	if (choice !== 'Yes') {
		return;
	}

	await _generate(terminal);
};

const _generate = async (terminal: TerminalService) => {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Init:',
			cancellable: true,
		},
		async (progress) => {
			try {
				progress.report({ increment: 10, message: 'Copying template...' });
				await copyingData();

				progress.report({ increment: 30, message: 'Installing packages...' });
				await PubspecUtils.installPackages(terminal, ProjectConstant.Packages);
				await PubspecUtils.installDevPackages(
					terminal,
					ProjectConstant.DevPackages,
				);
				await PubspecUtils.addAssets(ProjectConstant.DevPackages);

				progress.report({
					increment: 30,
					message: 'Add Flavors in build.gradle.kts...',
				});
				await updateBuildGradleKts();

				progress.report({ increment: 20, message: 'Applying tweaks...' });
				await doSomeTweaks(terminal);

				progress.report({ increment: 10, message: 'Initialization complete.' });
			} catch (error) {
				VscodeMessage.error(error, 'Error initializing folder');
			}
		},
	);
};

async function copyingData(): Promise<void> {
	await ProjectUtils.copyTemplate({
		sourceFolder: 'templates/',
		destFolder: '\\',
	});
}

async function updateBuildGradleKts(): Promise<void> {
	const [uri] = await vscode.workspace.findFiles(
		'android/app/build.gradle.kts',
	);
	if (!uri) {
		VscodeMessage.error('File build.gradle.kts not found.');
		return;
	}

	const projectName = await FlutterUtils.getProjectName();
	const contentBuildGradle = await FileUtils.read(uri);

	const keystoreImport = `
import java.util.Properties
import java.io.FileInputStream

val keystoreProperties = Properties()
// Add your [key.properties] in android/
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
  `;

	if (!contentBuildGradle.includes(keystoreImport.trim())) {
		const pluginsLine = await FileUtils.findLine(uri, 'plugins');
		if (pluginsLine !== null) {
			await FileUtils.edit({
				filePath: vscode.workspace.asRelativePath(uri),
				insertAt: {
					text: keystoreImport,
					line: pluginsLine + 1,
				},
			});
		}
	}

	const flavorsBlock = `
  signingConfigs {
        create("release") {
            if (System.getenv("ANDROID_KEYSTORE_PATH") != null) {
                storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH")!!)
                keyAlias = System.getenv("ANDROID_KEYSTORE_ALIAS")
                keyPassword = System.getenv("ANDROID_KEYSTORE_PRIVATE_KEY_PASSWORD")
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            } else {
                keyAlias = keystoreProperties["keyAlias"] as String?
                keyPassword = keystoreProperties["keyPassword"] as String?
                storeFile = keystoreProperties["storeFile"]?.let { file(it as String) }
                storePassword = keystoreProperties["storePassword"] as String?
            }
        }
    }

    flavorDimensions += "default"
    productFlavors {
        create("production") {
            dimension = "default"
            applicationIdSuffix = ""
            manifestPlaceholders["appName"] = "${projectName}"
        }
        create("staging") {
            dimension = "default"
            applicationIdSuffix = ".stg"
            manifestPlaceholders["appName"] = "[STG] ${projectName}"
        }
        create("development") {
            dimension = "default"
            applicationIdSuffix = ".dev"
            manifestPlaceholders["appName"] = "[DEV] ${projectName}"
        }
    }
  `;

	if (!contentBuildGradle.includes(flavorsBlock.trim())) {
		const buildTypesLine = await FileUtils.findLine(uri, 'buildTypes {');

		if (buildTypesLine !== null) {
			await FileUtils.edit({
				filePath: vscode.workspace.asRelativePath(uri),
				insertAt: {
					text: flavorsBlock,
					line: buildTypesLine + 1,
				},
			});
		}
	}
}

async function doSomeTweaks(terminal: TerminalService): Promise<void> {
	const projectName = await FlutterUtils.getProjectName();

	const filesToDelete = ['lib/main.dart', 'test/widget_test.dart'];

	await Promise.all(
		filesToDelete.map(async (pattern) => {
			const [file] = await vscode.workspace.findFiles(pattern);
			if (file) {
				await vscode.workspace.fs.delete(file, { useTrash: true });
			}
		}),
	);

	if (projectName) {
		const [appConstants] = await vscode.workspace.findFiles(
			'lib/core/constants/app_constants.dart',
		);
		if (appConstants) {
			await FileUtils.updateLine({
				filePath: vscode.workspace.asRelativePath(appConstants),
				keyword: 'appName',
				newText: `  static const appName = "${projectName}";`,
			});
		}

		const [titleApp] = await vscode.workspace.findFiles(
			'lib/app/view/app.dart',
		);
		if (titleApp) {
			await FileUtils.updateLine({
				filePath: vscode.workspace.asRelativePath(titleApp),
				keyword: 'title',
				newText: `            title: "${projectName}",`,
			});
		}
	}

	await FileUtils.delete('flutter_launcher_icons.yaml');
	await execScriptLauncherDev(terminal);
}
