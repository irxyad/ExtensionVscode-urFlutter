import {
  SidebarMenu,
  type SidebarMenuId,
} from '@common/constants/menus/sidebar-menu.constants';

export const SCRIPT_MAP: Partial<Record<SidebarMenuId, string>> = {
  [SidebarMenu.Generate.BuildRunner]:
    'dart run build_runner build --delete-conflicting-outputs',
  [SidebarMenu.Generate.Localization]:
    'dart run easy_localization:generate --source-dir ./assets/translations -f keys -o locale_keys.g.dart',
};
