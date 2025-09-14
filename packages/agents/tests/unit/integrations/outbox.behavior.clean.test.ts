import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	LocalInMemoryStore,
	wireOutbox,
} from '../../../src/integrations/outbox.js';
import { createEventBus } from '../../../src/lib/event-bus.js';
import type { Envelope, EventBus } from '../../../src/lib/types.js';

/**
 * Clean minimal recreation of the outbox behavior tests.
 */

describe('outbox integration behavior (clean)', () => {
	let store: LocalInMemoryStore;
	beforeEach(() => {
		store = new LocalInMemoryStore();
	});

	it('persists events with default namespace and tags', async () => {
		const bus = createEventBus() as EventBus;
		await wireOutbox(bus, store, { redactPII: false });
		const evt: Envelope = {
			specversion: '1.0',
			id: randomUUID(),
			type: 'agent.started',
			source: 'unit',
			time: new Date().toISOString(),
			ttlMs: 60000,
			headers: {},
			data: {
				agentId: 'a1',
				traceId: 't1',
				capability: 'documentation',
				input: {},
				timestamp: new Date().toISOString(),
			},
		} as any;
		await bus.publish(evt);
		const results = await store.searchByText(
			{ text: 'a1', topK: 10 },
			'default',
		);
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].tags).toContain('agents:outbox');
	});

	it('truncates oversized payloads', async () => {
		const bus = createEventBus() as EventBus;
		await wireOutbox(bus, store, { maxItemBytes: 200 });
		const huge = 'x'.repeat(10_000);
		await bus.publish({
			specversion: '1.0',
			id: randomUUID(),
			type: 'agent.failed',
			source: 'unit',
			time: new Date().toISOString(),
			ttlMs: 1,
			headers: {},
			data: {
				agentId: 'a',
				traceId: 't',
				capability: 'security',
				error: huge,
				metrics: { latencyMs: 1 },
				timestamp: new Date().toISOString(),
			},
		} as any);
		const mems = await store.searchByText(
			{ text: 'truncated', topK: 5 },
			'default',
		);
		expect(mems.some((m) => m.text?.includes('truncated'))).toBe(true);
	});
});

// EOF
