import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('BuildNode API schema validation', () => {
  let tmpDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-api-'));
    cwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const blueprint = {
    title: 'API Test',
    description: 'Ensure API schema validated',
    requirements: ['API endpoint'],
  } as const;

  it('flags missing openapi.yaml', async () => {
    const state = createInitialPRPState(blueprint, { deterministic: true });
    const node = new BuildNode();
    const result = await node.execute(state);
    const blockers = result.validationResults.build?.blockers || [];
    expect(blockers).toContain('API schema validation failed');
  });

  it('passes when openapi.yaml exists', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'openapi.yaml'),
      'openapi: 3.0.0\ninfo:\n  title: API\n  version: 1.0.0',
    );
    const state = createInitialPRPState(blueprint, { deterministic: true });
    const node = new BuildNode();
    const result = await node.execute(state);
    const blockers = result.validationResults.build?.blockers || [];
    expect(blockers).not.toContain('API schema validation failed');
  });
});
