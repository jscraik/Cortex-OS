import { describe, expect, it } from 'vitest';
import {
	cloudEventSchema,
	createEventBus,
} from '../../../src/lib/event-bus.js';
import type { Envelope } from '../../../src/lib/types.js';

// Final clean minimal version (corruption removed)
describe('event-bus edge cases', () => {
	it('coerces bare object events into envelope', async () => {
		const bus = createEventBus();
		let received: Envelope | undefined;
		bus.subscribe('edge.test', (e: Envelope) => {
			received = e;
		});
		await bus.publish({
			specversion: '1.0',
			type: 'edge.test',
			source: 'x',
			id: 'edge-1',
			time: new Date().toISOString(),
			headers: {},
			ttlMs: 1,
		});
		expect(received?.type).toBe('edge.test');
	});

	it('validates cloudEvent schema rejects missing fields', () => {
		expect(() => cloudEventSchema.parse({ type: 'x' })).toThrow();
	});

	it('publishes event with no subscribers without error', async () => {
		const bus = createEventBus();
		// No subscription created for this type
		await bus.publish({
			specversion: '1.0',
			type: 'no.sub',
			source: 'edge',
			id: 'n1',
			time: new Date().toISOString(),
			headers: {},
			ttlMs: 1,
			data: { info: 'none' },
		} as any);
		// If no error thrown, branch is covered; add trivial expect
		expect(true).toBe(true);
	});
});

// EOF
