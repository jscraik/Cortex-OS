/**
 * Tests server initialization failure when tokens configuration is corrupted
 */
// @vitest-environment node

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeASBR } from '../../src/index.js';
import { ValidationError } from '../../src/types/index.js';
import { getConfigPath, initializeXDG } from '../../src/xdg/index.js';

describe('server initialization', () => {
  let tokensPath: string;
  let originalConfigHome: string | undefined;

  beforeAll(async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'asbr-config-'));
    originalConfigHome = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmp;
    tokensPath = getConfigPath('tokens.json');
  });

  afterAll(async () => {
    await rm(tokensPath, { force: true });
    if (originalConfigHome) {
      process.env.XDG_CONFIG_HOME = originalConfigHome;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
  });

  it('fails when tokens.json is corrupted', async () => {
    await initializeXDG();
    await writeFile(tokensPath, '{ invalid json', 'utf-8');

    await expect(initializeASBR({ autoStart: false })).rejects.toBeInstanceOf(ValidationError);
  });
});
