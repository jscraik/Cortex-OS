import type { Readable } from 'node:stream';

type TaskEventName = 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning';

export interface TaskEventStreamRegistration {
	id: string;
	stream: Readable;
	events: ReadonlySet<TaskEventName>;
	createdAt: Date;
}

export interface TaskEventStreamRegistryOptions {
	basePath?: string;
}

/**
 * Registry that tracks live task event streams so transports can look up the
 * corresponding Node.js Readable instance when establishing SSE/WebSocket
 * bridges.
 */
export class TaskEventStreamRegistry {
	private readonly entries = new Map<string, TaskEventStreamRegistration>();

	constructor(private readonly options: TaskEventStreamRegistryOptions = {}) {}

	register(id: string, stream: Readable, events: Iterable<TaskEventName>): void {
		const registration: TaskEventStreamRegistration = {
			id,
			stream,
			events: new Set(events),
			createdAt: new Date(),
		};
		this.entries.set(id, registration);

		const cleanup = () => {
			this.entries.delete(id);
			stream.removeListener('close', cleanup);
			stream.removeListener('end', cleanup);
			stream.removeListener('error', cleanup);
		};

		stream.once('close', cleanup);
		stream.once('end', cleanup);
		stream.once('error', cleanup);
	}

	get(id: string): TaskEventStreamRegistration | undefined {
		return this.entries.get(id);
	}

	release(id: string): void {
		const entry = this.entries.get(id);
		if (!entry) return;
		this.entries.delete(id);
		entry.stream.removeAllListeners('close');
		entry.stream.removeAllListeners('end');
		entry.stream.removeAllListeners('error');
		entry.stream.destroy();
	}

	listActive(): TaskEventStreamRegistration[] {
		return Array.from(this.entries.values());
	}

	buildSsePath(id: string): string {
		const basePath = this.options.basePath ?? '/a2a/streams';
		return `${basePath}/${id}`;
	}
}
