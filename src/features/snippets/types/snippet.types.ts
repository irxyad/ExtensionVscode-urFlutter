/**
 * Snippet yang dibuat berdasarkan workspace/project nya
 */
export interface StorageSnippetInterface {
	metadata: MetadataStorageSnippet;
	name: string; // Nama yang diambil dari workspace/project yang telah diformat
	snippets: SnippetInterface[];
}

export type SnippetInterface = {
	name: string; // Nama snippet yang akan muncul di UI
	prefix: string; // Prefix/keyword yang jika di ketik akan muncul sebagai snippet
	description: string; // Tentang snippet ini
	body: string[]; // Isi snippet
};

export type ActionSnippet = {
	action: string;
	snippet: string;
};

export type DeleteorRenameSnippetProp = {
	keySnippet: string;
	groupSnippet: string;
};

/**
 * Isinya dari workspace/project mana dan uri nya
 */
export type MetadataStorageSnippet = {
	from_workspace: string | undefined;
	uri_workspace: string | undefined;
};
