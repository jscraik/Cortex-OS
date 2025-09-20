import fg from 'fast-glob';
import yaml from 'js-yaml';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { HookConfig, HookEntry, HookEvent, HookSettings } from './types.js';

export type LoadOptions = {
  projectDir?: string;
  userDir?: string;
};

export function getHookDirs(opts: LoadOptions = {}) {
  const projectDir = opts.projectDir ?? process.cwd();
  const userDir = opts.userDir ?? path.join(os.homedir(), '.cortex');
  return [path.join(userDir, 'hooks'), path.join(projectDir, '.cortex/hooks')];
}

/**
 * Load hook configs from user then project, merging by event. Project entries run after user entries.
 */
export async function loadHookConfigs(opts: LoadOptions = {}): Promise<HookConfig> {
  const dirs = getHookDirs(opts);
  const merged: HookConfig = { settings: {} };

  const files = await listConfigFiles(dirs);
  await processConfigFiles(files, merged);
  return merged;
}

async function processConfigFiles(files: string[], merged: HookConfig): Promise<void> {
  for (const full of files) {
    const cfg = await loadSingleConfig(full);
    const root = (cfg as Record<string, unknown>)?.hooks ?? cfg;
    mergeSettings(merged, root as Record<string, unknown>);
    mergeEvents(merged, root as Record<string, HookEntry[] | HookSettings>);
  }
}

async function listConfigFiles(dirs: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const d of dirs) {
    try {
      const found = await fg(['**/*.{json,yaml,yml,js}'], { cwd: d, dot: true });
      for (const rel of found) results.push(path.join(d, rel));
    } catch {
      // ignore missing directory
    }
  }
  return results;
}

function mergeSettings(target: HookConfig, root: Record<string, unknown>): void {
  const settings = root?.settings as HookSettings | undefined;
  if (!settings) return;
  target.settings = {
    ...target.settings,
    ...settings,
    command: {
      ...(target.settings?.command ?? {}),
      ...(settings.command ?? {}),
    },
  };
}

function mergeEvents(
  target: HookConfig,
  root: Record<string, HookEntry[] | HookSettings> | undefined,
): void {
  if (!root) return;
  for (const [event, arr] of Object.entries(root)) {
    if (event === 'settings') continue;
    const key = event as HookEvent;
    const current = target[key] ?? [];
    const list = arr as unknown as HookEntry[];
    target[key] = [...current, ...list];
  }
}

async function loadSingleConfig(full: string): Promise<unknown> {
  if (full.endsWith('.js')) {
    // support ESM default export or plain object export
    const mod = await import(pathToFileUrl(full));
    return mod.default ?? mod;
  }
  const text = await fs.readFile(full, 'utf8');
  if (full.endsWith('.json')) return JSON.parse(text);
  return yaml.load(text);
}

function pathToFileUrl(p: string) {
  const url = new URL('file://');
  url.pathname = path.resolve(p);
  return String(url);
}
