import DartUtils from '@common/utils/dart.utils';
import FileUtils from '@common/utils/file.utils';
import * as vscode from 'vscode';

const infoChannel = vscode.window.createOutputChannel('Generate Info');

const _generate = async (classModel: string, uri: vscode.Uri) => {
  const nameModel = DartUtils.getNameClass(classModel.split('\n')[0]);

  if (!nameModel) {
    vscode.window.showErrorMessage('Could not determine model name.');
    return;
  }

  const params = DartUtils.parseConstructorParams(classModel);
  if (params.length === 0) {
    vscode.window.showWarningMessage(
      `No constructor params found in "${nameModel}", skipping.`
    );
    return;
  }

  const entity = DartUtils.changeNameModelToNameEntity(nameModel);

  const indent = '        ';
  const fromLines = params.map((p) => `${indent}${p.name}: entity.${p.name},`).join('\n');
  const toLines = params.map((p) => `${indent}${p.name}: ${p.name},`).join('\n');

  const generatedText = `
  factory ${nameModel}.fromEntity(${entity} entity) =>
      ${nameModel}(
${fromLines}
      );

  ${entity} toEntity() =>
      ${entity}(
${toLines}
      );
`;

  await DartUtils.insertTextInClass(uri, generatedText, nameModel);
};

const infoMessage = [
  '[ AUTO DISMISS ACTION DIALOG IN 10s ]',
  '',
  'Generation supports:',
  '1. With or without "final" / "required" prefix',
  '2. With or without "Model" suffix — entity name auto-derived',
  '3. Nested classes — each class processed separately',
  '',
].join('\n');

export const generateFromToEntity = vscode.commands.registerCommand(
  'extension.generateFromToEntity',
  async (uri: vscode.Uri) => {
    try {
      const classModels = DartUtils.extractAllClass(await FileUtils.read(uri));

      if (!classModels?.length) {
        vscode.window.showErrorMessage('No class found.');
        return;
      }

      infoChannel.clear();
      infoChannel.appendLine(infoMessage);
      infoChannel.show(true);

      const choice = await vscode.window.showInformationMessage(
        `Found ${classModels.length} class(es). Continue with generation?`,
        'Yes',
        'Cancel'
      );

      if (choice !== 'Yes') {return;}

      for (const cls of classModels) {
        await _generate(cls, uri);
      }

      vscode.window.showInformationMessage('Generation complete.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Generation failed: ${msg}`);
    }
  }
);
