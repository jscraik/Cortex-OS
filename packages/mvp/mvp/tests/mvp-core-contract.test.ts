/**
 * @file tests/mvp-core-contract.test.ts
 * @description Contract tests ensuring kernel uses mvp-core only through public interface.
 */
import { describe, expect, it } from 'vitest';

describe.skip('MVP-Core Contract', () => {
	it('exposes env loader via public API', async () => {
		const { loadEnv } = await import('@cortex-os/mvp-core');
		expect(typeof loadEnv).toBe('function');
	});

	it('rejects deep imports', async () => {
		await expect(import('@cortex-os/mvp-core/src/env.js')).rejects.toThrow();
	});
});
