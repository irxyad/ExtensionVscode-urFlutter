import { ActionBridgeWebview } from '@webview/webview.constants';

export const SnippetConstant = {
	SuffixStorage: '-mysnippets.json',
	KeySync: 'my-snippet',
	TitlePrefix: '// @prefix ',
};

export const SnippetAction = {
	DeleteStorage: ActionBridgeWebview.DeleteGroupSnippet,
	Delete: ActionBridgeWebview.DeleteSnippet,
	Rename: ActionBridgeWebview.RenameSnippet,
	RenameStorage: ActionBridgeWebview.EditGroupSnippet,
	LoadStorage: ActionBridgeWebview.LoadStorageSnippets,
};
