import { LocalMemoryStore } from '../adapters/store.localmemory.js';
import {
	type PrismaLike,
	PrismaStore,
} from '../adapters/store.prisma/client.js';
import { SQLiteStore } from '../adapters/store.sqlite.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type StoreKind = 'local' | 'sqlite' | 'prisma' | 'memory';

export function resolveStoreKindFromEnv(): StoreKind {
	const raw = (
		process.env.MEMORIES_ADAPTER ||
		process.env.MEMORY_STORE ||
		''
	).toLowerCase();
	if (raw === 'local') return 'local';
	if (raw === 'sqlite') return 'sqlite';
	if (raw === 'prisma') return 'prisma';
	if (raw === 'memory') return 'memory';
	// If Local Memory base URL is present, prefer it
	if (process.env.LOCAL_MEMORY_BASE_URL) return 'local';
	// Default to sqlite for local dev if better-sqlite3 is available, otherwise local
	return 'sqlite';
}

/**
 * Create a MemoryStore instance based on environment variables.
 *
 * Supported env vars:
 * - `MEMORIES_ADAPTER` | `MEMORY_STORE`: one of `local`, `sqlite`, `prisma`, `memory`
 * - `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`
 * - `MEMORIES_SQLITE_PATH` (default: `./data/memories.db`), `MEMORIES_VECTOR_DIM` (default: 1536)
 */
export async function createStoreFromEnv(opts?: {
	prismaClient?: unknown;
}): Promise<MemoryStore> {
	const kind = resolveStoreKindFromEnv();
	switch (kind) {
		case 'local': {
			return new LocalMemoryStore({
				baseUrl: process.env.LOCAL_MEMORY_BASE_URL,
				apiKey: process.env.LOCAL_MEMORY_API_KEY,
				defaultNamespace: process.env.LOCAL_MEMORY_NAMESPACE,
			});
		}
		case 'sqlite': {
			const dbPath = process.env.MEMORIES_SQLITE_PATH || './data/memories.db';
			const dim = Number(process.env.MEMORIES_VECTOR_DIM || '1536');
			return new SQLiteStore(dbPath, dim);
		}
		case 'prisma': {
			// Expect a prisma client instance to be provided at runtime.
			// If unavailable, throw an instructive error.
			const prismaUnknown =
				opts?.prismaClient ??
				(globalThis as unknown as { __MEMORIES_PRISMA_CLIENT__?: unknown })
					.__MEMORIES_PRISMA_CLIENT__;
			if (
				!prismaUnknown ||
				!(prismaUnknown as Record<string, unknown>).memory
			) {
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
			const mod = await import('../adapters/store.memory.js');
			return new mod.InMemoryStore();
		}
	}
}
