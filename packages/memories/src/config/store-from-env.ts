import { legacyMemoryAdapterRemoved } from '../legacy.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type StoreKind = 'local' | 'sqlite' | 'external-sqlite' | 'prisma' | 'memory' | 'qdrant';

export type CreateStoreOptions = {
	prismaClient?: unknown;
};

export const STORE_FROM_ENV_REMOVED = true;

export const normalizeStoreKind = (_raw: string | undefined): StoreKind | null =>
	legacyMemoryAdapterRemoved<StoreKind | null>('normalizeStoreKind');

export const resolveStoreKindFromEnv = (): StoreKind =>
	legacyMemoryAdapterRemoved<StoreKind>('resolveStoreKindFromEnv');

export function createStoreFromEnv(_opts?: CreateStoreOptions): Promise<MemoryStore> {
	return legacyMemoryAdapterRemoved<Promise<MemoryStore>>('createStoreFromEnv');
}

export function createStoreForKind(
	_kind: StoreKind,
	_opts?: CreateStoreOptions,
): Promise<MemoryStore> {
	return legacyMemoryAdapterRemoved<Promise<MemoryStore>>('createStoreForKind');
}
