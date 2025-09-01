import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';

describe('BuildNode documentation validation', () => {
  let tmpDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-docs-'));
    cwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const blueprint = {
    title: 'Doc Test',
    description: 'Ensure docs validated',
    requirements: ['documentation'],
  } as const;

  it('flags missing README.md', async () => {
    const state = createInitialPRPState(blueprint, { deterministic: true });
    const node = new BuildNode();
    const result = await node.execute(state);
    const buildResult = result.validationResults.build!;
    expect(buildResult.passed).toBe(false);
    expect(buildResult.blockers).toContain('Backend compilation or tests failed');
    expect(buildResult.majors).toContain(
      'Documentation incomplete - missing API docs or usage notes',
    );
  });

  it('passes when README.md exists', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
    const state = createInitialPRPState(blueprint, { deterministic: true });
    const node = new BuildNode();
    const result = await node.execute(state);
    const buildResult = result.validationResults.build!;
    expect(buildResult.passed).toBe(false);
    expect(buildResult.blockers).toContain('Backend compilation or tests failed');
    expect(buildResult.majors).not.toContain(
      'Documentation incomplete - missing API docs or usage notes',
    );
  });
});
