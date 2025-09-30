import { Readable } from 'node:stream';
import type { TaskResult } from './protocol.js';
import type { TaskManager } from './task-manager.js';

type TaskEventName = 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning';

export interface TaskEventStreamOptions {
	events?: TaskEventName[];
	heartbeatIntervalMs?: number;
}

/**
 * Create a Server-Sent Events stream from TaskManager events.
 */
export function createTaskEventStream(
	taskManager: TaskManager,
	options: TaskEventStreamOptions = {},
): Readable {
	const allowedEvents = new Set<TaskEventName>(
		(options.events && options.events.length > 0
			? options.events
			: ['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']) as TaskEventName[],
	);
	const stream = new Readable({
		read() {},
	});

	const writeEvent = (event: TaskEventName, data: unknown) => {
		if (!allowedEvents.has(event)) return;
		stream.push(`event: ${event}\n`);
		stream.push(`data: ${JSON.stringify(data)}\n\n`);
	};

	const listeners: Array<[TaskEventName, (...args: any[]) => void]> = [];

	const onCompleted = (result: TaskResult) => writeEvent('taskCompleted', result);
	const onCancelled = (payload: { id: string }) => writeEvent('taskCancelled', payload);
	const onFailed = (payload: { id: string; error: unknown }) => writeEvent('taskFailed', payload);
	const onRunning = (payload: { id: string }) => writeEvent('taskRunning', payload);

	const register = (event: TaskEventName, handler: (...args: any[]) => void) => {
		if (!allowedEvents.has(event)) return;
		listeners.push([event, handler]);
		taskManager.on(event, handler as never);
	};

	register('taskCompleted', onCompleted);
	register('taskCancelled', onCancelled);
	register('taskFailed', onFailed);
	register('taskRunning', onRunning);

	const heartbeatInterval = options.heartbeatIntervalMs ?? 15000;
	const heartbeatTimer = setInterval(() => {
		stream.push(`: heartbeat ${Date.now()}\n\n`);
	}, heartbeatInterval);
	heartbeatTimer.unref();

	// Cleanup function to remove listeners, only runs once
	let cleanedUp = false;
	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		for (const [event, handler] of listeners) {
			taskManager.off(event, handler as never);
		}
		listeners.length = 0;
		clearInterval(heartbeatTimer);
	};
	stream.on('close', cleanup);
	stream.on('end', cleanup);
	stream.on('error', cleanup);

	// Initial comment to keep connection alive
	stream.push(': connected\n\n');

	return stream;
}
