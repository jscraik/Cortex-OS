import { describe, expect, test, vi } from 'vitest';
import { healthHandler, wireA2A } from '../src/boot/a2a';

describe('routing', () => {
	test('health events route to handler', async () => {
		const { bus } = wireA2A();
		const spy = vi.spyOn(healthHandler, 'handle');
		
		// Create a proper CloudEvents envelope for the real A2A bus
		const envelope = {
			specversion: '1.0',
			id: 'test-id',
			source: 'test-source',
			type: 'cortex.health.check',
			time: new Date().toISOString(),
			data: {},
			datacontenttype: 'application/json',
		};
		
		await bus.publish(envelope);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});
