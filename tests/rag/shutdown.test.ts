import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Deferred<T = void> {
	promise: Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
}

function createDeferred<T = void>(): Deferred<T> {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const queryMock = vi.fn();
const ingestMock = {
	initialize: vi.fn().mockResolvedValue(undefined),
	close: vi.fn().mockResolvedValue(undefined),
	ingest: vi.fn().mockResolvedValue({ status: 'accepted', documentId: 'doc' }),
};

vi.mock('../../apps/cortex-os/src/rag/embeddings.js', () => ({
	createGraphRagEmbeddings: () => ({
		dense: { close: vi.fn().mockResolvedValue(undefined) },
		sparse: { close: vi.fn().mockResolvedValue(undefined) },
	}),
}));

vi.mock('@cortex-os/memory-core', () => {
	return {
		GraphRAGService: class {},
		GraphRAGIngestService: class {},
		createGraphRAGService: () => ({
			initialize: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			query: (...args: unknown[]) => queryMock(...args),
		}),
		createGraphRAGIngestService: () => ingestMock,
	};
});

describe('RAG HTTP surface graceful shutdown', () => {
	beforeEach(() => {
		queryMock.mockReset();
		ingestMock.initialize.mockClear();
		ingestMock.close.mockClear();
		ingestMock.ingest.mockClear();
	});

	afterEach(() => {
		vi.resetModules();
	});

	it('drains in-flight queries and rejects new requests', async () => {
		vi.resetModules();
		const { startRagHttpSurface } = await import('../../apps/cortex-os/src/rag/runtime-http.js');

		const inFlight = createDeferred<void>();
		const release = createDeferred<void>();

		queryMock.mockImplementation(async () => {
			inFlight.resolve();
			await release.promise;
			return {
				answer: 'completed',
				sources: [],
				graphContext: {
					focusNodes: 0,
					expandedNodes: 0,
					totalChunks: 0,
					edgesTraversed: 0,
				},
				metadata: {},
				citations: [],
			};
		});

		const surface = await startRagHttpSurface({
			host: '127.0.0.1',
			port: 0,
			chunkSize: 800,
			enableNeo4j: false,
		});

		const slowResponsePromise = fetch(`${surface.url}/rag/hier-query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: 'slow request', top_k: 1 }),
		});

		await inFlight.promise;

		const shutdownPromise = surface.beginShutdown({ timeoutMs: 1_000 });

		const blocked = await fetch(`${surface.url}/rag/hier-query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: 'blocked request', top_k: 1 }),
		});

		expect(blocked.status).toBe(503);
		const blockedBody = (await blocked.json()) as { status: string; message: string };
		expect(blockedBody.status).toBe('unavailable');
		expect(blockedBody.message).toContain('brAInwav');

		release.resolve();

		const slowResponse = await slowResponsePromise;
		expect(slowResponse.status).toBe(200);

		const shutdownResult = await shutdownPromise;
		expect(shutdownResult.completed).toBe(true);
		expect(shutdownResult.pendingRequests).toBe(0);
		expect(queryMock).toHaveBeenCalledTimes(1);

		await surface.beginShutdown({ timeoutMs: 0 });
	});
});
