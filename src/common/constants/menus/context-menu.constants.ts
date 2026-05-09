export const ContextMenuId = {
	GenerateFromToEntity: 'generateFromToEntity',
	CreateSnippet: 'createSnippet',
} as const;

export type ContextMenuIdType =
	(typeof ContextMenuId)[keyof typeof ContextMenuId];

export interface ContextMenu {
	id: ContextMenuIdType;
	label: string;
}

export const CONTEXT_MENUS: ContextMenu[] = [
	{
		id: ContextMenuId.GenerateFromToEntity,
		label: 'Generate FromEntity & ToEntity',
	},
	{
		id: ContextMenuId.CreateSnippet,
		label: 'Create snippet from text selection',
	},
];
