import { describe, expect, test, vi } from 'vitest';
import { healthHandler, wireA2A } from '../src/boot/a2a';

	describe('routing', () => {
		test('health events route to handler', async () => {
			const wiring = wireA2A();
			const spy = vi.spyOn(healthHandler, 'handle');
			wiring.on(healthHandler.type, healthHandler.handle);

			await wiring.publish('cortex.health.check', {});
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});
	});
