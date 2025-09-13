import type { CacheManager } from '../domain/types.js';

interface CacheEntry {
	value: unknown;
	expiry: number;
}

export interface MemoryCacheConfig {
	maxSize: number;
	ttl: number; // Time to live in seconds
}

export class MemoryCacheManager implements CacheManager {
	private cache = new Map<string, CacheEntry>();
	private config: MemoryCacheConfig;

	constructor(config: MemoryCacheConfig) {
		this.config = config;
	}

	async get(key: string): Promise<unknown> {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if entry has expired
		if (Date.now() > entry.expiry) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		// Evict oldest entries if cache is full
		if (this.cache.size >= this.config.maxSize) {
			const oldestKey = this.cache.keys().next().value as string | undefined;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}

		const timeToLive = ttl || this.config.ttl;
		const expiry = Date.now() + timeToLive * 1000;

		this.cache.set(key, { value, expiry });
	}

	async has(key: string): Promise<boolean> {
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		// Check if entry has expired
		if (Date.now() > entry.expiry) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	async clear(): Promise<void> {
		this.cache.clear();
	}

	async size(): Promise<number> {
		// Clean up expired entries first
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiry) {
				this.cache.delete(key);
			}
		}

		return this.cache.size;
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
