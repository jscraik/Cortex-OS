import { describe, expect, it } from 'vitest';
import { createA2AEventStreamSubscribeTool } from '../src/mcp/tools.js';
import { TaskEventStreamRegistry } from '../src/streaming-registry.js';
import { createTaskManager } from '../src/task-manager.js';

describe('A2A streaming implementation', () => {
	it('establishes SSE streaming and forwards live task events', async () => {
		const manager = createTaskManager();
		const registry = new TaskEventStreamRegistry({ basePath: '/internal/streams' });
		const tool = createA2AEventStreamSubscribeTool({ taskManager: manager, registry });

		const response = await tool.handler({
			events: ['taskCompleted', 'taskFailed'],
			includeCurrent: false,
		});

		expect(response.isError).toBeUndefined();
		const result = response.raw;
		expect(result).toBeDefined();
		expect(result?.note).toContain('Streaming active via SSE');
		expect(result?.note).not.toContain('snapshot only');

		const subscriptionId = result?.subscriptionId;
		const registration = registry.get(subscriptionId);
		expect(registration).toBeDefined();
		expect(Array.from(registration?.events)).toEqual(['taskCompleted', 'taskFailed']);

		const chunks: string[] = [];
		registration?.stream.on('data', (chunk) => {
			chunks.push(chunk.toString());
		});

		manager.emit('taskCompleted', { id: 'task-42', status: 'completed' });
		manager.emit('taskCancelled', { id: 'task-cancelled' });
		manager.emit('taskFailed', { id: 'task-99', error: { message: 'boom' } });

		await new Promise((resolve) => setTimeout(resolve, 10));

		const output = chunks.join('');
		expect(output).toContain('event: taskCompleted');
		expect(output).toContain('data: {"id":"task-42"');
		expect(output).toContain('event: taskFailed');
		expect(output).not.toContain('taskCancelled');

		registration?.stream.destroy();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(registry.get(subscriptionId)).toBeUndefined();
	});
});
