import { LocalMemoryStore } from '../adapters/store.localmemory.js';
import { type PrismaLike, PrismaStore } from '../adapters/store.prisma/client.js';
import type { MemoryStore } from '../ports/MemoryStore.js';
import { ENV, getEnvWithFallback } from './constants.js';

export type StoreKind = 'local' | 'sqlite' | 'external-sqlite' | 'prisma' | 'memory';

export function resolveStoreKindFromEnv(): StoreKind {
	// Use centralized helper with fallback handling
	const raw =
		getEnvWithFallback(ENV.STORE_ADAPTER, [ENV.STORE_ADAPTER_LEGACY, ENV.STORE_ADAPTER_LEGACY2], {
			context: 'store adapter selection',
		})?.toLowerCase() || '';

	if (raw === 'local') return 'local';
	if (raw === 'sqlite') return 'sqlite';
	if (raw === 'external-sqlite') return 'external-sqlite';
	if (raw === 'prisma') return 'prisma';
	if (raw === 'memory') return 'memory';

	// If Local Memory base URL is present, prefer it
	if (process.env[ENV.LOCAL_MEMORY_BASE_URL]) return 'local';

	// If external storage is enabled, prefer external-sqlite
	if (process.env.MEMORIES_EXTERNAL_STORAGE_ENABLED === 'true') return 'external-sqlite';

	// Default to in-memory for tests/dev without persistence
	return 'memory';
}

/**
 * Create a MemoryStore instance based on environment variables.
 *
 * Supported env vars:
 * - `MEMORIES_STORE_ADAPTER` (standardized) | `MEMORIES_ADAPTER` | `MEMORY_STORE` (legacy): one of `local`, `sqlite`, `external-sqlite`, `prisma`, `memory`
 * - `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`
 * - `MEMORIES_SQLITE_PATH` (default: `./data/memories.db`), `MEMORIES_VECTOR_DIM` (default: 1536)
 * - `MEMORIES_EXTERNAL_STORAGE_ENABLED`: Enable external storage (default: false)
 * - `MEMORIES_EXTERNAL_STORAGE_PREFERRED_PATH`: Preferred external storage path (default: /Volumes/ExternalSSD/cortex-memories)
 * - `MEMORIES_EXTERNAL_STORAGE_FALLBACK_PATHS`: Comma-separated fallback paths
 * - `MEMORIES_EXTERNAL_STORAGE_DB_NAME`: Database name for external storage (default: memories.db)
 */
export async function createStoreFromEnv(opts?: { prismaClient?: unknown }): Promise<MemoryStore> {
	const kind = resolveStoreKindFromEnv();
	switch (kind) {
		case 'local': {
			return new LocalMemoryStore({
				baseUrl: process.env[ENV.LOCAL_MEMORY_BASE_URL],
				apiKey: process.env[ENV.LOCAL_MEMORY_API_KEY],
				defaultNamespace: process.env[ENV.LOCAL_MEMORY_NAMESPACE],
			});
		}
		case 'sqlite': {
			const { SQLiteStore } = await import('../adapters/store.sqlite');
			// Use in-memory SQLite by default for testing
			return new SQLiteStore(':memory:', 384);
		}
		case 'external-sqlite': {
			const { initializeExternalStorage } = await import('../adapters/external-storage');
			const { ExternalSqliteStore } = await import('../adapters/store.external-sqlite');
			const externalManager = await initializeExternalStorage();
			return new ExternalSqliteStore({
				dbName: process.env.MEMORIES_EXTERNAL_STORAGE_DB_NAME || 'memories.db',
				externalStorageManager: externalManager,
			});
		}
		case 'prisma': {
			// Expect a prisma client instance to be provided at runtime.
			// If unavailable, throw an instructive error.
			const prismaUnknown =
				opts?.prismaClient ??
				(globalThis as unknown as { __MEMORIES_PRISMA_CLIENT__?: unknown })
					.__MEMORIES_PRISMA_CLIENT__;
			if (!prismaUnknown || !(prismaUnknown as Record<string, unknown>).memory) {
				throw new Error(
					'Prisma client not provided. Set global __MEMORIES_PRISMA_CLIENT__ or use SQLite/Local.',
				);
			}
			// Narrow to PrismaLike at runtime: require `.memory` with expected methods
			const p = prismaUnknown as unknown;
			const hasModel =
				!!p &&
				typeof p === 'object' &&
				'memory' in (p as Record<string, unknown>) &&
				typeof (p as { memory?: unknown }).memory === 'object';
			if (!hasModel) {
				throw new Error('Invalid Prisma client: missing `memory` model');
			}
			return new PrismaStore(p as PrismaLike);
		}
		default: {
			// fallback to in-memory adapter for tests/dev without persistence
			const mod = await import('../adapters/store.memory');
			return new mod.InMemoryStore();
		}
	}
}
