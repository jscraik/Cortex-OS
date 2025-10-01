import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, vi } from 'vitest';

import { getConfigHome } from '../src/platform/xdg.js';
import { initializeAuth } from '../src/security/auth.js';

type MemoryStoreRecord = {
	id: string;
	content: string;
	importance: number;
	tags: string[];
	domain?: string;
	metadata?: Record<string, unknown>;
	vectorIndexed: boolean;
};

if (!process.env.ROLLUP_SKIP_NATIVE_BUILD) {
	process.env.ROLLUP_SKIP_NATIVE_BUILD = 'true';
}

if (!process.env.ROLLUP_SKIP_NATIVE) {
	process.env.ROLLUP_SKIP_NATIVE = 'true';
}

const DEFAULT_MEMORY_BASE_URL =
	process.env.LOCAL_MEMORY_BASE_URL ?? 'https://memory-core.local/api/v1';
process.env.LOCAL_MEMORY_BASE_URL = DEFAULT_MEMORY_BASE_URL;

let memoryIdCounter = 1;
const memoryStore = new Map<string, MemoryStoreRecord>();

const makeResponse = (status: number, body: unknown) => ({
	ok: status >= 200 && status < 300,
	status,
	statusText: status === 201 ? 'Created' : 'OK',
	headers: {
		get: () => undefined,
	},
	json: async () => body,
});

const LOOPBACK_CONTEXT_DEFAULT = '__cortex-os-default__';
let loopbackToken: string | undefined;
let loopbackAuthHeader: string | undefined;
let loopbackTokenPromise: Promise<void> | undefined;
let loopbackContextKey: string | undefined;

function resolveLoopbackContext(): string {
	try {
		return getConfigHome();
	} catch {
		return LOOPBACK_CONTEXT_DEFAULT;
	}
}

async function ensureLoopbackToken(): Promise<void> {
	const currentContext = resolveLoopbackContext();
	if (loopbackContextKey === currentContext && loopbackTokenPromise) {
		await loopbackTokenPromise;
		return;
	}

	if (loopbackContextKey !== currentContext) {
		loopbackTokenPromise = undefined;
		loopbackToken = undefined;
		loopbackAuthHeader = undefined;
	}

	if (!loopbackTokenPromise) {
		loopbackContextKey = currentContext;
		loopbackTokenPromise = (async () => {
			const token = await initializeAuth();
			loopbackToken = token.token;
			loopbackAuthHeader = `Bearer ${token.token}`;
		})();
	}

	await loopbackTokenPromise;
}

export async function prepareLoopbackAuth(): Promise<{ token: string; header: string }> {
	await ensureLoopbackToken();
	if (!loopbackToken || !loopbackAuthHeader) {
		throw new Error('Loopback auth token not initialized for tests');
	}
	return { token: loopbackToken, header: loopbackAuthHeader };
}

export async function getLoopbackAuthHeader(): Promise<string> {
	const { header } = await prepareLoopbackAuth();
	return header;
}

export function getLoopbackTokenSync(): string {
	if (!loopbackToken) {
		throw new Error('Loopback auth token unavailable. Call await prepareLoopbackAuth() in your test setup.');
	}
	return loopbackToken;
}

export function getLoopbackAuthHeaderSync(): string {
	if (!loopbackAuthHeader) {
		throw new Error('Loopback auth header unavailable. Call await prepareLoopbackAuth() in your test setup.');
	}
	return loopbackAuthHeader;
}

const realFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;

const memoryFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === 'string' ? input : input.toString();
	const method = (init?.method ?? 'GET').toUpperCase();
	const toJson = async () => {
		if (!init?.body) return {};
		const body = typeof init.body === 'string' ? init.body : init.body.toString();
		return JSON.parse(body);
	};

	if (!url.startsWith(`${DEFAULT_MEMORY_BASE_URL}/memory/`)) {
		if (realFetch) {
			return realFetch(input as RequestInfo, init);
		}
		throw new Error(`Unexpected fetch call to ${url}`);
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/store` && method === 'POST') {
		const body = await toJson();
		const id = `remote-${memoryIdCounter++}`;
		memoryStore.set(id, {
			id,
			content: String(body.content ?? ''),
			importance: Number(body.importance ?? 5),
			tags: Array.isArray(body.tags) ? body.tags : [],
			domain: typeof body.domain === 'string' ? body.domain : undefined,
			metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
			vectorIndexed: true,
		});
		return makeResponse(201, {
			id,
			vectorIndexed: true,
			data: { id, vectorIndexed: true },
		});
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/search` && method === 'POST') {
		const body = await toJson();
		const query = String(body.query ?? '').toLowerCase();
		const matches = [...memoryStore.values()].filter((record) =>
			record.content.toLowerCase().includes(query),
		);
		return makeResponse(200, { data: matches });
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/analysis` && method === 'POST') {
		return makeResponse(200, { data: { summary: { total: memoryStore.size } } });
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/relationships` && method === 'POST') {
		return makeResponse(200, { data: { relationships: [] } });
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/stats` && method === 'POST') {
		return makeResponse(200, {
			data: {
				totalCount: memoryStore.size,
				domainDistribution: {},
				tagDistribution: {},
			},
		});
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/health` && method === 'GET') {
		return makeResponse(200, {
			data: { healthy: true, details: { records: memoryStore.size } },
		});
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/cleanup` && method === 'POST') {
		memoryStore.clear();
		return makeResponse(200, { message: 'cleanup complete' });
	}

	if (url === `${DEFAULT_MEMORY_BASE_URL}/memory/optimize` && method === 'POST') {
		return makeResponse(200, { message: 'optimize complete' });
	}

	return makeResponse(404, { error: { message: 'Not Found' } });
});

vi.stubGlobal('fetch', memoryFetch as unknown as typeof fetch);

beforeEach(() => {
	memoryStore.clear();
	memoryIdCounter = 1;
	memoryFetch.mockClear();
});

Object.assign(globalThis, {
	__memoryFetchStub: memoryFetch,
	__memoryTestStore: memoryStore,
});

if (!process.env.CORTEX_OS_TMP) {
	const root = mkdtempSync(join(tmpdir(), 'cortex-os-root-'));
	process.env.CORTEX_OS_TMP = root;
	process.once('exit', () => {
		try {
			rmSync(root, { recursive: true, force: true });
		} catch (error) {
			console.warn('Failed to cleanup CORTEX_OS_TMP', error);
		}
	});
}

void (async () => {
	try {
		await ensureLoopbackToken();
	} catch (error) {
		console.error('brAInwav test bootstrap: failed to provision loopback auth token', error);
	}
})();
