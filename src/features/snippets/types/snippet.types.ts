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
	filePath: string; // File path dari snippet
};

export type ActionSnippet = {
	action: string;
	snippet: string;
};

export type ActionSnippetOption = {
	storage: StorageSnippetInterface;
	snippetName: string;
};

/**
 * Isinya dari workspace/project mana dan uri nya
 */
export type MetadataStorageSnippet = {
	from_workspace: string | undefined;
	uri_workspace: string | undefined;
};

export type EditSnippetOption = {
	storage: StorageSnippetInterface;
	snippetName: string;
};

export type UpdateStorageOption = {
	snippetName: string;
	storageName: string;
	snippet: SnippetInterface;
};

export type CheckPrefixOrNameOption = {
  key: string;
  /**
   * Keyword yang jika value nya sama dengan [snippet.name] akan return undefined
   * agar gk ada pengecekan di file yang sama
   */
  snippetName?: string;
  storageName:string;
  checkFor?: 'both' | 'prefix' | 'snippetName';
};

export type RenameSnippetNameOption = {
  storage: StorageSnippetInterface;
  snippetName: string;
};
