import type { DropdownChildren } from '@webview/components/Accordion';

export const MENU_SCRIPT_PREFIX = 'menu_script';

export type SidebarMenuItem = {
	id: string;
	label: string;
	children?: DropdownChildren[];
};

export const SidebarMenu = {
	GenerateFlutter: 'generate_flutter',
	InitFolder: 'init_folder',
	Setup: {
		Parent: 'setup',
		Firebase: {
			Parent: 'firebase',
			Install: 'install_firebase',
		},
		Localization: {
			Parent: 'localization',
			Install: 'install_localization',
			AddLocale: 'add_locale',
		},
	},
	Build: {
		Parent: 'build',
		Project: 'build_project',
		LauncherIcon: 'build_launcher_icon',
	},
	Scrcpy: {
		Parent: 'scrcpy',
		Documentation: 'scrcpy_documentation',
		Install: 'install_scrcpy',
		Run: 'run_scrcpy',
		EditCustomParams: 'edit_custom_params',
	},
	Generate: {
		Parent: 'generate',
		BuildRunner: `generate_build_runner`,
		Localization: `${MENU_SCRIPT_PREFIX}_localization`,
		LauncherIcon: 'generate_launcher_icon',
	},
} as const;

export type SidebarMenuId =
	| typeof SidebarMenu.GenerateFlutter
	| typeof SidebarMenu.InitFolder
	| typeof SidebarMenu.Setup.Parent
	| (typeof SidebarMenu.Setup.Firebase)[keyof typeof SidebarMenu.Setup.Firebase]
	| (typeof SidebarMenu.Setup.Localization)[keyof typeof SidebarMenu.Setup.Localization]
	| (typeof SidebarMenu.Build)[keyof typeof SidebarMenu.Build]
	| (typeof SidebarMenu.Scrcpy)[keyof typeof SidebarMenu.Scrcpy]
	| (typeof SidebarMenu.Generate)[keyof typeof SidebarMenu.Generate];

export type SidebarMenuChild = {
	id: SidebarMenuId;
	title: string;
	group?: SidebarMenuGroup;
};

export type SidebarMenuGroup = {
	id: SidebarMenuId;
	badgeColor: string;
};

export type SidebarMenuData = {
	id: SidebarMenuId;
	title: string;
	subtitle?: string;
	children?: SidebarMenuChild[];
};

const menuGroups = {
	Firebase: {
		id: SidebarMenu.Setup.Firebase.Parent,
		badgeColor: '#F59E0B',
	},
	Localization: {
		id: SidebarMenu.Setup.Localization.Parent,
		badgeColor: '#0cc5e6',
	},
} satisfies Record<string, SidebarMenuGroup>;

export function getSidebarData(
	id: SidebarMenuId,
): SidebarMenuData | SidebarMenuChild | undefined {
	for (const menu of SIDEBAR_MENUS) {
		if (menu.id === id) {return menu;}
		const child = menu.children?.find((c) => c.id === id);
		if (child) {return child;}
	}
}

export const SIDEBAR_MENUS: SidebarMenuData[] = [
	{
		id: SidebarMenu.GenerateFlutter,
		title: 'Create Flutter Project',
	},
	{
		id: SidebarMenu.Setup.Parent,
		title: 'Setup or Add',
		children: [
			{
				group: menuGroups.Firebase,
				id: SidebarMenu.Setup.Firebase.Install,
				title: 'Setup Firebase',
			},
			{
				group: menuGroups.Localization,
				id: SidebarMenu.Setup.Localization.Install,
				title: 'Setup Localization',
			},
			{
				group: menuGroups.Localization,
				id: SidebarMenu.Setup.Localization.AddLocale,
				title: 'Add Locale',
			},
		],
	},
	{
		id: SidebarMenu.Build.Parent,
		title: 'Build',
		children: [
			{ id: SidebarMenu.Build.Project, title: 'Build Project' },
			{ id: SidebarMenu.Build.LauncherIcon, title: 'Build Launcher Icon' },
		],
	},
	{
		id: SidebarMenu.Scrcpy.Parent,
		title: 'Scrcpy',
		subtitle: '(Mirroring Android)',
		children: [
			{ id: SidebarMenu.Scrcpy.Run, title: 'Run Scrcpy' },
			{ id: SidebarMenu.Scrcpy.Install, title: 'Install Scrcpy' },
			{ id: SidebarMenu.Scrcpy.EditCustomParams, title: 'Edit Custom Params' },
			{ id: SidebarMenu.Scrcpy.Documentation, title: 'Documentation' },
		],
	},
	{
		id: SidebarMenu.Generate.Parent,
		title: 'Generate',
		children: [
			{ id: SidebarMenu.Generate.BuildRunner, title: 'Generate Build Runner' },
			{ id: SidebarMenu.Generate.Localization, title: 'Generate Localization' },
			{ id: SidebarMenu.Generate.LauncherIcon, title: 'Generate Launcher Icon' },
		],
	},
];
