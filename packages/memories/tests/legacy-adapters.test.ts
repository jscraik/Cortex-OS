import { describe, expect, it } from 'vitest';
import { RAG_ADAPTERS_REMOVED, RAGIntegration } from '../src/adapters/rag-integration.js';
import {
	HYBRID_SEARCH_MEMORY_STORE_REMOVED,
	HybridSearchMemoryStore,
} from '../src/adapters/store.hybrid-search.js';
import { QDRANT_MEMORY_STORE_REMOVED, QdrantMemoryStore } from '../src/adapters/store.qdrant.js';
import { SQLITE_STORE_REMOVED, SQLiteStore } from '../src/adapters/store.sqlite.js';
import {
	createStoreForKind,
	createStoreFromEnv,
	normalizeStoreKind,
	resolveStoreKindFromEnv,
	STORE_FROM_ENV_REMOVED,
} from '../src/config/store-from-env.js';

const expectLegacyError = async (fn: () => unknown) => {
	await expect(async () => {
		fn();
	}).rejects.toThrow(/@cortex-os\/memory-core/);
};

describe('legacy memory adapters', () => {
	it('SQLiteStore throws with migration guidance', async () => {
		expect(SQLITE_STORE_REMOVED).toBe(true);
		await expectLegacyError(() => new SQLiteStore(':memory:'));
	});

	it('QdrantMemoryStore throws with migration guidance', async () => {
		expect(QDRANT_MEMORY_STORE_REMOVED).toBe(true);
		await expectLegacyError(() => new QdrantMemoryStore());
	});

	it('HybridSearchMemoryStore throws with migration guidance', async () => {
		expect(HYBRID_SEARCH_MEMORY_STORE_REMOVED).toBe(true);
		await expectLegacyError(() => new HybridSearchMemoryStore({} as any));
	});

	it('RAG adapters throw with migration guidance', async () => {
		expect(RAG_ADAPTERS_REMOVED).toBe(true);
		await expectLegacyError(() => new RAGIntegration());
	});

        it('store-from-env helpers provide backward compatible stores', async () => {
                expect(STORE_FROM_ENV_REMOVED).toBe(false);

                const store = await createStoreFromEnv();
                expect(store).toBeTruthy();

                const normalized = normalizeStoreKind('external_sqlite');
                expect(normalized).toBe('external-sqlite');

                await expect(createStoreForKind('memory')).resolves.toBeTruthy();

                const original = process.env.MEMORY_STORE;
                process.env.MEMORY_STORE = 'memory';
                expect(resolveStoreKindFromEnv()).toBe('memory');
                if (original === undefined) {
                        delete process.env.MEMORY_STORE;
                } else {
                        process.env.MEMORY_STORE = original;
                }
        });
});
