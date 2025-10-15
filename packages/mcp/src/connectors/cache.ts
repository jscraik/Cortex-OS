import type { Clock } from './refresh-scheduler.js';

const defaultClock: Clock = { now: () => Date.now() };

interface CachedValue<T> {
	value: T;
	expiresAt: number;
	stale?: T;
	ttlMs: number;
}

export class ManifestCache<T> {
	private cache: CachedValue<T> | null = null;
	private readonly clock: Clock;

	constructor(clock: Clock = defaultClock) {
		this.clock = clock;
	}

	get(): T | undefined {
		if (!this.cache) {
			return undefined;
		}

		const now = this.clock.now();
		if (now < this.cache.expiresAt) {
			return this.cache.value;
		}

		if (this.cache.stale !== undefined) {
			return this.cache.stale;
		}

		if (this.cache.ttlMs > 0) {
			return this.cache.value;
		}

		return undefined;
	}

	set(value: T, ttlMs: number): void {
		const now = this.clock.now();
		const normalizedTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 0;

		this.cache = {
			value,
			expiresAt: now + normalizedTtl,
			stale: this.cache?.value ?? this.cache?.stale,
			ttlMs: normalizedTtl,
		};
	}

	invalidate(): void {
		this.cache = null;
	}
}
