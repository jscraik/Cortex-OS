import { vi } from 'vitest';
import { createStoreForKind } from '../../src/config/store-from-env.js';
import type { Memory } from '../../src/domain/types.js';
import type { MemoryStore } from '../../src/ports/MemoryStore.js';

type PrismaRow = {
	id: string;
	kind: Memory['kind'];
	text: string | null;
	vector: number[] | null;
	tags: string[];
	ttl: string | null;
	createdAt: Date;
	updatedAt: Date;
	provenance: Memory['provenance'];
	policy: Memory['policy'] | null;
	embeddingModel: string | null;
};

export type HarnessResult = {
	store: MemoryStore;
	teardown: () => void;
};

export async function setupPrismaHarness(base: Memory): Promise<HarnessResult> {
	const records = new Map<string, Memory>();
	const prisma = { memory: buildPrismaApi(records) } as const;

	(globalThis as { __MEMORIES_PRISMA_CLIENT__?: unknown }).__MEMORIES_PRISMA_CLIENT__ = prisma;
	const store = await createStoreForKind('prisma');

	return {
		store,
		teardown: () => {
			delete (globalThis as { __MEMORIES_PRISMA_CLIENT__?: unknown }).__MEMORIES_PRISMA_CLIENT__;
			records.clear();
		},
	};
}

export async function setupLocalHarness(base: Memory): Promise<HarnessResult> {
	const documents = new Map<string, Memory>();
	const originalFetch = typeof fetch === 'function' ? fetch.bind(globalThis) : undefined;
	globalThis.fetch = createLocalFetch(documents, base, originalFetch) as typeof fetch;

	const store = await createStoreForKind('local');
	return {
		store,
		teardown: () => {
			documents.clear();
			if (originalFetch) {
				globalThis.fetch = originalFetch;
			} else {
				delete (globalThis as { fetch?: typeof fetch }).fetch;
			}
		},
	};
}

function buildPrismaApi(records: Map<string, Memory>) {
	return {
		upsert: vi.fn(async ({ where, create }: { where: { id: string }; create: Memory }) => {
			records.set(where.id, { ...create });
			return toPrismaRow(records.get(where.id)!);
		}),
		findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
			const match = records.get(where.id);
			return match ? toPrismaRow(match) : null;
		}),
		delete: vi.fn(async ({ where }: { where: { id: string } }) => {
			records.delete(where.id);
		}),
		findMany: vi.fn(async (args?: { where?: Record<string, unknown> }) => {
			let values = Array.from(records.values());
			values = filterByText(values, args);
			values = filterByTags(values, args);
			values = filterByVector(values, args);
			return values.map(toPrismaRow);
		}),
		deleteMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
			let count = 0;
			for (const id of where.id.in) if (records.delete(id)) count += 1;
			return { count };
		}),
	};
}

function filterByText(values: Memory[], args?: { where?: Record<string, unknown> }) {
	const filters = Array.isArray(args?.where?.AND) ? args?.where?.AND : [];
	const textFilter = filters.find((item: any) => item?.text?.contains);
	if (!textFilter) return values;
	const needle = String(textFilter.text.contains).toLowerCase();
	return values.filter((mem) => (mem.text ?? '').toLowerCase().includes(needle));
}

function filterByTags(values: Memory[], args?: { where?: Record<string, unknown> }) {
	const filters = Array.isArray(args?.where?.AND) ? args?.where?.AND : [];
	const tagsFilter = filters.find((item: any) => item?.tags?.hasEvery);
	if (!tagsFilter) return values;
	const required: string[] = tagsFilter.tags.hasEvery ?? [];
	return values.filter((mem) => required.every((tag) => (mem.tags ?? []).includes(tag)));
}

function filterByVector(values: Memory[], args?: { where?: Record<string, unknown> }) {
	const filters = Array.isArray(args?.where?.AND) ? args?.where?.AND : [];
	const vectorFilter = filters.find((item: any) => item?.vector?.not !== undefined);
	if (!vectorFilter) return values;
	return values.filter((mem) => Array.isArray(mem.vector));
}

function toPrismaRow(memory: Memory): PrismaRow {
	return {
		id: memory.id,
		kind: memory.kind,
		text: memory.text ?? null,
		vector: memory.vector ?? null,
		tags: memory.tags ?? [],
		ttl: memory.ttl ?? null,
		createdAt: new Date(memory.createdAt),
		updatedAt: new Date(memory.updatedAt),
		provenance: memory.provenance ?? { source: 'system' },
		policy: memory.policy ?? null,
		embeddingModel: memory.embeddingModel ?? null,
	};
}

function createLocalFetch(documents: Map<string, Memory>, base: Memory, fallback?: typeof fetch) {
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const target = new URL(typeof input === 'string' ? input : input.toString());
		const method = (init?.method ?? 'GET').toUpperCase();
		const path = target.pathname.replace(/\/$/, '');

		if (method === 'PUT' && path.startsWith('/memories/'))
			return handlePut(documents, base, path, init);
		if (method === 'GET' && path.startsWith('/memories/')) return handleGet(documents, path);
		if (method === 'DELETE' && path.startsWith('/memories/')) return handleDelete(documents, path);
		if (method === 'GET' && path === '/memories/search') {
			return okResponse({ items: [...documents.values()] });
		}
		if (fallback) return fallback(input as any, init);
		return { ok: false, status: 500, json: async () => ({}) };
	});
}

function handlePut(documents: Map<string, Memory>, base: Memory, path: string, init?: RequestInit) {
	const id = decodeURIComponent(path.split('/').pop() ?? '');
	const payload = JSON.parse(String(init?.body ?? '{}'));
	const normalized: Memory = { ...base, ...payload, id };
	documents.set(id, normalized);
	return okResponse({ data: normalized });
}

function handleGet(documents: Map<string, Memory>, path: string) {
	const id = decodeURIComponent(path.split('/').pop() ?? '');
	const doc = documents.get(id);
	if (!doc) return { ok: false, status: 404, json: async () => ({}) };
	return okResponse({ data: doc });
}

function handleDelete(documents: Map<string, Memory>, path: string) {
	const id = decodeURIComponent(path.split('/').pop() ?? '');
	documents.delete(id);
	return okResponse({ success: true });
}

function okResponse(payload: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => payload,
	};
}
