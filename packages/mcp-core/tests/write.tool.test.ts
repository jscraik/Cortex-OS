import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WriteTool } from '../src/tools/write-tool.js';

const tool = new WriteTool();

const tmpFile = join(process.cwd(), 'packages/mcp-core/tests/tmp/write.txt');

async function cleanup() {
  try {
    await rm(tmpFile);
  } catch { }
}

describe('WriteTool', () => {
  it('creates and overwrites files', async () => {
    await cleanup();
    let res = await tool.execute({ path: tmpFile, content: 'hello' });
    expect(res.operation).toBe('created');
    expect(await readFile(tmpFile, 'utf8')).toBe('hello');

    res = await tool.execute({ path: tmpFile, content: ' world', ifExists: 'append' });
    expect(res.operation).toBe('appended');
    expect(await readFile(tmpFile, 'utf8')).toBe('hello world');

    res = await tool.execute({ path: tmpFile, content: 'reset', ifExists: 'overwrite' });
    expect(res.operation === 'overwritten' || res.operation === 'created').toBe(true);
    expect(await readFile(tmpFile, 'utf8')).toBe('reset');

    await cleanup();
  });
});
