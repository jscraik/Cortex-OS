import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { createTaskEventStream } from '../../src/streaming.js';
import type { TaskManager } from '../../src/task-manager.js';

describe('task event stream load', () => {
	it('streams bursts of task events without dropping payloads', async () => {
		const manager = new EventEmitter() as unknown as TaskManager;
		const stream = createTaskEventStream(manager);
		const payloads: string[] = [];
		stream.on('data', (chunk) => {
			payloads.push(chunk.toString());
		});

		for (let index = 0; index < 50; index += 1) {
			manager.emit('taskCompleted', { id: `task-${index}`, status: 'completed' });
			manager.emit('taskFailed', { id: `task-${index}`, error: { message: 'boom' } });
		}

		await new Promise((resolve) => setTimeout(resolve, 0));

		const joined = payloads.join('');
		const completedMatches = joined.match(/event: taskCompleted/g) ?? [];
		const failedMatches = joined.match(/event: taskFailed/g) ?? [];
		expect(completedMatches).toHaveLength(50);
		expect(failedMatches).toHaveLength(50);
	});
});
