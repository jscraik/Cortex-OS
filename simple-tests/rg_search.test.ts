import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('rg_search wrapper returns JSON', () => {
  const script = join(process.cwd(), 'agent-toolkit', 'tools', 'rg_search.sh');
  const output = execSync(`${script} AGENTS AGENTS.md`, { encoding: 'utf8' });
  const data = JSON.parse(output);
  expect(data.tool).toBe('ripgrep');
  expect(data.op).toBe('search');
  expect(Array.isArray(data.results)).toBe(true);
  expect(data.results.length).toBeGreaterThan(0);
});
