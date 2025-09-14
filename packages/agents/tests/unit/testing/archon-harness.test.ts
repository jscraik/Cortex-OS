import { describe, expect, it } from 'vitest';
import { archonDescribe } from '../../../src/testing/archonTestHarness.js';

// Only cover the disabled branch (no env var). The enabled path relies on external service.
archonDescribe('archon harness disabled', (ctx) => {
	it('marks harness unavailable when env flag absent', () => {
		expect(ctx.available).toBe(false);
		expect(ctx.reason).toMatch(/not set/);
	});
});

describe('archon harness wrapper meta', () => {
	it('is importable (sanity)', () => {
		expect(typeof archonDescribe).toBe('function');
	});
});
