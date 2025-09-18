/**
 * @file tests/package-dependencies.test.ts
 * @description Test to verify that packages can import their declared dependencies
 */

import { describe, expect, it } from 'vitest';

describe('Package Dependencies Resolution', () => {
	it('should be able to import @cortex-os/kernel from prp-runner', async () => {
		// This test will fail initially due to missing dependency
		try {
			const kernel = await import('@cortex-os/kernel');
			expect(kernel).toBeDefined();
		} catch (error) {
			console.error('Failed to import @cortex-os/kernel:', error);
			throw error;
		}
	});
});
