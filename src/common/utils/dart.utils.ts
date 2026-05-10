import { AppConstant } from '@common/constants/common.constants';
import * as vscode from 'vscode';

// Untuk mengambil nama class dari teks
const getNameClass = (text: string): string | null => {
	const match = text.match(/class\s+(\w+)/);
	return match?.[1] ?? null;
};

/**
 * Untuk mengambil parameter constructor dari class
 */
function parseConstructorParams(
	classText: string,
): { type: string; name: string }[] {
	const lines = classText.split('\n');
	const className = getNameClass(lines[0]);

	if (!className) {
		return [];
	}

	const fullText = classText.replace(/\n/g, ' ');

	// Capture isi dalam {}
	const namedMatch = fullText.match(
		new RegExp(`${className}\\s*\\(\\s*\\{([^}]*)\\}`),
	);

	// Match constructor dengan positional params: ClassName(...)
	// Capture isi dalam kurung biasa (), berhenti sebelum )
	const positionalMatch = fullText.match(
		new RegExp(`${className}\\s*\\(([^)]*)`),
	);

	const rawParams = namedMatch?.[1] ?? positionalMatch?.[1] ?? '';

	if (!rawParams.trim()) {
		return [];
	}

	return rawParams
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean)
		.map((param) => {
			// Buang modifier Dart: final, required, const di awal
			// dan semicolon ; di akhir
			const cleaned = param
				.replace(/^(final|required|const)\s+/g, '')
				.replace(/;$/, '')
				.trim();

			// Match "Type name" dengan support:
			// - Generic: Map<String, int> data
			// - Nullable: String? name
			// - Spasi di dalam generic: Map<String, int>
			const match = cleaned.match(/^([\w<>\s,?]+?)\s+(\w+)$/);

			if (!match) {
				return null;
			}

			return { type: match[1].trim(), name: match[2].trim() };
		})
		.filter((p): p is { type: string; name: string } => p !== null);
}

/**
 * @returns "Model" ke "Entity", cth. "UserModel" ke "UserEntity"
 */
const changeNameModelToNameEntity = (nameModel: string): string => {
	// Buang suffix 'Model' jika ada, lalu tambah 'Entity'
	const withoutModel = nameModel.endsWith('Model')
		? nameModel.slice(0, -'Model'.length)
		: nameModel;

	return `${withoutModel}Entity`;
};

/**
 * Untuk mengambil semua class dari nested class
 */
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

/**
 * Untuk insert text ke dalam class
 */
async function insertTextInClass(
	uri: vscode.Uri,
	addText: string,
	targetClassName: string,
): Promise<{ totalLines: number }> {
	return vscode.window.withProgress(
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

				// Deteksi class declaration, abaikan nested class saat sudah di dalam target
				if (!isInTarget && trimmed.match(/^class\s+\w+/)) {
					const match = trimmed.match(/^class\s+(\w+)/);
					if (match?.[1] === targetClassName) {
						isInTarget = true;
						braceCount = 0;
					}
				}

				if (isInTarget) {
					// Hitung keseimbangan kurung kurawal untuk menemukan closing brace class
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
				throw new Error(`Class "${targetClassName}" not found in file.`);
			}

			edit.insert(uri, insertPosition, `${addText}\n`);
			await vscode.workspace.applyEdit(edit);
			await doc.save();

			progress.report({
				increment: 100,
				message: `Inserted into "${targetClassName}".`,
			});

			return { totalLines: doc.lineCount };
		},
	);
}

const DartUtils = {
	parseConstructorParams,
	changeNameModelToNameEntity,
	extractAllClass,
	insertTextInClass,
};

export default DartUtils;
