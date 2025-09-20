import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NotebookReadTool } from '../src/tools/notebook-read-tool.js';

const tool = new NotebookReadTool();

describe('NotebookReadTool', () => {
  it('reads a minimal notebook and returns cells', async () => {
    const tmpDir = join(process.cwd(), 'packages/mcp-core/tests/tmp');
    await mkdir(tmpDir, { recursive: true });
    const nbPath = join(tmpDir, 'sample.ipynb');
    const notebook = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {},
      cells: [
        { cell_type: 'markdown', source: ['# Title'], metadata: {} },
        {
          cell_type: 'code',
          source: ['print("hello")'],
          execution_count: 1,
          metadata: {},
          outputs: [],
        },
      ],
    };
    await writeFile(nbPath, JSON.stringify(notebook), 'utf8');

    const res = await tool.execute({ path: nbPath });
    expect(res.totalCells).toBe(2);
    expect(res.cells[0]).toMatchObject({ type: 'markdown', source: '# Title' });
    expect(res.cells[1]).toMatchObject({
      type: 'code',
      source: 'print("hello")',
      executionCount: 1,
    });
  });
});
