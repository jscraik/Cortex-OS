import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	_setValidationCacheForTests,
	clearValidationCache,
	createValidationCache,
	getValidationCacheStats,
	validateWorkflow,
} from '../src/workflow-validator.js';

// Utility to build a minimal valid workflow with variable id/steps
function buildWorkflow(id: string, extraSteps: number = 0) {
	const steps: Record<string, any> = {
		entry: { id: 'entry', name: 'Entry', kind: 'agent', next: null },
	};
	let prev = 'entry';
	for (let i = 0; i < extraSteps; i++) {
		const sid = `s${i}`;
		steps[prev].next = sid;
		steps[sid] = { id: sid, name: sid, kind: 'agent', next: null };
		prev = sid;
	}
	return {
		id,
		name: `wf-${id}`,
		version: '1',
		entry: 'entry',
		steps,
	};
}

describe('ValidationCache eviction', () => {
	let now = 1_000_000;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(now));
		// Replace global cache with small one for deterministic eviction
		const evictions: Array<{ key: string; reason: string }> = [];
		const cache = createValidationCache({
			maxSize: 2,
			ttlMs: 1000,
			cleanupIntervalMs: 10_000,
			onEvict: (k, _e, r) => evictions.push({ key: k, reason: r }),
		});
		_setValidationCacheForTests(cache);
		// store evictions on globalThis for later assertion inside tests
		(globalThis as any).__evictions = evictions;
		clearValidationCache();
	});

	afterEach(() => {
		vi.useRealTimers();
		(globalThis as any).__evictions = undefined;
	});

	it('evicts least recently used entry when maxSize exceeded', () => {
		// Use varying extraSteps so structural hash differs; otherwise identical structure hashes collide.
		const wf1 = buildWorkflow('11111111-1111-1111-1111-111111111111', 0);
		const wf2 = buildWorkflow('22222222-2222-2222-2222-222222222222', 1);
		const wf3 = buildWorkflow('33333333-3333-3333-3333-333333333333', 2);

		validateWorkflow(wf1); // cache miss -> add
		validateWorkflow(wf2); // cache miss -> add
		// Access wf1 again to make wf2 the LRU
		validateWorkflow(wf1); // cache hit

		validateWorkflow(wf3); // triggers LRU eviction of wf2

		const stats = getValidationCacheStats();
		expect(stats.size).toBe(2);
		const evictions = (globalThis as any).__evictions as Array<{
			key: string;
			reason: string;
		}>;
		expect(evictions.length).toBe(1);
		expect(evictions[0].reason).toBe('lru');
	});

	it('evicts expired entries by TTL during cleanup interval', () => {
		const wf1 = buildWorkflow('44444444-4444-4444-4444-444444444444');
		validateWorkflow(wf1);

		// Advance just before TTL
		now += 900;
		vi.setSystemTime(new Date(now));
		validateWorkflow(wf1); // still valid

		// Advance beyond TTL and manually trigger internal cleanup by advancing timers
		now += 200; // total +1100ms
		vi.setSystemTime(new Date(now));
		vi.advanceTimersByTime(10_000); // trigger scheduled cleanup interval callback

		const evictions = (globalThis as any).__evictions as Array<{
			key: string;
			reason: string;
		}>;
		expect(evictions.some((e) => e.reason === 'ttl')).toBe(true);
	});
});
