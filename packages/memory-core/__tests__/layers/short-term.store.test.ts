import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';
import type { CheckpointSnapshot } from '../../src/types.js';

// The implementation under test will live at this path once the layered refactor lands.
import { ShortTermMemoryStore } from '../../src/layers/short-term/ShortTermMemoryStore.js';

type RunStoreFn = (input: MemoryStoreInput) => Promise<{ id: string; vectorIndexed: boolean }>;

describe('ShortTermMemoryStore', () => {
	const baseTimestamp = Date.UTC(2025, 9, 11, 12, 0, 0); // 2025-10-11T12:00:00.000Z
	let clockNow: number;
	let runStore: Mock<Parameters<RunStoreFn>, Awaited<ReturnType<RunStoreFn>>>;
	let sqlitePersistSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		clockNow = baseTimestamp;
		runStore = vi.fn(async (input: MemoryStoreInput) => ({
			id: `mem_${Math.random().toString(36).slice(2, 8)}`,
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
		expect(result.id).toMatch(/^mem_[0-9a-z]{6}$/u);
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

		const { removed } = store.flushExpired();
		expect(removed).toBe(1);
		expect(store.getSession('session-expiring')).toBeUndefined();
		expect(removedLog.some((entry) => entry.includes('brAInwav') && entry.includes('expired'))).toBe(true);
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

