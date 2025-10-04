import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalMemoryProvider } from '../providers/LocalMemoryProvider.js';
import type { MemoryCoreConfig } from '../types.js';

describe('LocalMemoryProvider security hardening', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('redacts sensitive content before embedding and includes provenance payload', async () => {
		const provider = createProvider({
			qdrant: {
				url: 'http://localhost:6333',
				collection: 'test-collection',
				embedDim: 4,
				similarity: 'Cosine',
				timeout: 1000,
			},
		});

		const embeddingMock = vi.fn().mockResolvedValue([1, 0, 0, 0]);
		(provider as any).generateEmbedding = embeddingMock;

		const upsertMock = vi.fn().mockResolvedValue(undefined);
		(provider as any).qdrant = { upsert: upsertMock };
		(provider as any).isQdrantHealthy = vi.fn().mockResolvedValue(true);

		let queuedTask: Promise<void> | undefined;
		(provider as any).queue = {
			add: (task: () => Promise<void>) => {
				queuedTask = task();
				return Promise.resolve(queuedTask);
			},
		};

		await provider.store({
			content: 'sk-super-secret-token should be scrubbed',
			importance: 5,
			tags: ['alpha'],
			domain: 'security-tests',
			metadata: {
				tenant: 'tenant-a',
				labels: ['restricted', 'confidential'],
				sourceUri: 'https://example.com/resource',
			},
		});

		if (!queuedTask) {
			throw new Error('queue did not schedule task');
		}
		await queuedTask;

		expect(embeddingMock).toHaveBeenCalledTimes(1);
		const sanitizedInput = embeddingMock.mock.calls[0][0] as string;
		expect(sanitizedInput).not.toContain('sk-super-secret-token');
		expect(sanitizedInput).toContain('[REDACTED]');

		expect(upsertMock).toHaveBeenCalledTimes(1);
		const payload = upsertMock.mock.calls[0][1].points[0].payload;
		expect(payload.tenant).toBe('tenant-a');
		expect(payload.labels).toEqual(['restricted', 'confidential']);
		expect(payload.sourceUri).toBe('https://example.com/resource');
		expect(typeof payload.contentSha).toBe('string');
		expect(payload.contentSha.length).toBeGreaterThanOrEqual(8);
	});

	it('rejects searches without tenant, domain, tags, or labels', async () => {
		const provider = createProvider();

		await expect(
			provider.search({
				query: 'test query',
				search_type: 'semantic',
				limit: 5,
				offset: 0,
				session_filter_mode: 'all',
				score_threshold: 0.5,
				hybrid_weight: 0.6,
			}),
		).rejects.toThrow(/Tenant, domain, tags, or labels/i);
	});

	it('clamps limit and offset when executing FTS searches', async () => {
		const provider = createProvider();
		(provider as any).searchWithFts = vi.fn().mockResolvedValue([]);

		await provider.search({
			query: 'keyword',
			search_type: 'keyword',
			domain: 'security-tests',
			limit: 500,
			offset: 5000,
			session_filter_mode: 'all',
			score_threshold: 0.5,
			hybrid_weight: 0.6,
		});

		expect((provider as any).searchWithFts).toHaveBeenCalledWith(
			expect.objectContaining({ domain: 'security-tests' }),
			100,
			1000,
			0.5,
		);
	});
});

function createProvider(overrides: Partial<MemoryCoreConfig> = {}): LocalMemoryProvider {
	const baseConfig: MemoryCoreConfig = {
		sqlitePath: ':memory:',
		defaultLimit: 10,
		maxLimit: 100,
		maxOffset: 1000,
		defaultThreshold: 0.5,
		hybridWeight: 0.6,
		enableCircuitBreaker: false,
		circuitBreakerThreshold: 5,
		queueConcurrency: 1,
		logLevel: 'silent',
		embedDim: 4,
	};

	return new LocalMemoryProvider({
		...baseConfig,
		...overrides,
	});
}
