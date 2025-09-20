import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import fg from 'fast-glob';
import matter, { type GrayMatterFile } from 'gray-matter';
import type { CommandsMap, LoadOptions, LoadedCommand } from './types.js';

const PROJECT_DIR = '.cortex/commands';

function normalizeName(filePath: string): string {
  const base = path.basename(filePath).replace(/\.(md|markdown)$/i, '');
  return base.toLowerCase();
}

export async function loadCommands(opts: LoadOptions = {}): Promise<CommandsMap> {
  const projectDir = opts.projectDir ?? process.cwd();
  const userDir = opts.userDir ?? path.join(os.homedir(), '.cortex/commands');

  const map: CommandsMap = new Map();

  // Load user scope first (lower precedence)
  const userGlob = path.join(userDir, '**/*.md');
  const userFiles = await fg(userGlob, { dot: true, onlyFiles: true });
  for (const file of userFiles) {
    const cmd = await parseCommandFile(file, 'user');
    map.set(cmd.name, cmd);
  }

  // Load project scope and override duplicates
  const projectGlob = path.join(projectDir, PROJECT_DIR, '**/*.md');
  const projFiles = await fg(projectGlob, { dot: true, onlyFiles: true });
  for (const file of projFiles) {
    const cmd = await parseCommandFile(file, 'project');
    map.set(cmd.name, cmd);
  }

  return map;
}

async function parseCommandFile(filePath: string, scope: 'project' | 'user'): Promise<LoadedCommand> {
  const raw = await fs.readFile(filePath, 'utf8');
  const fm: GrayMatterFile<string> = matter(raw);
  const data = fm.data as Record<string, unknown>;

  const cmdName = data.name ? String(data.name).toLowerCase() : normalizeName(filePath);

  const argHint = extractString(data, 'argument-hint') ?? extractString(data, 'argumentHint');
  const loaded: LoadedCommand = {
    name: cmdName,
    description: typeof data.description === 'string' ? data.description : undefined,
    argumentHint: argHint,
    model: typeof data.model === 'string' ? data.model : 'inherit',
    allowedTools: Array.isArray(data['allowed-tools']) ? data['allowed-tools'].map(String) : undefined,
    scope,
    filePath,
    template: fm.content.trim(),
  };

  return loaded;
}

function extractString(obj: Record<string, unknown>, key: string): string | undefined {
  const val = obj[key];
  return typeof val === 'string' ? val : undefined;
}
