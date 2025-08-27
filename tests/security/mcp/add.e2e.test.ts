import { execa } from 'execa';
import { expect, it } from 'vitest';

// This assumes the CLI is built to dist/index.js. In CI you can build first.
it.skip('adds via CLI', async () => {
  const bin = 'apps/cortex-cli/dist/index.js';
  const r = await execa('node', [bin, 'mcp', 'add', 'echo', '--transport', 'https', '--endpoint', 'https://example.com']);
  expect(r.stdout).toContain('Added MCP server: echo');
});
