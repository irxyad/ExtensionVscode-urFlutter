import {
  MENU_SCRIPT_PREFIX,
  type SidebarMenuId
} from '@common/constants/menus/sidebar-menu.constants';
import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';
import { SCRIPT_MAP } from './script.constants';

export function isMenuScript(value: string): boolean {
  return value.startsWith(MENU_SCRIPT_PREFIX);
}

export function getScriptByMenuId(value: SidebarMenuId): string | undefined {
  return SCRIPT_MAP[value];
}

export async function runMenuScript(value: string) {
  const terminal = new TerminalService('Menu Script');

  const script = getScriptByMenuId(value as SidebarMenuId);

  if (!script) {
    vscode.window.showErrorMessage('Script not found for the selected menu item.');
    return;
  }

  terminal.execute(script, true);
}
