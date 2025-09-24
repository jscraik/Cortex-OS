import { describe, expect, it, vi } from 'vitest';
import type { Envelope as EnvelopeType } from '../../packages/a2a/a2a-contracts/src/envelope.js';
import { createEnvelope } from '../../packages/a2a/a2a-contracts/src/envelope.js';
import { createBus } from '../../packages/a2a/a2a-core/src/bus.js';
import type { Transport } from '../../packages/a2a/a2a-core/src/transport.js';

function makeMockTransport() {
	const publish = vi.fn(async () => {});
	const subscribe = vi.fn(async (types: string[], onMsg: (m: EnvelopeType) => Promise<void>) => {
		// Return an unsubscribe function
		if (Array.isArray(types)) {
			// keep parameter referenced to satisfy lints
			JSON.stringify(types.length);
		}
		return async () => {
			// use handler in a resolved promise to avoid unused warnings without side effects
			await Promise.resolve(onMsg);
		};
	});
	return { publish, subscribe } as unknown as Transport;
}

describe('Type Safety Integration', () => {
	it('should publish a valid envelope without throwing', async () => {
		const envelope = createEnvelope({
			type: 'test.event',
			source: 'https://example.com/tests',
			data: { ok: true },
		});

		const transport = makeMockTransport();
		const identity = (e: EnvelopeType): EnvelopeType => e;
		const bus = createBus(
			transport,
			identity as unknown as (e: EnvelopeType) => EnvelopeType,
			undefined,
			{
				'test.event': { publish: true, subscribe: true },
			},
		);

		await expect(bus.publish(envelope as EnvelopeType)).resolves.not.toThrow();
	});
});
