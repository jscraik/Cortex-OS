import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

test('rg_search wrapper returns JSON', () => {
  // Create a temporary directory and file
  const tempDir = mkdtempSync(join(tmpdir(), 'rg_search_test_'));
  const uniquePattern = `TEST_PATTERN_${randomBytes(8).toString('hex')}`;
  const tempFile = join(tempDir, 'testfile.txt');
  writeFileSync(tempFile, `This is a test file containing the pattern: ${uniquePattern}\n`);

  const script = join(process.cwd(), 'agent-toolkit', 'tools', 'rg_search.sh');
  const output = execSync(`${script} ${uniquePattern} ${tempFile}`, { encoding: 'utf8' });
  const data = JSON.parse(output);
  expect(data.tool).toBe('ripgrep');
  expect(data.op).toBe('search');
  expect(Array.isArray(data.results)).toBe(true);
  expect(data.results.length).toBeGreaterThan(0);

  // Clean up
  unlinkSync(tempFile);
  rmdirSync(tempDir);
});
