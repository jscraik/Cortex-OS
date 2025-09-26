import { PolicyEncryptedStore } from '../adapters/store.encrypted.policy.js';
import { LayeredMemoryStore } from '../adapters/store.layered.js';
import { ENV, EXTERNAL_ENV, getEnvWithFallback } from '../config/constants.js';
import {
	createStoreForKind,
	normalizeStoreKind,
	type StoreKind,
} from '../config/store-from-env.js';
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
	const secret = process.env[ENV.ENCRYPTION_SECRET];
	const namespaces = (process.env[ENV.ENCRYPTION_NAMESPACES] || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const regex = process.env[ENV.ENCRYPTION_REGEX] || '';
	const encryptVectors = (process.env[ENV.ENCRYPT_VECTORS] || 'false').toLowerCase() === 'true';
	const encryptTags = (process.env[ENV.ENCRYPT_TAGS] || 'false').toLowerCase() === 'true';

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
// Kinds: memory | sqlite | prisma | local | qdrant
export async function createLayeredStoreFromEnv(opts?: LayeredEnvOptions): Promise<MemoryStore> {
	const defaultShort: StoreKind = process.env[EXTERNAL_ENV.QDRANT_URL] ? 'qdrant' : 'memory';
	const shortKindRaw = process.env.MEMORIES_SHORT_STORE ?? defaultShort;
	const longKindRaw =
		getEnvWithFallback(
			'MEMORIES_LONG_STORE',
			[ENV.STORE_ADAPTER_LEGACY, ENV.STORE_ADAPTER_LEGACY2],
			{ context: 'long-term store adapter' },
		) ?? 'memory';

	const shortKind = normalizeStoreKind(shortKindRaw) ?? defaultShort;
	const longKind = normalizeStoreKind(longKindRaw) ?? 'memory';

	const shortTerm = await createStoreForKind(shortKind, {
		prismaClient: opts?.prismaShort,
	});
	const longTerm = await createStoreForKind(longKind, {
		prismaClient: opts?.prismaLong,
	});
	return new LayeredMemoryStore(shortTerm, longTerm);
}

// Build policy-aware layered store using both layered and encryption env
export async function createPolicyAwareStoreFromEnv(
	opts?: LayeredEnvOptions,
): Promise<MemoryStore> {
	const layered = await createLayeredStoreFromEnv(opts);
	// Use the same layered store for both short and long term by default
	return createPolicyStoreFromEnv(layered, layered);
}
