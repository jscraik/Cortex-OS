import { describe, expect, it } from 'vitest';
import { createCloudEvent } from '../src/cloudevents.js';
import { InMemoryOutbox } from '../src/outbox.js';

describe('InMemoryOutbox', () => {
	it('stores and retrieves events', () => {
		const outbox = new InMemoryOutbox();
		const event = createCloudEvent({
			type: 'com.example.test',
			source: '/test',
			data: { foo: 'bar' },
		});
		outbox.enqueue(event);
		expect(outbox.size).toBe(1);
		expect(outbox.dequeue()).toEqual(event);
	});

	it('moves failed events to the dead-letter queue', () => {
		const outbox = new InMemoryOutbox();
		const event = createCloudEvent({
			type: 'com.example.fail',
			source: '/test',
			data: { boom: true },
		});
		outbox.moveToDLQ(event);
		expect(outbox.dlq).toContain(event);
	});
});
