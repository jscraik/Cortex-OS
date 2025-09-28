import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getHookDirs, loadHookConfigs } from '../src/loaders.js';

const TMP_PREFIX = 'hooks-phase-10-';

describe('filesystem-backed hook configs', () => {
  let projectRoot: string;
  let userRoot: string;
  let cleanup: string[] = [];

  beforeAll(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}project-`));
    userRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}user-`));
    cleanup = [projectRoot, userRoot];
    await seedHookConfigs(projectRoot, userRoot);
  });

  afterAll(async () => {
    await Promise.all(cleanup.map(async (p) => fs.rm(p, { recursive: true, force: true })));
  });

  it('honours precedence with project overrides and appended hooks', async () => {
    const config = await loadHookConfigs({ projectDir: projectRoot, userDir: userRoot });
    expect(config.settings?.command?.allowlist).toEqual(['project/*']);

    const preTool = config.PreToolUse ?? [];
    expect(preTool).toHaveLength(2);
    expect(preTool[0]?.matcher).toBe('user-tool');
    expect(preTool[1]?.matcher).toBe('project-tool');
  });

  it('reloads updated files without caching', async () => {
    const projectFile = path.join(projectRoot, '.cortex/hooks/project.yaml');
    await fs.writeFile(
      projectFile,
      ['hooks:', '  settings:', '    command:', '      allowlist:', '        - project-updated/*'].join('\n'),
      'utf8',
    );
    const config = await loadHookConfigs({ projectDir: projectRoot, userDir: userRoot });
    expect(config.settings?.command?.allowlist).toEqual(['project-updated/*']);
  });

  it('exposes resolved hook directories for consumers', () => {
    const dirs = getHookDirs({ projectDir: projectRoot, userDir: userRoot });
    expect(dirs).toEqual([
      path.join(userRoot, 'hooks'),
      path.join(projectRoot, '.cortex/hooks'),
    ]);
  });
});

async function seedHookConfigs(projectDir: string, userDir: string): Promise<void> {
  const userHooksDir = path.join(userDir, 'hooks');
  await fs.mkdir(userHooksDir, { recursive: true });
  const projectHooksDir = path.join(projectDir, '.cortex/hooks');
  await fs.mkdir(projectHooksDir, { recursive: true });

  await fs.writeFile(
    path.join(userHooksDir, 'user.yaml'),
    [
      'hooks:',
      '  settings:',
      '    command:',
      '      allowlist:',
      '        - user/*',
      '  PreToolUse:',
      '    - matcher: user-tool',
      '      hooks:',
      '        - type: command',
      '          command: /status',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(projectHooksDir, 'project.yaml'),
    [
      'hooks:',
      '  settings:',
      '    command:',
      '      allowlist:',
      '        - project/*',
      '  PreToolUse:',
      '    - matcher: project-tool',
      '      hooks:',
      '        - type: command',
      '          command: /agents',
    ].join('\n'),
    'utf8',
  );
}
