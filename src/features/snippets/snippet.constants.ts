import { ActionBridgeWebview } from '@webview/webview.constants';

export const SnippetConstant = {
	SuffixGroupSnippet: 'mysnippets.json',
	KeySyncSnippet: 'my-snippet',
	TitlePrefix: '// @prefix ',
};

export const SnippetAction = {
	DeleteGroupSnippet: ActionBridgeWebview.DeleteGroupSnippet,
	DeleteSnippet: ActionBridgeWebview.DeleteSnippet,
	RenameSnippet: ActionBridgeWebview.RenameSnippet,
	RenameGroupSnippet: ActionBridgeWebview.EditGroupSnippet,
  LoadStorageSnippets:ActionBridgeWebview.LoadStorageSnippets,
};
