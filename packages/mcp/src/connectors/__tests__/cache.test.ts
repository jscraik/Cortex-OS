import { describe, expect, it } from 'vitest';
import { ManifestCache } from '../cache.js';

class MockClock {
	private current = 0;

	now(): number {
		return this.current;
	}

	advance(ms: number): void {
		this.current += ms;
	}
}

describe('ManifestCache', () => {
	it('returns undefined when empty', () => {
		const cache = new ManifestCache<string>(new MockClock());

		expect(cache.get()).toBeUndefined();
	});

	it('stores and retrieves manifest', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('alpha', 5_000);

		expect(cache.get()).toBe('alpha');
	});

	it('returns fresh value before ttl expiry', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('fresh', 5_000);
		clock.advance(2_000);

		expect(cache.get()).toBe('fresh');
	});

	it('handles zero ttl as immediate expiry', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('beta', 0);

		expect(cache.get()).toBeUndefined();
	});

	it('updates ttl when setting same value twice', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('gamma', 5_000);
		clock.advance(3_000);
		cache.set('gamma', 5_000);
		clock.advance(3_500);

		expect(cache.get()).toBe('gamma');
	});

	it('returns stale value after expiry when refresh fails', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('v1', 1_000);
		clock.advance(2_000); // expired but still last known good
		expect(cache.get()).toBe('v1');

		cache.set('v2', 1_000);
		clock.advance(1_500); // v2 expired → fallback to v1
		expect(cache.get()).toBe('v1');
	});

	it('overwrites stale value on new set', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('v1', 1_000);
		clock.advance(2_000);
		expect(cache.get()).toBe('v1');

		cache.set('v2', 1_000);
		clock.advance(2_000);
		expect(cache.get()).toBe('v1');

		cache.set('v3', 1_000);
		expect(cache.get()).toBe('v3');
	});

	it('invalidate clears stored value and stale reference', () => {
		const clock = new MockClock();
		const cache = new ManifestCache<string>(clock);

		cache.set('delta', 1_000);
		cache.invalidate();

		expect(cache.get()).toBeUndefined();
	});
});
