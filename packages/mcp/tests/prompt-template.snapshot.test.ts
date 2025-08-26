import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

/** Snapshot test for web MCP interface prompt examples. */
test('web-mcp-interface examples remain stable', () => {
  const html = readFileSync(
    resolve(__dirname, '../src/web-mcp-interface.ts'),
    'utf8',
  );
  const match = html.match(/<div class="example">([\s\S]*?)<\/div>/);
  expect(match?.[1].trim()).toMatchSnapshot();
});
