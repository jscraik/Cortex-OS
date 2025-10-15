import { LocalMemoryProvider, RemoteMemoryProvider } from '@cortex-os/memory-core';
import { ENV, getEnvWithFallback } from './constants.js';
import { createProviderStore } from './memory-provider-store.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type StoreKind = 'local' | 'sqlite' | 'external-sqlite' | 'prisma' | 'memory' | 'qdrant';

export type CreateStoreOptions = {
        prismaClient?: unknown;
};

export const STORE_FROM_ENV_REMOVED = false;

const STORE_ALIASES = new Map<string, StoreKind>([
        ['local', 'local'],
        ['local-memory', 'local'],
        ['local_memory', 'local'],
        ['local-mcp', 'local'],
        ['local_mcp', 'local'],
        ['remote', 'local'],
        ['remote-memory', 'local'],
        ['memory', 'memory'],
        ['in-memory', 'memory'],
        ['mem', 'memory'],
        ['sqlite', 'sqlite'],
        ['external-sqlite', 'external-sqlite'],
        ['external_sqlite', 'external-sqlite'],
        ['prisma', 'prisma'],
        ['qdrant', 'qdrant'],
]);

const FALLBACK_RECOVERY_MS = 5_000;

export const normalizeStoreKind = (raw: string | undefined): StoreKind | null => {
        if (!raw) return null;
        const key = raw.trim().toLowerCase();
        return STORE_ALIASES.get(key) ?? null;
};

export const resolveStoreKindFromEnv = (): StoreKind => {
        if (process.env[ENV.LOCAL_MEMORY_BASE_URL]) {
                return 'local';
        }

        const short = normalizeStoreKind(process.env[ENV.SHORT_STORE]);
        if (short) return short;

        const adapter = normalizeStoreKind(
                getEnvWithFallback(
                        ENV.STORE_ADAPTER,
                        [ENV.STORE_ADAPTER_LEGACY, ENV.STORE_ADAPTER_LEGACY2],
                        { deprecationWarning: false },
                ),
        );
        if (adapter) return adapter;

        const legacyMemoryStore = normalizeStoreKind(process.env.MEMORY_STORE);
        if (legacyMemoryStore) return legacyMemoryStore;

        if (process.env.QDRANT_URL) {
                return 'qdrant';
        }

        return 'memory';
};

function buildStoreForKind(kind: StoreKind): MemoryStore {
        switch (kind) {
                case 'local': {
                        const baseUrl =
                                process.env[ENV.LOCAL_MEMORY_BASE_URL] ?? 'http://127.0.0.1:3028/api/v1';
                        const apiKey = process.env[ENV.LOCAL_MEMORY_API_KEY] ?? process.env.LOCAL_MEMORY_API_KEY;
                        return createProviderStore(
                                new RemoteMemoryProvider({
                                        baseUrl,
                                        apiKey,
                                }),
                        );
                }
                case 'qdrant':
                case 'sqlite':
                case 'external-sqlite':
                case 'prisma':
                case 'memory':
                default: {
                        return createProviderStore(new LocalMemoryProvider());
                }
        }
}

class FailoverMemoryStore implements MemoryStore {
        private active: 'primary' | 'fallback' = 'primary';

        private lastFailure = 0;

        constructor(
                private readonly primary: MemoryStore,
                private readonly fallback: MemoryStore,
                private readonly recoveryMs = FALLBACK_RECOVERY_MS,
        ) {}

        private async withStore<T>(operation: (store: MemoryStore) => Promise<T>): Promise<T> {
                if (this.active === 'fallback' && Date.now() - this.lastFailure > this.recoveryMs) {
                        this.active = 'primary';
                }

                const store = this.active === 'primary' ? this.primary : this.fallback;

                try {
                        return await operation(store);
                } catch (error) {
                        if (this.active === 'primary') {
                                this.active = 'fallback';
                                this.lastFailure = Date.now();
                                return operation(this.fallback);
                        }
                        throw error;
                }
        }

        upsert(memory: Memory, namespace?: string): Promise<Memory> {
                return this.withStore((store) => store.upsert(memory, namespace));
        }

        get(id: string, namespace?: string): Promise<Memory | null> {
                return this.withStore((store) => store.get(id, namespace));
        }

        delete(id: string, namespace?: string): Promise<void> {
                return this.withStore((store) => store.delete(id, namespace));
        }

        searchByText(query: Parameters<MemoryStore['searchByText']>[0], namespace?: string) {
                return this.withStore((store) => store.searchByText(query, namespace));
        }

        searchByVector(query: Parameters<MemoryStore['searchByVector']>[0], namespace?: string) {
                return this.withStore((store) => store.searchByVector(query, namespace));
        }

        purgeExpired(nowISO: string, namespace?: string): Promise<number> {
                return this.withStore((store) => store.purgeExpired(nowISO, namespace));
        }

        list(namespace?: string, limit?: number, offset?: number): Promise<Memory[]> {
                return this.withStore((store) => store.list(namespace, limit, offset));
        }
}

export async function createStoreForKind(
        kind: StoreKind,
        _opts?: CreateStoreOptions,
): Promise<MemoryStore> {
        return buildStoreForKind(kind);
}

export async function createStoreFromEnv(opts?: CreateStoreOptions): Promise<MemoryStore> {
        const primaryKind = resolveStoreKindFromEnv();
        const fallbackEnv = normalizeStoreKind(process.env.MEMORIES_FALLBACK_STORE);
        const fallbackKind = fallbackEnv ?? (primaryKind === 'qdrant' ? 'memory' : primaryKind);

        const primary = await createStoreForKind(primaryKind, opts);

        if (primaryKind === fallbackKind) {
                return primary;
        }

        const fallback = await createStoreForKind(fallbackKind, opts);
        return new FailoverMemoryStore(primary, fallback);
}
