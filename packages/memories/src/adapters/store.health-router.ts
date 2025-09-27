import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

const DEFAULT_REFRESH_MS = 15_000;
const DEFAULT_BACKOFF_MS = 5_000;

type StoreOperation<T> = (store: MemoryStore) => Promise<T>;

type ActiveStore = 'primary' | 'fallback';

export interface HealthRouterOptions {
	primary: MemoryStore;
	fallback: MemoryStore;
	check: () => Promise<boolean>;
	refreshIntervalMs?: number;
	backoffMs?: number;
	label?: string;
}

class HealthRoutedMemoryStore implements MemoryStore {
	private readonly primary: MemoryStore;
	private readonly fallback: MemoryStore;
	private readonly check: () => Promise<boolean>;
	private readonly refreshIntervalMs: number;
	private readonly backoffMs: number;
	private readonly label: string;
	private active: ActiveStore = 'primary';
	private lastCheckedAt = 0;
	private retryAfter = 0;
	private sawPrimaryHealthy = false;

	constructor(options: HealthRouterOptions) {
		this.primary = options.primary;
		this.fallback = options.fallback;
		this.check = options.check;
		this.refreshIntervalMs = Math.max(1, options.refreshIntervalMs ?? DEFAULT_REFRESH_MS);
		this.backoffMs = Math.max(1, options.backoffMs ?? DEFAULT_BACKOFF_MS);
		this.label = options.label ?? 'health-router';
	}

	async upsert(memory: Memory, namespace?: string): Promise<Memory> {
		return this.execute((store) => store.upsert(memory, namespace));
	}

	async get(id: string, namespace?: string): Promise<Memory | null> {
		return this.execute((store) => store.get(id, namespace));
	}

	async delete(id: string, namespace?: string): Promise<void> {
		await this.execute((store) => store.delete(id, namespace));
	}

	async searchByText(query: TextQuery, namespace?: string): Promise<Memory[]> {
		return this.execute((store) => store.searchByText(query, namespace));
	}

	async searchByVector(
		query: VectorQuery,
		namespace?: string,
	): Promise<(Memory & { score: number })[]> {
		return this.execute((store) => store.searchByVector(query, namespace));
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.execute((store) => store.purgeExpired(nowISO, namespace));
	}

	async list(namespace?: string, limit?: number, offset?: number): Promise<Memory[]> {
		return this.execute((store) => store.list(namespace, limit, offset));
	}

	private async execute<T>(operation: StoreOperation<T>): Promise<T> {
		const store = await this.pickStore(false);
		try {
			return await operation(store);
		} catch (error) {
			if (store !== this.primary) throw error;
			this.markUnhealthy(error);
			const fallbackStore = await this.pickStore(true);
			return operation(fallbackStore);
		}
	}

	private async pickStore(forceRefresh: boolean): Promise<MemoryStore> {
		const now = Date.now();
		if (forceRefresh || this.shouldRefresh(now)) {
			await this.evaluateHealth(now);
		}
		return this.active === 'primary' ? this.primary : this.fallback;
	}

	private shouldRefresh(now: number): boolean {
		if (!this.sawPrimaryHealthy) return true;
		if (this.active === 'primary') return now - this.lastCheckedAt >= this.refreshIntervalMs;
		return now >= this.retryAfter;
	}

	private async evaluateHealth(now: number): Promise<void> {
		try {
			const healthy = await this.check();
			this.handleHealthResult(now, healthy, undefined);
		} catch (error) {
			this.handleHealthResult(now, false, error);
		}
	}

	private handleHealthResult(now: number, healthy: boolean, error: unknown): void {
		this.lastCheckedAt = now;
		if (healthy) {
			if (this.active === 'fallback') {
				console.info(`brAInwav memory router restored primary (${this.label})`);
			}
			this.active = 'primary';
			this.retryAfter = now + this.refreshIntervalMs;
			this.sawPrimaryHealthy = true;
			return;
		}
		this.applyUnhealthyState(now, error);
	}

	private markUnhealthy(error: unknown): void {
		this.applyUnhealthyState(Date.now(), error);
	}

	private applyUnhealthyState(now: number, error: unknown): void {
		if (this.active !== 'fallback') {
			console.warn(`brAInwav memory router using fallback (${this.label})`, error);
		}
		this.active = 'fallback';
		this.retryAfter = now + this.backoffMs;
		this.lastCheckedAt = now;
	}
}

export const createHealthRoutedStore = (options: HealthRouterOptions): MemoryStore => {
	return new HealthRoutedMemoryStore(options);
};
