// constant yang kita kirim dari webview ke extension
export const ActionBridgeWebview = {
  GetSnippets: 'getSnippets',
  DeleteGroupSnippet: 'deleteGroupSnippet',
  EditSnippet: 'editSnippet',
  DeleteSnippet: 'deleteSnippet',
  RenameSnippet: 'renameSnippet',
  EditGroupSnippet: 'editGroupSnippet',
  Log: 'log',
  LoadStorageSnippets:'loadStorageSnippets',
};

// constant yang kita dapat dari extension ke webview
export const ReturnBridgeWebview = {
  SnippetsData: 'snippetsData',
  IsDeletedSnippet: 'isDeletedSnippet',
  IsRenamedSnippet: 'isRenamedSnippet',

};
