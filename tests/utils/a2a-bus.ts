import { EventEmitter } from 'node:events';

export type A2ABusStatus = 'delivered' | 'dropped';

export interface MockA2AEvent {
	topic: string;
	payload: unknown;
	timestamp: number;
	status: A2ABusStatus;
}

export class MockA2ABus {
	private readonly emitter = new EventEmitter();
	private online = true;
	events: MockA2AEvent[] = [];

	emit(topic: string, payload: unknown): void {
		const status: A2ABusStatus = this.online ? 'delivered' : 'dropped';
		const event: MockA2AEvent = {
			topic,
			payload,
			timestamp: Date.now(),
			status,
		};
		this.events.push(event);
		if (status === 'delivered') {
			this.emitter.emit(topic, payload);
		}
	}

	on(topic: string, handler: (payload: unknown) => void): void {
		this.emitter.on(topic, handler);
	}

	simulateOutage(): void {
		this.online = false;
	}

	restore(): void {
		this.online = true;
	}

	reset(): void {
		this.events = [];
		this.online = true;
		this.emitter.removeAllListeners();
	}
}

export function createMockA2ABus(): MockA2ABus {
	return new MockA2ABus();
}
