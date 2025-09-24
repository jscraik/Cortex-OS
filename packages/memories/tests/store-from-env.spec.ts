import { beforeEach, describe, expect, it } from 'vitest';
import { createStoreFromEnv, resolveStoreKindFromEnv } from '../src/index.js';

// Save original env
const ORIGINAL_ENV = { ...process.env };

describe('store-from-env', () => {
	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
		if ('__MEMORIES_PRISMA_CLIENT__' in (globalThis as Record<string, unknown>)) {
			delete (globalThis as Record<string, unknown>).__MEMORIES_PRISMA_CLIENT__;
		}
	});

	it('prefers LocalMemory when LOCAL_MEMORY_BASE_URL is set', async () => {
		process.env.LOCAL_MEMORY_BASE_URL = 'http://localhost:3028/api/v1';
		const kind = resolveStoreKindFromEnv();
		expect(kind).toBe('local');
		const store = await createStoreFromEnv();
		expect(store).toBeTruthy();
		expect(
			'searchByText' in store &&
				typeof (store as { searchByText: unknown }).searchByText === 'function',
		).toBe(true);
	});

	it('honors MEMORIES_SHORT_STORE aliases before legacy adapters', () => {
		process.env.MEMORIES_SHORT_STORE = 'local-mcp';
		process.env.LOCAL_MEMORY_BASE_URL = 'http://localhost:3028/api/v1';
		expect(resolveStoreKindFromEnv()).toBe('local');

		process.env.MEMORIES_SHORT_STORE = 'external_sqlite';
		expect(resolveStoreKindFromEnv()).toBe('external-sqlite');

		process.env.MEMORIES_SHORT_STORE = 'memory';
		expect(resolveStoreKindFromEnv()).toBe('memory');
	});

	it('falls back to memory adapter when explicitly requested', async () => {
		process.env.MEMORY_STORE = 'memory';
		const store = await createStoreFromEnv();
		const saved = await store.upsert({
			id: 'x',
			kind: 'note',
			text: 'hi',
			tags: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			provenance: { source: 'system' },
		});
		expect(saved.id).toBe('x');
	});
});
