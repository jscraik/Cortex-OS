import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory } from '../src/domain/types.js';
import type { MemoryStore } from '../src/ports/MemoryStore.js';

const qdrantHealthMock = vi.fn(async () => true);
const qdrantInstances: FakeQdrantStore[] = [];
const memoryInstances: FakeMemoryStore[] = [];

class FakeQdrantStore implements MemoryStore {
    readonly upsert = vi.fn(async (memory: Memory, _namespace?: string) => memory);
    readonly get = vi.fn(async () => null);
    readonly delete = vi.fn(async () => { });
    readonly searchByText = vi.fn(async () => [] as Memory[]);
    readonly searchByVector = vi.fn(async () => [] as (Memory & { score: number })[]);
    readonly purgeExpired = vi.fn(async () => 0);
    readonly list = vi.fn(async () => [] as Memory[]);
    readonly healthCheck = qdrantHealthMock;
}

class FakeMemoryStore implements MemoryStore {
    readonly upsert = vi.fn(async (memory: Memory, _namespace?: string) => memory);
    readonly get = vi.fn(async () => null);
    readonly delete = vi.fn(async () => { });
    readonly searchByText = vi.fn(async () => [] as Memory[]);
    readonly searchByVector = vi.fn(async () => [] as (Memory & { score: number })[]);
    readonly purgeExpired = vi.fn(async () => 0);
    readonly list = vi.fn(async () => [] as Memory[]);
}

vi.mock('../src/adapters/store.qdrant.js', () => ({
    __esModule: true,
    QdrantMemoryStore: vi.fn(() => {
        const instance = new FakeQdrantStore();
        qdrantInstances.push(instance);
        return instance;
    }),
}));

vi.mock('../src/adapters/store.memory.js', () => ({
    __esModule: true,
    InMemoryStore: vi.fn(() => {
        const instance = new FakeMemoryStore();
        memoryInstances.push(instance);
        return instance;
    }),
}));

import { createStoreFromEnv } from '../src/config/store-from-env.js';

const ORIGINAL_ENV = { ...process.env };
const sampleMemory: Memory = {
    id: 'fallback-1',
    kind: 'note',
    text: 'health integration test',
    tags: [],
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    provenance: { source: 'system' },
};

describe('createStoreFromEnv health routing integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        qdrantHealthMock.mockReset();
        qdrantHealthMock.mockResolvedValue(true);
        qdrantInstances.length = 0;
        memoryInstances.length = 0;
        process.env = { ...ORIGINAL_ENV };
        process.env.QDRANT_URL = 'http://localhost:6333';
        process.env.MEMORIES_FALLBACK_STORE = 'memory';
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('delegates to primary when Qdrant is healthy', async () => {
        qdrantHealthMock.mockResolvedValue(true);
        const store = await createStoreFromEnv();

        await store.upsert(sampleMemory);

        expect(qdrantInstances).toHaveLength(1);
        expect(qdrantInstances[0].upsert).toHaveBeenCalledTimes(1);
        expect(memoryInstances[0]?.upsert).toBeUndefined();
    });

    it('falls back to the configured adapter when Qdrant is unhealthy', async () => {
        qdrantHealthMock.mockResolvedValueOnce(false);
        const store = await createStoreFromEnv();

        await store.upsert(sampleMemory);

        expect(qdrantInstances[0].upsert).not.toHaveBeenCalled();
        expect(memoryInstances[0].upsert).toHaveBeenCalledTimes(1);
    });

    it('recovers primary after health check passes again', async () => {
        vi.useFakeTimers();
        qdrantHealthMock.mockResolvedValueOnce(false);
        qdrantHealthMock.mockResolvedValueOnce(true);
        const store = await createStoreFromEnv();

        await store.upsert(sampleMemory);
        expect(memoryInstances[0].upsert).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(10);
        await store.list();

        expect(qdrantInstances[0].list).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
