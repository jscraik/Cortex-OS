import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runBuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
    const result = await runBuildNode(state);
    const majors = result.validationResults.build?.majors || [];
    expect(majors).toContain('Documentation incomplete - missing API docs or usage notes');
  });

  it('passes when README.md exists', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
    const state = createInitialPRPState(blueprint, { deterministic: true });
    const result = await runBuildNode(state);
    const majors = result.validationResults.build?.majors || [];
    expect(majors).not.toContain('Documentation incomplete - missing API docs or usage notes');
  });
});
