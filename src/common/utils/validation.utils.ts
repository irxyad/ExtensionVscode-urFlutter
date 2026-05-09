export function isValidInputBox(name: string): boolean {
	const regex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
	return regex.test(name);
}

// Validasi khusus flutter
const DART_RESERVED_KEYWORDS = new Set([
	'assert',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'default',
	'do',
	'else',
	'enum',
	'extends',
	'false',
	'final',
	'finally',
	'for',
	'if',
	'in',
	'is',
	'new',
	'null',
	'return',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'var',
	'void',
	'while',
	'with',
	'abstract',
	'as',
	'covariant',
	'deferred',
	'dynamic',
	'export',
	'extension',
	'external',
	'factory',
	'function',
	'get',
	'implements',
	'import',
	'interface',
	'late',
	'library',
	'mixin',
	'operator',
	'part',
	'required',
	'rethrow',
	'set',
	'static',
	'typedef',
	'when',
]);

export function isValidFlutterProjectName(name: string): boolean {
	const regex = /^[a-z][a-z0-9_]*$/;
	if (!regex.test(name)) {
		return false;
	}

	// Gk boleh Dart reserved keyword
	if (DART_RESERVED_KEYWORDS.has(name)) {
		return false;
	}

	return true;
}
