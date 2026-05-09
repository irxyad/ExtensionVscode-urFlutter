import { AppConstant } from '@common/constants/common.constants';
import * as vscode from 'vscode';
import FileUtils from './file.utils';
import { logger } from './logger.utils';

// Untuk dapat nama class
const getNameModel = (text: string): string | null => {
	const match = text.match(/class\s+(\w+)/);
	return match?.[1] ?? null;
};

// Untuk dapat isi constructor
function parseConstructorParams(
	classText: string,
): { type: string; name: string }[] {
	const lines = classText.split('\n');
	const className = getNameModel(lines[0]);
	if (!className) {
		return [];
	}
  logger.log(`className: ${className}`);

	// Gabungkan semua teks untuk handle multiline constructor
	const fullText = classText.replace(/\n/g, ' ');
  logger.log(`fullText: ${fullText}`);

	// Match isi constructor — support named ({}) dan positional
	const namedMatch = fullText.match(
		new RegExp(`${className}\\s*\\(\\s*\\{([^}]*)\\}`),
	);
	const positionalMatch = fullText.match(
		new RegExp(`${className}\\s*\\(([^)]*)`),
	);

  logger.log(`positionalMatch: ${positionalMatch}`);
  logger.log(`namedMatch: ${namedMatch}`);


	const rawParams = namedMatch?.[1] ?? positionalMatch?.[1] ?? '';
	if (!rawParams.trim()) {
		return [];
	}

  logger.log(`Raw Params: ${rawParams}`);

	return rawParams
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean)
		.map((param) => {
			// Buang modifier: final, required, const
			const cleaned = param
				.replace(/^(final|required|const)\s+/g, '')
				.replace(/;$/, '')
				.trim();

  logger.log(`cleaned: ${cleaned}`);


  // Match "Type name" — support generics: Map<String, int> data
  const match = cleaned.match(/^([\w<>\s,?]+?)\s+(\w+)$/);
  logger.log(`match: ${match}`);

  if (!match) {
				return null;
			}

			return { type: match[1].trim(), name: match[2].trim() };
		})
		.filter((p): p is { type: string; name: string } => p !== null);
}

const changeNameModelToNameEntity = (nameModel: string): string => {
	// Buang suffix 'Model' jika ada, lalu tambah 'Entity'
	const withoutModel = nameModel.endsWith('Model')
		? nameModel.slice(0, -'Model'.length)
		: nameModel;

	return `${withoutModel}Entity`;
};

function extractAllClass(text: string): string[] {
	const lines = text.split('\n');
	const classBlocks: string[] = [];

	// Stack untuk handle nested class
	const stack: { block: string[]; braceCount: number }[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		// Detect awal class baru (bisa nested)
		if (trimmed.match(/^class\s+\w+/)) {
			stack.push({ block: [], braceCount: 0 });
		}

		// Push line ke semua class yang sedang aktif di stack
		for (const frame of stack) {
			frame.block.push(line);
			frame.braceCount += (line.match(/{/g) || []).length;
			frame.braceCount -= (line.match(/}/g) || []).length;
		}

		// Cek dari yang paling dalam apakah sudah tutup
		while (
			stack.length > 0 &&
			stack.at(-1)!.braceCount === 0 &&
			stack.at(-1)!.block.length > 0
		) {
			const finished = stack.pop()!;
			classBlocks.push(finished.block.join('\n'));
		}
	}

	return classBlocks;
}

async function insertTextInClass(
  uri: vscode.Uri,
  addText: string,
  targetClassName: string
): Promise<{ totalLines: number }> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      cancellable: true,
      title: `${AppConstant.ExtensionName}: Inserting into class...`,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      const doc = await vscode.workspace.openTextDocument(uri);
      const edit = new vscode.WorkspaceEdit();
      const lines = doc.getText().split('\n');

      let isInTarget = false;
      let braceCount = 0;
      let insertPosition: vscode.Position | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Detect target class — ignore nested class saat sudah di dalam target
        if (!isInTarget && trimmed.match(/^class\s+\w+/)) {
          const match = trimmed.match(/^class\s+(\w+)/);
          if (match?.[1] === targetClassName) {
            isInTarget = true;
            braceCount = 0;
          }
        }

        if (isInTarget) {
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;

          // braceCount === 0 berarti closing brace target class ditemukan
          if (braceCount === 0) {
            insertPosition = new vscode.Position(i, 0);
            break;
          }
        }
      }

      if (!insertPosition) {
        vscode.window.showWarningMessage(
          `Class "${targetClassName}" not found in file.`
        );
        return { totalLines: doc.lineCount };
      }

      edit.insert(uri, insertPosition, `${addText}\n`);
      await vscode.workspace.applyEdit(edit);
      await doc.save();

      progress.report({
        increment: 100,
        message: `Inserted into "${targetClassName}".`,
      });

      return { totalLines: doc.lineCount };
    }
  );
}

async function getFlutterProjectName(): Promise<string | undefined> {
  try {
    const [pubspec] = await vscode.workspace.findFiles('pubspec.yaml');

    if (!pubspec) {
      vscode.window.showErrorMessage("Can't find pubspec.yaml");
      return;
    }

    const linesWithName = await FileUtils.readLinesWithKeyword(pubspec, 'name');

    if (!linesWithName?.length) {
      vscode.window.showErrorMessage("No 'name' field found in pubspec.yaml");
      return;
    }

    // Pastikan ambil baris "name: <value>" yang di root level (bukan dependency)
    const nameLine = linesWithName.find((line) => /^name\s*:/.test(line.trim()));
    const rawName = nameLine?.split(':')[1]?.trim();

    if (!rawName) {
      vscode.window.showErrorMessage('Invalid name format in pubspec.yaml');
      return;
    }

    // Capitalize setiap kata tanpa bergantung extension method
    const projectName = rawName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return projectName;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to read project name: ${msg}`);
  }
}


const DartUtils = {
	getNameModel,
	parseConstructorParams,
	changeNameModelToNameEntity,
	extractAllClass,
	insertTextInClass,
  getFlutterProjectName,
};

export default DartUtils;
