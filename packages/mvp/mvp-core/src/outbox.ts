import type { CloudEvent } from './cloudevents.js';

/**
 * In-memory outbox with dead-letter queue for CloudEvents.
 */
export class InMemoryOutbox {
	private readonly queue: CloudEvent[] = [];
	private readonly deadLetters: CloudEvent[] = [];

	enqueue(event: CloudEvent): void {
		this.queue.push(event);
	}

	dequeue(): CloudEvent | undefined {
		return this.queue.shift();
	}

	moveToDLQ(event: CloudEvent): void {
		this.deadLetters.push(event);
	}

	get dlq(): CloudEvent[] {
		return [...this.deadLetters];
	}

	get size(): number {
		return this.queue.length;
	}
}
