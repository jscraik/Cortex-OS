import type { MemoryStoreInput } from '@cortex-os/tool-spec';
import type { CheckpointSnapshot } from '../../types.js';

export interface ShortTermMemoryStoreOptions {
	workflow: {
		runStore: (input: MemoryStoreInput) => Promise<{ id: string; vectorIndexed: boolean }>;
	};
	checkpointManager: {
		snapshot: (id: string) => Promise<CheckpointSnapshot | null>;
	};
	ttlMs: number;
	clock?: () => number;
	onEpisodicPersist?: (payload: { id: string; sessionId: string }) => void;
	logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
}

export interface ShortTermMemoryEntry {
	id: string;
	content: string;
	importance: number;
	storedAt: number;
	metadata?: Record<string, unknown>;
}

export interface ShortTermMemorySession {
	id: string;
	createdAt: number;
	memories: ShortTermMemoryEntry[];
}

export interface StoreShortTermInput {
	sessionId: string;
	memory: MemoryStoreInput;
}

export interface StoreShortTermResult {
	id: string;
	sessionId: string;
	layer: 'short_term';
	storedAt: number;
}

export interface FlushExpiredResult {
	removed: number;
}

export interface ShortTermSnapshotEntry {
	id: string;
	content: string;
	importance: number;
	storedAt: number;
	provenance: {
		reversiblePointer: {
			checkpointId: string;
			digest: string;
			layer: 'short_term';
		};
	};
}

export interface ShortTermSnapshot {
	checkpointId: string;
	createdAt: string;
	sessionId: string;
	entries: ShortTermSnapshotEntry[];
}

export class ShortTermMemoryStore {
	private readonly sessions = new Map<string, ShortTermMemorySession>();

	private readonly ttlMs: number;

	private readonly workflow: ShortTermMemoryStoreOptions['workflow'];

	private readonly checkpointManager: ShortTermMemoryStoreOptions['checkpointManager'];

	private readonly clock: () => number;

	private readonly logger: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

	constructor(private readonly options: ShortTermMemoryStoreOptions) {
		this.workflow = options.workflow;
		this.checkpointManager = options.checkpointManager;
		this.ttlMs = options.ttlMs;
		this.clock = options.clock ?? (() => Date.now());
		this.logger = options.logger ?? console;
	}

	async store(input: StoreShortTermInput): Promise<StoreShortTermResult> {
		const timestamp = this.clock();
		const persisted = await this.workflow.runStore(input.memory);
		const session = this.ensureSession(input.sessionId, timestamp);
		const entry: ShortTermMemoryEntry = {
			id: persisted.id,
			content: input.memory.content,
			importance: input.memory.importance,
			storedAt: timestamp,
			metadata: input.memory.metadata,
		};
		session.memories.push(entry);
		return {
			id: entry.id,
			sessionId: input.sessionId,
			layer: 'short_term',
			storedAt: timestamp,
		};
	}

	getSession(sessionId: string): ShortTermMemorySession | undefined {
		const session = this.sessions.get(sessionId);
		if (!session) return undefined;
		return {
			id: session.id,
			createdAt: session.createdAt,
			memories: [...session.memories],
		};
	}

	flushExpired(): FlushExpiredResult {
		const threshold = this.clock() - this.ttlMs;
		let removed = 0;
		for (const [sessionId, session] of this.sessions.entries()) {
			const { memories } = session;
			const active = memories.filter((memory) => memory.storedAt >= threshold);
			removed += memories.length - active.length;
			if (active.length === 0) {
				this.sessions.delete(sessionId);
				continue;
			}
			session.memories = active;
		}
		if (removed > 0) {
			this.logger.info?.(
				`brAInwav short-term memory cleanup removed ${removed} expired entr${
					removed === 1 ? 'y' : 'ies'
				}.`,
			);
		}
		return { removed };
	}

	async snapshot(checkpointId: string): Promise<ShortTermSnapshot | null> {
		const checkpoint = await this.checkpointManager.snapshot(checkpointId);
		if (!checkpoint) {
			return null;
		}
		const shortTerm = this.resolveShortTermState(checkpoint);
		if (!shortTerm) {
			return null;
		}
		return {
			checkpointId,
			createdAt: checkpoint.meta.createdAt,
			sessionId: shortTerm.sessionId,
			entries: shortTerm.entries.map((entry) => ({
				id: entry.id,
				content: entry.content,
				importance: entry.importance,
				storedAt: entry.storedAt,
				provenance: {
					reversiblePointer: {
						checkpointId,
						digest: checkpoint.digest,
						layer: 'short_term' as const,
					},
				},
			})),
		};
	}

	private ensureSession(sessionId: string, timestamp: number): ShortTermMemorySession {
		const existing = this.sessions.get(sessionId);
		if (existing) {
			return existing;
		}
		const session: ShortTermMemorySession = {
			id: sessionId,
			createdAt: timestamp,
			memories: [],
		};
		this.sessions.set(sessionId, session);
		return session;
	}

	private resolveShortTermState(checkpoint: CheckpointSnapshot) {
		const scratch = (checkpoint.state as Record<string, unknown>)?.scratch as
			| Record<string, unknown>
			| undefined;
		const shortTerm = scratch?.shortTerm as
			| {
				sessionId?: string;
				entries?: Array<{
					id: string;
					content: string;
					importance: number;
					storedAt: number;
				}>;
			}
			| undefined;
		if (!shortTerm?.sessionId || !Array.isArray(shortTerm.entries)) {
			return null;
		}
		const entries = shortTerm.entries.map((entry) => ({
			id: entry.id,
			content: entry.content,
			importance: entry.importance,
			storedAt: entry.storedAt,
		}));
		return {
			sessionId: shortTerm.sessionId,
			entries,
		};
	}
}
