import { createEnvelope } from '@cortex-os/a2a-contracts';
import { describe, expect, it, vi } from 'vitest';
import { createBus, type Transport } from '../bus.js';

function stubTransport(): Transport {
	return {
		publish: vi.fn(async () => { }),
		subscribe: vi.fn(async () => async () => { }),
	};
}

describe('topic ACL', () => {
	it('denies publish without ACL entry', async () => {
		const transport = stubTransport();
		const { publish } = createBus(transport, undefined, undefined, {});
		const msg = createEnvelope({
			type: 'foo',
			source: 'test://source',
			data: {},
		});
		await expect(publish(msg)).rejects.toThrow(/Publish not allowed/);
		expect(transport.publish).not.toHaveBeenCalled();
	});

	it('denies subscribe without ACL entry', async () => {
		const transport = stubTransport();
		const { bind } = createBus(transport, undefined, undefined, {});
		await expect(bind([{ type: 'foo', handle: async () => { } }])).rejects.toThrow(
			/Subscribe not allowed/,
		);
		expect(transport.subscribe).not.toHaveBeenCalled();
	});
});
