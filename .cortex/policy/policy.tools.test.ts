import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';

const POLICY_PATH = path.join(__dirname, 'policy.tools.json');

describe('policy.tools.json', () => {
  it('includes required tool property', async () => {
    const raw = await readFile(POLICY_PATH, 'utf-8');
    const policy = JSON.parse(raw);
    expect(policy).toHaveProperty('tool');
    expect(typeof policy.tool).toBe('string');
  });
});
