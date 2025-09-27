import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHealthRoutedStore } from '../../src/adapters/store.health-router.js';
import type { Memory } from '../../src/domain/types.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';

const baseMemory: Memory = {
	id: 'm-1',
	kind: 'note',
	text: 'health routing smoke test',
	tags: [],
	createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
	updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
	provenance: { source: 'system' },
};

const createStoreDouble = (overrides: Partial<MemoryStore> = {}): MemoryStore => {
	const defaultImpl: MemoryStore = {
		upsert: vi.fn(async (memory: Memory) => memory),
		get: vi.fn(async () => null),
		delete: vi.fn(async () => {}),
		searchByText: vi.fn(async () => []),
		searchByVector: vi.fn(async () => [] as (Memory & { score: number })[]),
		purgeExpired: vi.fn(async () => 0),
		list: vi.fn(async () => []),
	};
	return { ...defaultImpl, ...overrides };
};

describe('createHealthRoutedStore', () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('uses the primary store when health is good', async () => {
		const primary = createStoreDouble();
		const fallback = createStoreDouble();
		const router = createHealthRoutedStore({
			primary,
			fallback,
			check: vi.fn(async () => true),
			refreshIntervalMs: 5,
			backoffMs: 5,
			label: 'unit-test',
		});

		await router.upsert(baseMemory);

		expect(primary.upsert as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
		expect(fallback.upsert as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
	});

	it('falls back when the primary health check fails', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
		const primary = createStoreDouble();
		const fallback = createStoreDouble();
		const health = vi.fn().mockResolvedValue(false);
		const router = createHealthRoutedStore({
			primary,
			fallback,
			check: health,
			refreshIntervalMs: 5,
			backoffMs: 5,
			label: 'unit-test',
		});

		await router.upsert(baseMemory);

		expect(health).toHaveBeenCalledTimes(1);
		expect(primary.upsert as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
		expect(fallback.upsert as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
	});

	it('recovers primary when health check succeeds again', async () => {
		vi.useFakeTimers();
		const start = new Date('2024-01-01T00:00:00.000Z').getTime();
		vi.setSystemTime(start);
		const primary = createStoreDouble();
		const fallback = createStoreDouble();
		const health = vi.fn(async () => true);
		health.mockResolvedValueOnce(false);
		health.mockResolvedValueOnce(true);
		const router = createHealthRoutedStore({
			primary,
			fallback,
			check: health,
			refreshIntervalMs: 5,
			backoffMs: 5,
			label: 'unit-test',
		});

		await router.upsert(baseMemory);
		expect(fallback.upsert as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(10);
		await router.list();

		expect(primary.list as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
		expect(health).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
});
