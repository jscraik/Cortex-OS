import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';
import type { CheckpointSnapshot } from '../../src/types.js';

// The implementation under test will live at this path once the layered refactor lands.
import { ShortTermMemoryStore } from '../../src/layers/short-term/ShortTermMemoryStore.js';
import { LocalMemoryProvider } from '../../src/providers/LocalMemoryProvider.js';

type RunStoreFn = (input: MemoryStoreInput) => Promise<{ id: string; vectorIndexed: boolean }>;

 describe('ShortTermMemoryStore', () => {
 	const baseTimestamp = Date.UTC(2025, 9, 11, 12, 0, 0); // 2025-10-11T12:00:00.000Z
 	let clockNow: number;
 	let runStore: Mock<Parameters<RunStoreFn>, Awaited<ReturnType<RunStoreFn>>>;
 	let sqlitePersistSpy: ReturnType<typeof vi.fn>;

 	beforeEach(() => {
 		clockNow = baseTimestamp;
 		runStore = vi.fn(async (input: MemoryStoreInput) => ({
 			id: `mem_${randomBytes(4).toString('hex')}`,
 			vectorIndexed: false,
 		}));
 		sqlitePersistSpy = vi.fn();
 	});

 	const createStore = () =>
 		new ShortTermMemoryStore({
 			workflow: { runStore },
 			checkpointManager: {
 				snapshot: vi.fn(async () => null),
 			},
 			ttlMs: 60_000,
 			clock: () => clockNow,
 			onEpisodicPersist: sqlitePersistSpy,
 			logger: {
 				info: vi.fn(),
 				warn: vi.fn(),
 				error: vi.fn(),
 				debug: vi.fn(),
 			},
 		});

 	it('should create isolated working session state without touching episodic persistence', async () => {
 		const store = createStore();
 		const sessionId = 'session-alpha';
 		const input: MemoryStoreInput = {
 			content: 'Short term scratch note',
 			importance: 4,
 			tags: ['scratch'],
 		};

 		const result = await store.store({ sessionId, memory: input });

 		expect(runStore).toHaveBeenCalledWith(input);
 		expect(result.id).toMatch(/^mem_[0-9a-f]{8}$/u);
 		expect(result.sessionId).toBe(sessionId);
 		expect(result.layer).toBe('short_term');
 		expect(result.storedAt).toBe(clockNow);
 		expect(sqlitePersistSpy).not.toHaveBeenCalled();

 		const session = store.getSession(sessionId);
 		expect(session).not.toBeUndefined();
 		expect(session?.memories).toHaveLength(1);
 		expect(session?.memories[0]).toMatchObject({
 			id: result.id,
 			content: input.content,
 			importance: input.importance,
 			storedAt: clockNow,
 		});
 	});

 	it('should discard expired entries when flushExpired runs', async () => {
 		const removedLog: string[] = [];
 		const store = new ShortTermMemoryStore({
 			workflow: { runStore },
 			checkpointManager: {
 				snapshot: vi.fn(async () => null),
 			},
 			ttlMs: 30_000,
 			clock: () => clockNow,
 			onEpisodicPersist: sqlitePersistSpy,
 			logger: {
 				info: vi.fn((message: string) => {
 					removedLog.push(message);
 				}),
 				warn: vi.fn(),
 				error: vi.fn(),
 				debug: vi.fn(),
 			},
 		});

 		await store.store({
 			sessionId: 'session-expiring',
 			memory: { content: 'Transient working memory', importance: 5 },
 		});

 		clockNow += 45_000; // advance beyond TTL

	const { removed, expiredSessions } = store.flushExpired();
		expect(removed).toBe(1);
		expect(store.getSession('session-expiring')).toBeUndefined();
		expect(removedLog.some((entry) => entry.includes('brAInwav') && entry.includes('expired'))).toBe(true);
		expect(expiredSessions.map((session) => session.id)).toEqual(['session-expiring']);
	});

 	it('should convert checkpoint payloads into reversible short-term snapshot metadata', async () => {
 		const checkpoint: CheckpointSnapshot = {
 			meta: {
 				id: 'ckpt_short_001',
 				createdAt: '2025-10-11T11:45:00.000Z',
 			},
 			state: {
 				plan: null,
 				scratch: {
 					shortTerm: {
 						sessionId: 'session-snapshot',
 						entries: [
 							{
 								id: 'mem_short_01',
 								content: 'Latest planning note',
 								importance: 6,
 								storedAt: Date.parse('2025-10-11T11:44:30.000Z'),
 							},
 						],
 					},
 				},
 			},
 			digest: 'sha256:abcdef1234567890',
 		};

 		const snapshotSpy = vi.fn(async () => checkpoint);
 		const store = new ShortTermMemoryStore({
 			workflow: { runStore },
 			checkpointManager: {
 				snapshot: snapshotSpy,
 			},
 			ttlMs: 60_000,
 			clock: () => clockNow,
 			onEpisodicPersist: sqlitePersistSpy,
 			logger: {
 				info: vi.fn(),
 				warn: vi.fn(),
 				error: vi.fn(),
 				debug: vi.fn(),
 			},
 		});

 		const snapshot = await store.snapshot('ckpt_short_001');

 		expect(snapshotSpy).toHaveBeenCalledWith('ckpt_short_001');
 		expect(snapshot).toMatchObject({
 			checkpointId: 'ckpt_short_001',
 			createdAt: '2025-10-11T11:45:00.000Z',
 			sessionId: 'session-snapshot',
 			entries: [
 				expect.objectContaining({
 					id: 'mem_short_01',
 					content: 'Latest planning note',
 					provenance: {
 						reversiblePointer: {
 							checkpointId: 'ckpt_short_001',
 							digest: 'sha256:abcdef1234567890',
 							layer: 'short_term',
 						},
 					},
 				}),
 			],
 		});
 	});
 });

describe('LocalMemoryProvider short-term promotion', () => {
	const baseConfig = {
		sqlitePath: ':memory:',
		defaultLimit: 10,
		maxLimit: 100,
		maxOffset: 1000,
		defaultThreshold: 0.5,
		hybridWeight: 0.6,
		enableCircuitBreaker: false,
		circuitBreakerThreshold: 5,
		queueConcurrency: 1,
		logLevel: 'silent' as const,
		shortTerm: {
			ttlMs: 5 * 60 * 1000,
			promotionImportance: 8,
		},
	};

	it('promotes short-term entries into episodic persistence', async () => {
		const provider = new LocalMemoryProvider(baseConfig);

		await provider.storeShortTerm('session-42', {
			content: 'Reflection that needs persistence',
			importance: 5,
		});

		const promoted = await provider.promoteShortTermSession('session-42');
		expect(promoted).toHaveLength(1);
		expect(provider.getShortTermSession('session-42')).toBeUndefined();
	});

	it('auto-promotes high-importance entries during storeShortTerm', async () => {
		const provider = new LocalMemoryProvider(baseConfig);
		const persistSpy = vi.spyOn(provider as unknown as { persistShortTermSession: Function }, 'persistShortTermSession');

		await provider.storeShortTerm('session-auto', {
			content: 'Immediate long-term insight',
			importance: 8,
		});

		expect(persistSpy).toHaveBeenCalledWith('session-auto');
		expect(provider.getShortTermSession('session-auto')).toBeUndefined();
		persistSpy.mockRestore();
	});

	it('auto-promotes expired sessions during flush', async () => {
		vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
		const provider = new LocalMemoryProvider(baseConfig);
		const persistSpy = vi.spyOn(provider as unknown as { persistShortTermSession: Function }, 'persistShortTermSession');

		vi.setSystemTime(new Date('2025-10-11T12:00:00Z'));
		await provider.storeShortTerm('session-ttl', {
			content: 'Keep until end of session',
			importance: 5,
		});

		vi.setSystemTime(new Date('2025-10-11T12:10:00Z'));
		await provider.flushShortTermExpired();

		expect(persistSpy).toHaveBeenCalledWith('session-ttl', expect.objectContaining({ id: 'session-ttl' }));
		expect(provider.getShortTermSession('session-ttl')).toBeUndefined();
		persistSpy.mockRestore();
		vi.useRealTimers();
	});

	const createProviderWithMockedQdrant = () => {
		const provider = new LocalMemoryProvider({
			...baseConfig,
			qdrant: {
				url: 'http://invalid-qdrant',
				collection: 'local_memory_v1',
				timeout: 1000,
			},
		});

		const upsert = vi.fn(async () => undefined);
		const search = vi.fn(async () => []);
		(provider as unknown as { qdrant: any }).qdrant = {
			upsert,
			setPayload: vi.fn(),
			scroll: vi.fn(),
			search,
		};
		(provider as unknown as { ensureQdrantCollection: any }).ensureQdrantCollection = vi.fn();
		(provider as unknown as { generateEmbedding: any }).generateEmbedding = vi.fn(async () => [
			0.1,
			0.2,
			0.3,
		]);
		(provider as unknown as { isQdrantHealthy: any }).isQdrantHealthy = vi.fn(async () => true);
		(provider as unknown as { queue: any }).queue.add = (task: any) => Promise.resolve(task());

		return { provider, upsert, search } as const;
	};

	it('tags semantic layer payloads during promotion', async () => {
		const { provider, upsert } = createProviderWithMockedQdrant();

		await provider.storeShortTerm('session-43', {
			content: 'Semantic memory candidate',
			importance: 7,
		});

		await provider.promoteShortTermSession('session-43');

		expect(upsert).toHaveBeenCalled();
		const payload = upsert.mock.calls[0][1].points[0].payload as Record<string, unknown>;
		expect(payload).toMatchObject({
			memory_layer: 'semantic',
			memory_layer_version: expect.any(String),
			memory_layer_updated_at: expect.any(String),
		});
	});

	it('tags long_term payloads when importance is high', async () => {
		const { provider, upsert } = createProviderWithMockedQdrant();

		await provider.storeShortTerm('session-44', {
			content: 'Critical insight to retain',
			importance: 9,
		});

		await provider.promoteShortTermSession('session-44');

		expect(upsert).toHaveBeenCalled();
		const payload = upsert.mock.calls.at(-1)[1].points[0].payload as Record<string, unknown>;
		expect(payload.memory_layer).toBe('long_term');
	});

	it('returns auto-promoted short-term notes with memory_layer metadata via search', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const { provider, upsert, search } = createProviderWithMockedQdrant();
		try {
			vi.setSystemTime(new Date('2025-10-12T11:59:00Z'));
			await provider.storeShortTerm('session-search', {
				content: 'Short note about TTL promotion and search metadata',
				importance: 5,
				metadata: { tenant: 'memory-layer-e2e', labels: ['regression'] },
			});

			vi.setSystemTime(new Date('2025-10-12T12:00:05Z'));
			await provider.flushShortTermExpired();

			expect(upsert).toHaveBeenCalled();
			const promotedPoint = upsert.mock.calls.at(-1)?.[1]?.points?.[0];
			const promotedId = (promotedPoint?.id ?? '') as string;
			expect(promotedId).toMatch(/^.+$/u);

			search.mockResolvedValueOnce([
				{
					id: promotedId,
					score: 0.91,
					payload: {
						memory_layer: 'semantic',
						memory_layer_version: '2025.10',
						memory_layer_updated_at: '2025-10-12T12:00:05.000Z',
					},
				},
			]);

			const results = await provider.search({
				query: 'TTL promotion search metadata',
				search_type: 'semantic',
				tenant: 'memory-layer-e2e',
			});

			expect(results).toHaveLength(1);
			expect(results[0].metadata).toMatchObject({
				memory_layer: 'semantic',
				memory_layer_version: '2025.10',
				memory_layer_updated_at: '2025-10-12T12:00:05.000Z',
			});
		} finally {
			vi.useRealTimers();
		}
	});
});
