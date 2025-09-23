/**
 * Memory Management System
 * Implements bounded stores and cleanup mechanisms to prevent memory leaks
 * Following TDD plan requirements for production readiness
 */

import { z } from 'zod';
import { AgentError, ErrorCategory, ErrorSeverity } from './error-handling.js';

// Memory store entry interface
export interface MemoryEntry<T = unknown> {
	data: T;
	timestamp: number;
	accessCount: number;
	lastAccessed: number;
	ttl?: number;
	size?: number;
	metadata?: Record<string, unknown>;
}

// Memory store options
export interface MemoryStoreOptions {
	maxSize: number;
	ttlMs: number;
	cleanupInterval: number;
	evictionPolicy: 'lru' | 'ttl' | 'importance' | 'size';
	maxMemoryMB?: number;
	enableMetrics?: boolean;
}

// Default options
export const DEFAULT_MEMORY_OPTIONS: MemoryStoreOptions = {
	maxSize: 1000,
	ttlMs: 30 * 60 * 1000, // 30 minutes
	cleanupInterval: 5 * 60 * 1000, // 5 minutes
	evictionPolicy: 'lru',
	maxMemoryMB: 100,
	enableMetrics: true,
};

// Memory metrics
export interface MemoryMetrics {
	currentSize: number;
	maxSize: number;
	hitRate: number;
	missRate: number;
	evictionCount: number;
	totalAccesses: number;
	memoryUsageMB: number;
	lastCleanup: number;
}

/**
 * Memory-bounded store with automatic cleanup
 */
export class MemoryBoundedStore<T = unknown> {
	private store = new Map<string, MemoryEntry<T>>();
	private options: MemoryStoreOptions;
	private cleanupInterval: NodeJS.Timeout;
	private metrics: MemoryMetrics;
	private isDestroyed = false;

	constructor(options: Partial<MemoryStoreOptions> = {}) {
		this.options = { ...DEFAULT_MEMORY_OPTIONS, ...options };
		this.metrics = {
			currentSize: 0,
			maxSize: this.options.maxSize,
			hitRate: 0,
			missRate: 0,
			evictionCount: 0,
			totalAccesses: 0,
			memoryUsageMB: 0,
			lastCleanup: Date.now(),
		};

		// Start automatic cleanup
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, this.options.cleanupInterval);
	}

	/**
	 * Add or update an entry
	 */
	set(key: string, data: T, ttl?: number): void {
		if (this.isDestroyed) {
			throw new AgentError(
				'Cannot add to destroyed store',
				ErrorCategory.MEMORY,
				ErrorSeverity.HIGH,
			);
		}

		// Check if we need to evict entries before adding
		if (this.store.size >= this.options.maxSize) {
			this.evictEntries(1);
		}

		const now = Date.now();
		const entry: MemoryEntry<T> = {
			data,
			timestamp: now,
			accessCount: 0,
			lastAccessed: now,
			ttl: ttl || this.options.ttlMs,
			size: this.estimateSize(data),
		};

		this.store.set(key, entry);
		this.updateMetrics();
	}

	/**
	 * Get an entry
	 */
	get(key: string): T | null {
		if (this.isDestroyed) {
			return null;
		}

		this.metrics.totalAccesses++;

		const entry = this.store.get(key);
		if (!entry) {
			this.metrics.missRate = this.calculateMissRate();
			return null;
		}

		// Check if entry has expired
		if (this.isExpired(entry)) {
			this.store.delete(key);
			this.metrics.missRate = this.calculateMissRate();
			return null;
		}

		// Update access information
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		this.metrics.hitRate = this.calculateHitRate();
		return entry.data;
	}

	/**
	 * Check if a key exists and is not expired
	 */
	has(key: string): boolean {
		if (this.isDestroyed) {
			return false;
		}

		const entry = this.store.get(key);
		if (!entry) {
			return false;
		}

		if (this.isExpired(entry)) {
			this.store.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Delete an entry
	 */
	delete(key: string): boolean {
		if (this.isDestroyed) {
			return false;
		}

		const deleted = this.store.delete(key);
		if (deleted) {
			this.updateMetrics();
		}
		return deleted;
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		if (this.isDestroyed) {
			return;
		}

		this.store.clear();
		this.updateMetrics();
	}

	/**
	 * Get current size
	 */
	size(): number {
		return this.store.size;
	}

	/**
	 * Get all keys
	 */
	keys(): string[] {
		return Array.from(this.store.keys());
	}

	/**
	 * Get memory metrics
	 */
	getMetrics(): MemoryMetrics {
		return { ...this.metrics };
	}

	/**
	 * Force cleanup of expired entries
	 */
	cleanup(): void {
		if (this.isDestroyed) {
			return;
		}

		const now = Date.now();
		let evictedCount = 0;

		// Remove expired entries
		for (const [key, entry] of this.store) {
			if (this.isExpired(entry)) {
				this.store.delete(key);
				evictedCount++;
			}
		}

		// Check memory usage and evict if necessary
		this.updateMetrics();
		if (this.options.maxMemoryMB && this.metrics.memoryUsageMB > this.options.maxMemoryMB) {
			const additionalEvictions = this.evictByMemoryPressure();
			evictedCount += additionalEvictions;
		}

		this.metrics.evictionCount += evictedCount;
		this.metrics.lastCleanup = now;

		if (this.options.enableMetrics && evictedCount > 0) {
			console.log(
				`🧹 Memory cleanup: evicted ${evictedCount} entries, current size: ${this.store.size}`,
			);
		}
	}

	/**
	 * Destroy the store and cleanup resources
	 */
	destroy(): void {
		if (this.isDestroyed) {
			return;
		}

		clearInterval(this.cleanupInterval);
		this.store.clear();
		this.isDestroyed = true;

		if (this.options.enableMetrics) {
			console.log('🗑️ Memory store destroyed');
		}
	}

	/**
	 * Check if an entry is expired
	 */
	private isExpired(entry: MemoryEntry<T>): boolean {
		if (!entry.ttl) {
			return false;
		}
		return Date.now() - entry.timestamp > entry.ttl;
	}

	/**
	 * Evict entries based on policy
	 */
	private evictEntries(count: number): void {
		const entries = Array.from(this.store.entries());

		switch (this.options.evictionPolicy) {
			case 'lru':
				entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
				break;
			case 'ttl':
				entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
				break;
			case 'importance':
				entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
				break;
			case 'size':
				entries.sort(([, a], [, b]) => (b.size || 0) - (a.size || 0));
				break;
		}

		for (let i = 0; i < Math.min(count, entries.length); i++) {
			const [key] = entries[i];
			this.store.delete(key);
		}

		this.updateMetrics();
	}

	/**
	 * Evict entries due to memory pressure
	 */
	private evictByMemoryPressure(): number {
		const targetReduction = Math.ceil(this.store.size * 0.1); // Evict 10%
		this.evictEntries(targetReduction);
		return targetReduction;
	}

	/**
	 * Estimate size of data in bytes
	 */
	private estimateSize(data: T): number {
		try {
			return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
		} catch {
			return 100; // Default estimate
		}
	}

	/**
	 * Update metrics
	 */
	private updateMetrics(): void {
		this.metrics.currentSize = this.store.size;

		// Estimate memory usage
		let totalSize = 0;
		for (const entry of this.store.values()) {
			totalSize += entry.size || 100;
		}
		this.metrics.memoryUsageMB = totalSize / (1024 * 1024);
	}

	/**
	 * Calculate hit rate
	 */
	private calculateHitRate(): number {
		if (this.metrics.totalAccesses === 0) return 0;
		const hits = this.metrics.totalAccesses - this.metrics.missRate * this.metrics.totalAccesses;
		return hits / this.metrics.totalAccesses;
	}

	/**
	 * Calculate miss rate
	 */
	private calculateMissRate(): number {
		if (this.metrics.totalAccesses === 0) return 0;
		return (
			(this.metrics.totalAccesses - this.metrics.hitRate * this.metrics.totalAccesses) /
			this.metrics.totalAccesses
		);
	}
}

/**
 * Rate limiter using bounded memory store
 */
export class RateLimiter {
	private store: MemoryBoundedStore<{ count: number; resetTime: number }>;
	private windowMs: number;
	private maxRequests: number;

	constructor(options: { windowMs: number; maxRequests: number; cleanupInterval?: number }) {
		this.windowMs = options.windowMs;
		this.maxRequests = options.maxRequests;
		this.store = new MemoryBoundedStore({
			maxSize: 10000,
			ttlMs: options.windowMs,
			cleanupInterval: options.cleanupInterval || options.windowMs / 2,
			evictionPolicy: 'ttl',
		});
	}

	/**
	 * Check if request is allowed and track it
	 */
	isAllowed(identifier: string): boolean {
		const now = Date.now();
		const existing = this.store.get(identifier);

		if (!existing) {
			// First request
			this.store.set(identifier, { count: 1, resetTime: now + this.windowMs });
			return true;
		}

		if (now > existing.resetTime) {
			// Window has reset
			this.store.set(identifier, { count: 1, resetTime: now + this.windowMs });
			return true;
		}

		if (existing.count >= this.maxRequests) {
			// Rate limit exceeded
			return false;
		}

		// Increment counter
		this.store.set(identifier, { count: existing.count + 1, resetTime: existing.resetTime });
		return true;
	}

	/**
	 * Get remaining requests for identifier
	 */
	getRemaining(identifier: string): number {
		const existing = this.store.get(identifier);
		if (!existing) {
			return this.maxRequests;
		}

		const now = Date.now();
		if (now > existing.resetTime) {
			return this.maxRequests;
		}

		return Math.max(0, this.maxRequests - existing.count);
	}

	/**
	 * Get time until reset
	 */
	getTimeUntilReset(identifier: string): number {
		const existing = this.store.get(identifier);
		if (!existing) {
			return 0;
		}

		const now = Date.now();
		return Math.max(0, existing.resetTime - now);
	}

	/**
	 * Get store size for testing
	 */
	size(): number {
		return this.store.size();
	}

	/**
	 * Destroy the rate limiter
	 */
	destroy(): void {
		this.store.destroy();
	}
}

/**
 * Event store with bounded memory
 */
export class EventStore<T = unknown> {
	private store: MemoryBoundedStore<T>;
	private eventOrder: string[] = [];

	constructor(options: { maxSize: number; ttlMs?: number }) {
		this.store = new MemoryBoundedStore({
			maxSize: options.maxSize,
			ttlMs: options.ttlMs || 60 * 60 * 1000, // 1 hour default
			evictionPolicy: 'lru',
		});
	}

	/**
	 * Add an event
	 */
	add(event: T): string {
		const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Remove oldest if at capacity
		while (this.eventOrder.length >= this.store.getMetrics().maxSize) {
			const oldestId = this.eventOrder.shift();
			if (oldestId) {
				this.store.delete(oldestId);
			}
		}

		this.store.set(id, event);
		this.eventOrder.push(id);
		return id;
	}

	/**
	 * Get an event by ID
	 */
	get(id: string): T | null {
		return this.store.get(id);
	}

	/**
	 * Get the oldest event
	 */
	getOldest(): T | null {
		if (this.eventOrder.length === 0) {
			return null;
		}
		return this.store.get(this.eventOrder[0]);
	}

	/**
	 * Get the newest event
	 */
	getNewest(): T | null {
		if (this.eventOrder.length === 0) {
			return null;
		}
		return this.store.get(this.eventOrder[this.eventOrder.length - 1]);
	}

	/**
	 * Get current size
	 */
	size(): number {
		return this.eventOrder.length;
	}

	/**
	 * Get all events
	 */
	getAll(): T[] {
		return this.eventOrder
			.map((id) => this.store.get(id))
			.filter((event): event is T => event !== null);
	}

	/**
	 * Clear all events
	 */
	clear(): void {
		this.store.clear();
		this.eventOrder = [];
	}

	/**
	 * Destroy the event store
	 */
	destroy(): void {
		this.store.destroy();
		this.eventOrder = [];
	}
}

/**
 * Memory manager for global cleanup coordination
 */
export class GlobalMemoryManager {
	private stores: Set<MemoryBoundedStore> = new Set();
	private rateLimiters: Set<RateLimiter> = new Set();
	private eventStores: Set<EventStore> = new Set();
	private globalCleanupInterval: NodeJS.Timeout;

	constructor(cleanupIntervalMs = 5 * 60 * 1000) {
		// 5 minutes
		this.globalCleanupInterval = setInterval(() => {
			this.performGlobalCleanup();
		}, cleanupIntervalMs);
	}

	/**
	 * Register a memory store for global management
	 */
	register(store: MemoryBoundedStore | RateLimiter | EventStore): void {
		if (store instanceof MemoryBoundedStore) {
			this.stores.add(store);
		} else if (store instanceof RateLimiter) {
			this.rateLimiters.add(store);
		} else if (store instanceof EventStore) {
			this.eventStores.add(store);
		}
	}

	/**
	 * Unregister a memory store
	 */
	unregister(store: MemoryBoundedStore | RateLimiter | EventStore): void {
		if (store instanceof MemoryBoundedStore) {
			this.stores.delete(store);
		} else if (store instanceof RateLimiter) {
			this.rateLimiters.delete(store);
		} else if (store instanceof EventStore) {
			this.eventStores.delete(store);
		}
	}

	/**
	 * Get global memory metrics
	 */
	getGlobalMetrics(): {
		totalStores: number;
		totalMemoryUsageMB: number;
		totalEntries: number;
	} {
		let totalMemoryUsageMB = 0;
		let totalEntries = 0;

		for (const store of this.stores) {
			const metrics = store.getMetrics();
			totalMemoryUsageMB += metrics.memoryUsageMB;
			totalEntries += metrics.currentSize;
		}

		for (const rateLimiter of this.rateLimiters) {
			totalEntries += rateLimiter.size();
		}

		for (const eventStore of this.eventStores) {
			totalEntries += eventStore.size();
		}

		return {
			totalStores: this.stores.size + this.rateLimiters.size + this.eventStores.size,
			totalMemoryUsageMB,
			totalEntries,
		};
	}

	/**
	 * Perform global cleanup
	 */
	private performGlobalCleanup(): void {
		console.log('🌍 Performing global memory cleanup...');

		const metrics = this.getGlobalMetrics();
		console.log(
			`  📊 Before cleanup: ${metrics.totalEntries} entries, ${metrics.totalMemoryUsageMB.toFixed(2)}MB`,
		);

		// Trigger cleanup on all stores
		for (const store of this.stores) {
			store.cleanup();
		}

		const afterMetrics = this.getGlobalMetrics();
		console.log(
			`  ✅ After cleanup: ${afterMetrics.totalEntries} entries, ${afterMetrics.totalMemoryUsageMB.toFixed(2)}MB`,
		);
	}

	/**
	 * Destroy all managed stores
	 */
	destroy(): void {
		clearInterval(this.globalCleanupInterval);

		for (const store of this.stores) {
			store.destroy();
		}
		for (const rateLimiter of this.rateLimiters) {
			rateLimiter.destroy();
		}
		for (const eventStore of this.eventStores) {
			eventStore.destroy();
		}

		this.stores.clear();
		this.rateLimiters.clear();
		this.eventStores.clear();

		console.log('🗑️ Global memory manager destroyed');
	}
}

// Export a singleton global memory manager
export const globalMemoryManager = new GlobalMemoryManager();

// Schema validation for memory entries
export const MemoryEntrySchema = z.object({
	data: z.unknown(),
	timestamp: z.number(),
	accessCount: z.number(),
	lastAccessed: z.number(),
	ttl: z.number().optional(),
	size: z.number().optional(),
	metadata: z.record(z.unknown()).optional(),
});
