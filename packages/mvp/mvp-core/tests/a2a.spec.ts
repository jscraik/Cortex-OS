import { describe, expect, it } from 'vitest';
import { A2ARouter } from '../src/a2a.js';
import { createCloudEvent } from '../src/cloudevents.js';
import { InMemoryOutbox } from '../src/outbox.js';

describe('A2ARouter', () => {
	it('routes events to registered handlers', async () => {
		const router = new A2ARouter();
		const event = createCloudEvent({
			type: 'com.example.handled',
			source: '/test',
			data: { ok: true },
		});
		let handled = false;
		router.on('com.example.handled', async (e) => {
			handled = e.data.ok;
		});
		await router.route(event);
		expect(handled).toBe(true);
	});

	it('sends handler errors to the outbox DLQ', async () => {
		const router = new A2ARouter();
		const outbox = new InMemoryOutbox();
		const event = createCloudEvent({
			type: 'com.example.fail',
			source: '/test',
			data: { ok: false },
		});
		router.on('com.example.fail', () => {
			throw new Error('boom');
		});
		await expect(router.route(event, outbox)).rejects.toThrow('boom');
		expect(outbox.dlq).toContain(event);
	});

	it('throws for unhandled events', async () => {
		const router = new A2ARouter();
		const event = createCloudEvent({
			type: 'com.example.none',
			source: '/test',
			data: null,
		});
		await expect(router.route(event)).rejects.toThrow('no handler');
	});
});
