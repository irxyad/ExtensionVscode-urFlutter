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
  Firebase: {
    Parent: 'firebase',
    Install: 'install_firebase',
  },
  Install: {
    Parent: 'install',
    Localization: 'install_localization',
  },
  Build: {
    Parent: 'build',
    Project: 'build_project',
    LauncherIcon: 'build_launcher_icon',
  },
  Scrcpy: {
    Parent: 'scrcpy',
    Documentation: 'scrcpy-documentation',
    InstallScrcpy: 'install-scrcpy',
    RunScrcpy: 'run-scrcpy',
    EditCustomParams: 'edit-custom-params',
  },
  Generate: {
    Parent: 'generate',
    BuildRunner: `${MENU_SCRIPT_PREFIX}_build_runner`,
    Localization: `${MENU_SCRIPT_PREFIX}_localization`,
    LauncherIcon: 'generate_launcher_icon',
  },
} as const;

export type SidebarMenuId =
  | typeof SidebarMenu.GenerateFlutter
  | typeof SidebarMenu.InitFolder
  | (typeof SidebarMenu.Firebase)[keyof typeof SidebarMenu.Firebase]
  | (typeof SidebarMenu.Build)[keyof typeof SidebarMenu.Build]
  | (typeof SidebarMenu.Install)[keyof typeof SidebarMenu.Install]
  | (typeof SidebarMenu.Scrcpy)[keyof typeof SidebarMenu.Scrcpy]
  | (typeof SidebarMenu.Generate)[keyof typeof SidebarMenu.Generate];

export type SidebarMenuData = {
  id: SidebarMenuId;
  title: string;
  subtitle?: string;
  children?: { id: SidebarMenuId; title: string }[];
};

export const SIDEBAR_MENUS: SidebarMenuData[] = [
  {
    id: SidebarMenu.GenerateFlutter,
    title: 'Create Flutter Project',
  },
  {
    id: SidebarMenu.Firebase.Parent,
    title: 'Firebase',
    children: [
      {
        id: SidebarMenu.Firebase.Install,
        title: 'Install Firebase',
      },
    ],
  },
  {
    id: SidebarMenu.Install.Parent,
    title: 'Install',
    children: [
      {
        id: SidebarMenu.Install.Localization,
        title: 'Install Localization',
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
      { id: SidebarMenu.Scrcpy.RunScrcpy, title: 'Run Scrcpy' },
      { id: SidebarMenu.Scrcpy.InstallScrcpy, title: 'Install Scrcpy' },
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
