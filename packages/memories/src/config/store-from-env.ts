import { createHealthRoutedStore } from '../adapters/store.health-router.js';
import { LocalMemoryStore } from '../adapters/store.localmemory.js';
import { type PrismaLike, PrismaStore } from '../adapters/store.prisma/client.js';
import type { MemoryStore } from '../ports/MemoryStore.js';
import { ENV, EXTERNAL_ENV, getEnvWithFallback } from './constants.js';

export type StoreKind = 'local' | 'sqlite' | 'external-sqlite' | 'prisma' | 'memory' | 'qdrant';

type CreateStoreOptions = {
	prismaClient?: unknown;
};

type HealthCapableStore = MemoryStore & {
	healthCheck?: () => Promise<boolean>;
};

export const normalizeStoreKind = (raw: string | undefined): StoreKind | null => {
	if (!raw) return null;
	const value = raw.toLowerCase();
	if (value === 'local' || value === 'local-mcp' || value === 'local-memory') return 'local';
	if (value === 'sqlite') return 'sqlite';
	if (value === 'external-sqlite' || value === 'external_sqlite') return 'external-sqlite';
	if (value === 'prisma') return 'prisma';
	if (value === 'memory' || value === 'in-memory') return 'memory';
	if (value === 'qdrant' || value === 'vector') return 'qdrant';
	return null;
};

const prefersExternalSqlite = (): boolean =>
	process.env.MEMORIES_EXTERNAL_STORAGE_ENABLED === 'true';

const hasLocalMemoryService = (): boolean => !!process.env[ENV.LOCAL_MEMORY_BASE_URL];

const readExplicitFallbackKind = (): StoreKind | null =>
	normalizeStoreKind(process.env[ENV.FALLBACK_STORE]);

const resolveFallbackKind = (primary: StoreKind): StoreKind => {
	if (primary !== 'qdrant') return primary;
	const explicit = readExplicitFallbackKind();
	if (explicit && explicit !== 'qdrant') return explicit;
	if (prefersExternalSqlite()) return 'external-sqlite';
	if (hasLocalMemoryService()) return 'local';
	return 'sqlite';
};

const createLocalStore = (): MemoryStore =>
	new LocalMemoryStore({
		baseUrl: process.env[ENV.LOCAL_MEMORY_BASE_URL],
		apiKey: process.env[ENV.LOCAL_MEMORY_API_KEY],
		defaultNamespace: process.env[ENV.LOCAL_MEMORY_NAMESPACE],
	}) as unknown as MemoryStore;

const createSqliteStore = async (): Promise<MemoryStore> => {
	if (prefersExternalSqlite()) return createExternalSqliteStore();
	const { SQLiteStore } = await import('../adapters/store.sqlite.js');
	return new SQLiteStore(':memory:', 384) as unknown as MemoryStore;
};

const createExternalSqliteStore = async (): Promise<MemoryStore> => {
	const { initializeExternalStorage } = await import('../adapters/external-storage.js');
	const { ExternalSqliteStore } = await import('../adapters/store.external-sqlite.js');
	const externalManager = await initializeExternalStorage();
	return new ExternalSqliteStore({
		dbName: process.env.MEMORIES_EXTERNAL_STORAGE_DB_NAME || 'memories.db',
		externalStorageManager: externalManager,
	}) as unknown as MemoryStore;
};

const readPrismaCandidate = (opts?: CreateStoreOptions): unknown => {
	if (opts?.prismaClient) return opts.prismaClient;
	return (globalThis as unknown as { __MEMORIES_PRISMA_CLIENT__?: unknown })
		.__MEMORIES_PRISMA_CLIENT__;
};

const assertValidPrismaClient = (candidate: unknown): asserts candidate is PrismaLike => {
	const hasModel =
		!!candidate &&
		typeof candidate === 'object' &&
		'memory' in (candidate as Record<string, unknown>) &&
		typeof (candidate as { memory?: unknown }).memory === 'object';
	if (!hasModel) {
		throw new Error(
			'Prisma client not provided. Set global __MEMORIES_PRISMA_CLIENT__ or use SQLite/Local.',
		);
	}
};

const createPrismaStore = async (opts?: CreateStoreOptions): Promise<MemoryStore> => {
	const candidate = readPrismaCandidate(opts);
	assertValidPrismaClient(candidate);
	const prisma = candidate as PrismaLike;
	return new PrismaStore(prisma) as unknown as MemoryStore;
};

const createQdrantStore = async (): Promise<HealthCapableStore> => {
	const { QdrantMemoryStore } = await import('../adapters/store.qdrant.js');
	return new QdrantMemoryStore();
};

const createInMemoryStore = async (): Promise<MemoryStore> => {
	const mod = await import('../adapters/store.memory.js');
	return new mod.InMemoryStore();
};

const instantiateBaseStore = async (
	kind: StoreKind,
	opts?: CreateStoreOptions,
): Promise<MemoryStore> => {
	if (kind === 'local') return createLocalStore();
	if (kind === 'sqlite') return createSqliteStore();
	if (kind === 'external-sqlite') return createExternalSqliteStore();
	if (kind === 'prisma') return createPrismaStore(opts);
	if (kind === 'qdrant') return createQdrantStore();
	return createInMemoryStore();
};

const buildHealthCheck = (store: HealthCapableStore): (() => Promise<boolean>) => {
	return async () => {
		if (typeof store.healthCheck === 'function') return store.healthCheck();
		return true;
	};
};

const createStoreForKindInternal = async (
	kind: StoreKind,
	opts: CreateStoreOptions | undefined,
	enableHealthRouting: boolean,
): Promise<MemoryStore> => {
	const base = await instantiateBaseStore(kind, opts);
	if (!enableHealthRouting || kind !== 'qdrant') return base;
	const fallbackKind = resolveFallbackKind(kind);
	if (fallbackKind === 'qdrant') return base;
	const fallback = await createStoreForKindInternal(fallbackKind, opts, false);
	return createHealthRoutedStore({
		primary: base,
		fallback,
		check: buildHealthCheck(base as HealthCapableStore),
		label: `qdrant->${fallbackKind}`,
	});
};

export function resolveStoreKindFromEnv(): StoreKind {
	const shortStoreKind = normalizeStoreKind(process.env[ENV.SHORT_STORE]);
	if (shortStoreKind) return shortStoreKind;

	const adapterKind = normalizeStoreKind(
		getEnvWithFallback(ENV.STORE_ADAPTER, [ENV.STORE_ADAPTER_LEGACY, ENV.STORE_ADAPTER_LEGACY2], {
			context: 'store adapter selection',
			deprecationWarning: true,
		}),
	);
	if (adapterKind) return adapterKind;

	if (process.env[EXTERNAL_ENV.QDRANT_URL]) return 'qdrant';
	if (process.env[ENV.LOCAL_MEMORY_BASE_URL]) return 'local';
	if (prefersExternalSqlite()) return 'external-sqlite';
	return 'memory';
}

/**
 * Create a MemoryStore instance based on environment variables.
 *
 * Supported env vars:
 * - `MEMORIES_STORE_ADAPTER` (standardized) | `MEMORIES_ADAPTER` | `MEMORY_STORE` (legacy): one of `local`, `sqlite`, `external-sqlite`, `prisma`, `memory`, `qdrant`
 * - `MEMORIES_FALLBACK_STORE`: fallback adapter when the primary (usually Qdrant) is unavailable
 * - `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`
 * - `MEMORIES_SQLITE_PATH` (default: `./data/memories.db`), `MEMORIES_VECTOR_DIM` (default: 1536)
 * - `MEMORIES_EXTERNAL_STORAGE_ENABLED`: Enable external storage (default: false)
 * - `MEMORIES_EXTERNAL_STORAGE_PREFERRED_PATH`: Preferred external storage path (default: /Volumes/ExternalSSD/cortex-memories)
 * - `MEMORIES_EXTERNAL_STORAGE_FALLBACK_PATHS`: Comma-separated fallback paths
 * - `MEMORIES_EXTERNAL_STORAGE_DB_NAME`: Database name for external storage (default: memories.db)
 */
export async function createStoreFromEnv(opts?: CreateStoreOptions): Promise<MemoryStore> {
	const primaryKind = resolveStoreKindFromEnv();
	return createStoreForKindInternal(primaryKind, opts, true);
}

export const createStoreForKind = async (
	kind: StoreKind,
	opts?: CreateStoreOptions,
): Promise<MemoryStore> => createStoreForKindInternal(kind, opts, true);
