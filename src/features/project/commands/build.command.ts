import { TerminalService } from '@services/terminal.service';
import * as vscode from 'vscode';

enum OptFlavors {
  DEFAULT = 'Default',
  DEVELOPMENT = 'Development',
  STAGING = 'Staging',
  PRODUCTION = 'Production',
}

enum OptPlatform {
  ANDROID_BUNDLE = 'Android (Bundle)',
  ANDROID = 'Android (Apk)',
  IOS = 'iOS',
  MACOS = 'MacOS',
  WEB = 'Web',
  WINDOWS = 'Windows',
  LINUX = 'Linux',
}

export async function buildFlutter(): Promise<void> {
  const terminal = new TerminalService('Build Flutter');

  const flavor = await vscode.window.showQuickPick(Object.values(OptFlavors), {
    title: 'Select Build Type',
    placeHolder: 'Choose a Flavor or Default (no flavor)',
  });

  if (!flavor) {return;}

  const platform = await vscode.window.showQuickPick(Object.values(OptPlatform), {
    title: 'Select Platform',
    placeHolder: 'Choose a target platform',
  });

  if (!platform) {return;}

  const cmd = buildScript(flavor as OptFlavors, platform as OptPlatform);
  terminal.execute(cmd, true);
}

function getBuildTarget(opt: OptFlavors): string {
  const map: Record<OptFlavors, string> = {
    [OptFlavors.DEFAULT]: 'main',
    [OptFlavors.DEVELOPMENT]: 'development',
    [OptFlavors.STAGING]: 'staging',
    [OptFlavors.PRODUCTION]: 'production',
  };
  return map[opt];
}

function getPlatformArg(opt: OptPlatform): string {
  const map: Record<OptPlatform, string> = {
    [OptPlatform.ANDROID_BUNDLE]: 'appbundle',
    [OptPlatform.ANDROID]: 'apk',
    [OptPlatform.IOS]: 'ios',
    [OptPlatform.MACOS]: 'macos',
    [OptPlatform.WEB]: 'web',
    [OptPlatform.WINDOWS]: 'windows',
    [OptPlatform.LINUX]: 'linux',
  };
  return map[opt];
}

const AOT_PLATFORMS = new Set([
  OptPlatform.ANDROID,
  OptPlatform.ANDROID_BUNDLE,
  OptPlatform.IOS,
]);

function buildScript(flavor: OptFlavors, platform: OptPlatform): string {
  const buildTarget = getBuildTarget(flavor);
  const platformArg = getPlatformArg(platform);
  const supportsAOT = AOT_PLATFORMS.has(platform);
  const aotFlags = '--obfuscate --split-debug-info=build/outputs/symbols';
  const baseFlags = '--no-tree-shake-icons';

  if (flavor === OptFlavors.DEFAULT) {
    const flags = supportsAOT
      ? `${baseFlags} ${aotFlags}/main`
      : baseFlags;
    return `flutter build ${platformArg} ${flags}`;
  }

  const flavorFlags = `--flavor ${buildTarget} -t lib/main_${buildTarget}.dart ${baseFlags}`;
  const flags = supportsAOT
    ? `${flavorFlags} ${aotFlags}/${buildTarget}`
    : flavorFlags;

  return `flutter build ${platformArg} ${flags}`;
}
