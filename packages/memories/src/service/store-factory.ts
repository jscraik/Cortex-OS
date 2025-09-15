import { PolicyEncryptedStore } from '../adapters/store.encrypted.policy.js';
import { LayeredMemoryStore } from '../adapters/store.layered.js';
import { LocalMemoryStore } from '../adapters/store.localmemory.js';
import { InMemoryStore } from '../adapters/store.memory.js';
import type { PrismaLike } from '../adapters/store.prisma/client.js';
import { PrismaStore } from '../adapters/store.prisma/client.js';
import { SQLiteStore } from '../adapters/store.sqlite.js';
import { type EncryptionService, InMemoryAesGcm } from '../ports/Encryption.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type NamespaceSelectorConfig = {
	namespaces?: string[];
	regex?: string; // JS regex string, tested with new RegExp(regex)
};

export function buildNamespaceSelector(cfg: NamespaceSelectorConfig) {
	const set = new Set((cfg.namespaces ?? []).map((s) => String(s)));
	const re = cfg.regex ? new RegExp(cfg.regex) : null;
	return (ns: string) => set.has(ns) || (re ? re.test(ns) : false);
}

export type StoreFactoryConfig = {
	shortTerm: MemoryStore;
	longTerm: MemoryStore;
	encryption?: {
		secret: string;
		selector?: (namespace: string) => boolean;
		encryptVectors?: boolean;
		encryptTags?: boolean;
		provider?: EncryptionService; // optional custom implementation
	};
};

export function createPolicyAwareStore(cfg: StoreFactoryConfig): MemoryStore {
	const layered = new LayeredMemoryStore(cfg.shortTerm, cfg.longTerm);
	const enc = cfg.encryption;
	if (!enc) return layered;

	const crypto = enc.provider ?? new InMemoryAesGcm(enc.secret);
	const selector = enc.selector ?? (() => false);
	return new PolicyEncryptedStore(layered, crypto, (ns) => selector(ns), {
		encryptTags: enc.encryptTags,
		encryptVectors: enc.encryptVectors,
	});
}

// Convenience to create policy-aware (encrypted) layered store from env vars
// MEMORIES_ENCRYPTION_SECRET=<string>
// MEMORIES_ENCRYPTION_NAMESPACES=secure,pii
// MEMORIES_ENCRYPTION_REGEX=^sec:
export function createPolicyStoreFromEnv(
	shortTerm: MemoryStore,
	longTerm: MemoryStore,
): MemoryStore {
	const secret = process.env.MEMORIES_ENCRYPTION_SECRET;
	const namespaces = (process.env.MEMORIES_ENCRYPTION_NAMESPACES || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const regex = process.env.MEMORIES_ENCRYPTION_REGEX || '';
	const encryptVectors =
		(process.env.MEMORIES_ENCRYPT_VECTORS || 'false').toLowerCase() === 'true';
	const encryptTags =
		(process.env.MEMORIES_ENCRYPT_TAGS || 'false').toLowerCase() === 'true';

	const selector = buildNamespaceSelector({
		namespaces,
		regex: regex || undefined,
	});
	if (!secret) return new LayeredMemoryStore(shortTerm, longTerm);
	return createPolicyAwareStore({
		shortTerm,
		longTerm,
		encryption: { secret, selector, encryptVectors, encryptTags },
	});
}

export type LayeredEnvOptions = {
	prismaShort?: { memory?: unknown };
	prismaLong?: { memory?: unknown };
};

// Build layered store from env: MEMORIES_SHORT_STORE, MEMORIES_LONG_STORE
// Kinds: memory | sqlite | prisma | local
export function createLayeredStoreFromEnv(
	opts?: LayeredEnvOptions,
): MemoryStore {
	const shortKind = (
		process.env.MEMORIES_SHORT_STORE || 'memory'
	).toLowerCase();
	const longKind =
		(
			process.env.MEMORIES_LONG_STORE ||
			process.env.MEMORIES_ADAPTER ||
			process.env.MEMORY_STORE ||
			''
		).toLowerCase() || 'sqlite';

	const makeStore = (
		kind: string,
		prismaClient?: { memory?: unknown } | undefined,
	): MemoryStore => {
		if (kind === 'local') {
			return new LocalMemoryStore({
				baseUrl: process.env.LOCAL_MEMORY_BASE_URL,
				apiKey: process.env.LOCAL_MEMORY_API_KEY,
				defaultNamespace: process.env.LOCAL_MEMORY_NAMESPACE,
			});
		}
		if (kind === 'sqlite') {
			const dbPath = process.env.MEMORIES_SQLITE_PATH || './data/memories.db';
			const dim = Number(process.env.MEMORIES_VECTOR_DIM || '1536');
			return new SQLiteStore(dbPath, dim);
		}
		if (kind === 'prisma') {
			const prismaUnknown =
				prismaClient ??
				(
					globalThis as unknown as {
						__MEMORIES_PRISMA_CLIENT__?: { memory?: unknown };
					}
				).__MEMORIES_PRISMA_CLIENT__;
			if (
				!prismaUnknown ||
				!(prismaUnknown as Record<string, unknown>).memory
			) {
				throw new Error('Prisma client not provided for layered store.');
			}
			// Cast to PrismaLike to ensure required shape
			return new PrismaStore(prismaUnknown as PrismaLike);
		}
		// default memory
		return new InMemoryStore();
	};

	const shortTerm = makeStore(shortKind, opts?.prismaShort);
	const longTerm = makeStore(longKind, opts?.prismaLong);
	return new LayeredMemoryStore(shortTerm, longTerm);
}

// Build policy-aware layered store using both layered and encryption env
export function createPolicyAwareStoreFromEnv(
	opts?: LayeredEnvOptions,
): MemoryStore {
	const layered = createLayeredStoreFromEnv(opts);
	return createPolicyStoreFromEnv(layered, layered);
}
