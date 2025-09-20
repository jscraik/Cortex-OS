import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { taskTool } from '../src/tools/task-tool.js';
import { writeTool } from '../src/tools/write-tool.js';

describe('TaskTool', () => {
    const tmpDir = join(process.cwd(), 'packages/mcp-core/tests/tmp');
    const tmpFile = join(tmpDir, 'task.txt');

    it('executes JSON tool instructions sequentially', async () => {
        // Prepare a file
        await writeTool.execute({ path: tmpFile, content: 'alpha\nbeta\ngamma\n' });

        const input = {
            description: 'Find beta and read file',
            instructions: [
                JSON.stringify({
                    tool: 'grep',
                    input: { pattern: 'beta', path: tmpDir, recursive: true, maxResults: 5 },
                }),
                JSON.stringify({ tool: 'read', input: { path: tmpFile } }),
            ],
            priority: 'medium' as const,
        };

        const res = await taskTool.execute(input);
        expect(res.status).toBe('completed');
        expect(res.steps.length).toBe(2);
        expect(res.completedSteps).toBe(2);
        expect(res.steps[0]?.status).toBe('completed');
        expect(res.steps[1]?.status).toBe('completed');

        // Validate grep result structure
        const step0 = res.steps[0]?.result as
            | { type: string; tool: string; result: { totalMatches?: number } }
            | undefined;
        expect(step0?.type).toBe('tool_result');
        expect(step0?.tool).toBe('grep');
        expect(step0?.result?.totalMatches ?? 0).toBeGreaterThanOrEqual(1);

        // Validate read result content
        const step1 = res.steps[1]?.result as
            | { tool: string; result: { content?: string } }
            | undefined;
        expect(step1?.tool).toBe('read');
        expect(!!step1?.result?.content && step1.result.content.includes('beta')).toBe(true);

        // Cleanup
        await rm(tmpFile, { force: true });
    });
});
