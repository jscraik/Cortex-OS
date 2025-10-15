import { afterEach, describe, expect, it, vi } from 'vitest';
import { taskTool } from '../src/tools/task-tool.js';
import { todoWriteTool } from '../src/tools/todo-write-tool.js';
import { resetSecureRandomSource, withSecureRandomSource } from '../src/utils/secure-random.js';

describe('secure id generators', () => {
        afterEach(() => {
                resetSecureRandomSource();
                vi.useRealTimers();
        });

        it('produces deterministic task ids when secure source is overridden', async () => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

                const id = await withSecureRandomSource(
                        () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                        () => (taskTool as unknown as { generateTaskId: () => string }).generateTaskId(),
                );

                expect(id).toBe('task_1735689600000_aaaaaaaaa');
        });

        it('produces deterministic todo ids when secure source is overridden', async () => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

                const id = await withSecureRandomSource(
                        () => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                        () => (todoWriteTool as unknown as { generateId: () => string }).generateId(),
                );

                expect(id).toBe('todo_1735689600000_bbbbbbbbb');
        });
});
