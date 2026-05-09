export type StorageSnippetInterface = {
	metadata: MetadataStorageSnippet;
	storageName: string;
	dataSnippet: { snippetName: string; body: SnippetInterface }[];
};

export type SnippetInterface = {
	prefix: string;
	description: string;
	body: string[];
};

export type ActionSnippet = {
	action: string;
	snippet: string;
};

export type DeleteorRenameSnippetProp = {
	keySnippet: string;
	groupSnippet: string;
};

export type MetadataStorageSnippet = {
	from_workspace: string;
	uri_workspace: string;
};
