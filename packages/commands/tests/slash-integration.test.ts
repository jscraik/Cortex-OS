import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createBuiltinCommands,
  loadCommands,
  parseSlash,
  runCommand,
  type BuiltinsApi,
  type LoadedCommand,
  type RenderContext,
} from '../src/index.js';

const TMP_PREFIX = 'commands-phase-10-';

describe('slash command integration', () => {
  let projectRoot: string;
  let userRoot: string;
  let cleanupPaths: string[] = [];

  beforeAll(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}project-`));
    userRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}user-`));
    cleanupPaths = [projectRoot, userRoot];
    await seedCommandFixtures(projectRoot, userRoot);
  });

  afterAll(async () => {
    await Promise.all(cleanupPaths.map(async (p) => fs.rm(p, { recursive: true, force: true })));
  });

  it('parses, loads, and executes built-in commands end to end', async () => {
    const map = await loadCommands({ projectDir: projectRoot, userDir: userRoot });
    const api = createStubApi();
    for (const builtin of createBuiltinCommands(api)) {
      map.set(builtin.name, builtin);
    }
    const ctx: RenderContext = { cwd: projectRoot };

    const helpInvocation = parseAndRequire('/help');
    const helpResult = await runCommand(
      requireCommand(map, helpInvocation.cmd),
      helpInvocation.args,
      ctx,
    );
    expect(helpResult.text).toContain('Usage: /help');

    const agentsInvocation = parseAndRequire('/agents create builder');
    await runCommand(requireCommand(map, agentsInvocation.cmd), agentsInvocation.args, ctx);
    expect(api.createdAgents).toEqual(['builder']);

    const modelInvocation = parseAndRequire('/model cortex-pro');
    await runCommand(requireCommand(map, modelInvocation.cmd), modelInvocation.args, ctx);
    expect(api.currentModel).toBe('cortex-pro');

    const compactInvocation = parseAndRequire('/compact focus area');
    const compactRes = await runCommand(
      requireCommand(map, compactInvocation.cmd),
      compactInvocation.args,
      ctx,
    );
    expect(compactRes.text).toBe('Compaction: focus area');
  });

  it('resolves project command metadata with precedence over user scope', async () => {
    const map = await loadCommands({ projectDir: projectRoot, userDir: userRoot });
    const command = map.get('daily-summary');
    expect(command?.scope).toBe('project');
    expect(command?.model).toBe('brainwav-pro');
    expect(command?.allowedTools).toEqual(['Bash(git status:*)']);

    const ctx: RenderContext = {
      cwd: projectRoot,
      runBashSafe: async () => ({ stdout: 'git status', stderr: '', code: 0 }),
      readFileCapped: async () => 'latest updates',
      fileAllowlist: ['**/*.md'],
    };

    const res = await runCommand(command!, ['flagged'], ctx);
    expect(res.metadata).toMatchObject({ command: 'daily-summary', scope: 'project' });
    expect(res.text).toContain('flagged');
    expect(res.text).toContain('git status');
  });
});

async function seedCommandFixtures(projectDir: string, userDir: string): Promise<void> {
  await fs.mkdir(path.join(projectDir, '.cortex/commands'), { recursive: true });
  await fs.mkdir(userDir, { recursive: true });
  await fs.mkdir(path.join(userDir, '.cortex/commands'), { recursive: true });

  const userPath = path.join(userDir, '.cortex/commands/daily-summary.md');
  await fs.writeFile(
    userPath,
    ['---', 'name: daily-summary', 'model: inherit', '---', 'User summary $ARGUMENTS'].join('\n'),
    'utf8',
  );

  const projectPath = path.join(projectDir, '.cortex/commands/daily-summary.md');
  await fs.writeFile(
    projectPath,
    [
      '---',
      'name: daily-summary',
      'model: brainwav-pro',
      'allowed-tools:',
      '  - Bash(git status:*)',
      '---',
      'Project summary $ARGUMENTS',
      '',
      'Status: !`git status`',
    ].join('\n'),
    'utf8',
  );
}

function parseAndRequire(input: string) {
  const parsed = parseSlash(input);
  if (!parsed) {
    throw new Error(`brAInwav failed to parse slash command: ${input}`);
  }
  return parsed;
}

function requireCommand(map: Map<string, LoadedCommand>, name: string) {
  const cmd = map.get(name);
  if (!cmd) {
    throw new Error(`brAInwav slash command not found: ${name}`);
  }
  return cmd;
}

function createStubApi(): BuiltinsApi & { createdAgents: string[]; currentModel: string } {
  const createdAgents: string[] = [];
  let currentModel = 'inherit';
  return {
    createdAgents,
    currentModel,
    listAgents: async () => [{ id: 'base', name: 'Base Agent' }],
    createAgent: async (spec) => {
      const name = spec?.name ?? `agent-${createdAgents.length + 1}`;
      createdAgents.push(name);
      return { id: `agent-${name}`, name };
    },
    getModel: () => currentModel,
    setModel: async (model) => {
      currentModel = model;
    },
    compact: async (opts) => `Compaction: ${opts?.focus ?? 'none'}`,
  };
}
