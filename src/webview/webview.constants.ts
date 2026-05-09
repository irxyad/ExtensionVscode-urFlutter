// constant yang kita kirim dari webview ke extension
export const ActionBridgeWebview = {
  GetSnippets: 'getSnippets',
  DeleteGroupSnippet: 'deleteGroupSnippet',
  EditSnippet: 'editSnippet',
  DeleteSnippet: 'deleteSnippet',
  RenameSnippet: 'renameSnippet',
  IsDeletedSnippet: 'isDeletedSnippet',
  IsRenamedSnippet: 'isRenamedSnippet',
  EditGroupSnippet: 'editGroupSnippet',
  Log: 'log',
};

// constant yang kita dapat dari extension ke webview
export const ReturnBridgeWebview = {
  SnippetsData: 'snippetsData',
};
