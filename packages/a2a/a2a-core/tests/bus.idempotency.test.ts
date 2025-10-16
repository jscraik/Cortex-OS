import { describe, expect, it } from 'vitest';
import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createBus } from '../src/bus.js';
import type { Transport } from '../src/transport.js';

// Simple inproc transport stub
function createInprocTransport() {
	const subs: { topics: string[]; handler: (m: Envelope) => Promise<void> }[] = [];
	return {
		publish: async (msg: Envelope) => {
			for (const s of subs) {
				if (s.topics.includes(msg.type)) {
					await s.handler(msg);
				}
			}
		},
		subscribe: async (topics: string[], handler: (m: Envelope) => Promise<void>) => {
			subs.push({ topics, handler });
			return { close: async () => {} };
		},
	};
}

describe('bus idempotency & correlation edge cases', () => {
	it('drops duplicate events with same id when idempotency enabled', async () => {
		const received: string[] = [];
		const transport = createInprocTransport();
		const bus = createBus(transport as unknown as Transport, undefined, undefined, {
			'evt.test': { publish: true, subscribe: true },
		});

		await bus.bind([
			{
				type: 'evt.test',
				handle: async (m) => {
					received.push(m.id);
				},
			},
		]);

		const env = createEnvelope({
			type: 'evt.test',
			source: 'urn:cortex:test',
			data: { n: 1 },
			id: '22222222-2222-4222-8222-222222222222',
		});
		await bus.publish(env);
		await bus.publish(env); // duplicate

		expect(received).toEqual(['22222222-2222-4222-8222-222222222222']);
	});

	it('processes duplicates when idempotency disabled', async () => {
		const received: string[] = [];
		const transport = createInprocTransport();
		const bus = createBus(
			transport as unknown as Transport,
			undefined,
			undefined,
			{ 'evt.test2': { publish: true, subscribe: true } },
			{ enableIdempotency: false },
		);
		await bus.bind([
			{
				type: 'evt.test2',
				handle: async (m) => {
					received.push(m.id);
				},
			},
		]);
		const env = createEnvelope({
			type: 'evt.test2',
			source: 'urn:cortex:test',
			data: {},
			id: '33333333-3333-4333-8333-333333333333',
		});
		await bus.publish(env);
		await bus.publish(env);
		expect(received).toEqual([
			'33333333-3333-4333-8333-333333333333',
			'33333333-3333-4333-8333-333333333333',
		]);
	});

	it('auto-generates correlationId when missing', async () => {
		let observed: { id?: string; correlationId?: string } | undefined;
		const transport = createInprocTransport();
		const bus = createBus(transport as unknown as Transport, undefined, undefined, {
			'evt.corr': { publish: true, subscribe: true },
		});
		await bus.bind([
			{
				type: 'evt.corr',
				handle: async (m) => {
					observed = { id: m.id, correlationId: m.correlationId };
				},
			},
		]);
		const env = createEnvelope({ type: 'evt.corr', source: 'urn:cortex:test', data: {} });
		await bus.publish(env);
		expect(observed?.correlationId).toBe(observed?.id);
	});

	it('preserves provided correlationId', async () => {
		let observed: { id?: string; correlationId?: string } | undefined;
		const transport = createInprocTransport();
		const bus = createBus(transport as unknown as Transport, undefined, undefined, {
			'evt.corr2': { publish: true, subscribe: true },
		});
		await bus.bind([
			{
				type: 'evt.corr2',
				handle: async (m) => {
					observed = { id: m.id, correlationId: m.correlationId };
				},
			},
		]);
		const env = createEnvelope({
			type: 'evt.corr2',
			source: 'urn:cortex:test',
			data: {},
			correlationId: '11111111-1111-4111-8111-111111111111',
		});
		await bus.publish(env);
		expect(observed?.correlationId).toBe('11111111-1111-4111-8111-111111111111');
	});
});
