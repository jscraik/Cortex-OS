import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EditTool } from '../src/tools/edit-tool.js';

const tool = new EditTool();

describe('EditTool', () => {
	it('applies oldText replacement and line range edit', async () => {
		const tmpDir = join(process.cwd(), 'packages/mcp-core/tests/tmp');
		await mkdir(tmpDir, { recursive: true });
		const filePath = join(tmpDir, 'edit.txt');
		await writeFile(filePath, 'line1\nline2\nline3\n', 'utf8');

		const res = await tool.execute({
			path: filePath,
			edits: [
				{ oldText: 'line2', newText: 'LINE_TWO' },
				{ startLine: 3, endLine: 3, newText: 'LINE_THREE' },
			],
			createBackup: true,
		});

		expect(res.success).toBe(true);
		const content = await readFile(filePath, 'utf8');
		expect(content).toBe('line1\nLINE_TWO\nLINE_THREE\n');
		expect(res.backupPath).toBeTruthy();
	});
});
