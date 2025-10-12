import type { AbortSignal } from 'node:abort_controller';
import { createHash, randomUUID } from 'node:crypto';

// Inline array validator to avoid dependency issues
function validateArrayParam<T = unknown>(
	param: unknown,
	name: string,
	elementType?: 'string' | 'number' | 'boolean',
): T[] {
	if (!Array.isArray(param)) {
		throw new Error(`[brAInwav] Parameter "${name}" must be an array, got ${typeof param}`);
	}

	if (elementType) {
		param.forEach((element, index) => {
			if (typeof element !== elementType) {
				throw new Error(
					`Parameter "${name}[${index}]" must be ${elementType}, got ${typeof element}`,
				);
			}
		});
	}

	return param as T[];
}

import type {
	MemoryAnalysisInput,
	MemoryRelationshipsInput,
	MemorySearchInput,
	MemoryStatsInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';
import { isPrivateHostname, safeFetchJson } from '@cortex-os/utils';
import { QdrantClient } from '@qdrant/js-client-rest';
import Database from 'better-sqlite3';
import CircuitBreaker from 'circuit-breaker-js';
import PQueue from 'p-queue';
import { pino } from 'pino';
import type { CheckpointManager } from '../checkpoints/index.js';
import { createCheckpointManager } from '../checkpoints/index.js';
import {
	type FlushExpiredResult,
	type ShortTermMemorySession,
	ShortTermMemoryStore,
	type ShortTermSnapshot,
	type StoreShortTermResult,
} from '../layers/short-term/ShortTermMemoryStore.js';
import type {
	Memory,
	MemoryAnalysisResult,
	MemoryCoreConfig,
	MemoryGraph,
	MemoryMetadata,
	MemoryProvider,
	MemoryRelationship,
	MemorySearchResult,
	MemoryStats,
	QdrantConfig,
	RelationshipType,
	SQLiteMemoryRow,
	SQLiteRelationshipRow,
} from '../types.js';
import { MemoryProviderError } from '../types.js';

type NormalizedStoreInput = MemoryStoreInput & { metadata?: MemoryMetadata };

// Ollama API response types for brAInwav compliance
interface OllamaEmbeddingResponse {
	data?: Array<{
		embedding?: number[];
	}>;
	embedding?: number[];
}

// import { MemoryWorkflowEngine } from '../workflows/memoryWorkflow.js'; // Temporarily disabled
// Local types to replace workflow types
interface StoreWorkflowPersistPayload {
	id: string;
	input: NormalizedStoreInput;
	timestamp: number;
}

interface StoreWorkflowIndexPayload {
	id: string;
	input: NormalizedStoreInput;
	timestamp: number;
}

// Minimal circuit breaker shape for runtime inspection without leaking 'any'
type CircuitBreakerShim = {
	isClosed?: () => boolean;
	isOpen?: () => boolean;
	state?: string;
};

// Aliases to simplify complex inline types used in graph functions
type MemoryGraphNode = {
	id: string;
	label: string;
	type: 'memory' | 'concept' | 'tag';
	weight: number;
	metadata?: Record<string, unknown>;
};

type MemoryGraphEdge = {
	source: string;
	target: string;
	weight: number;
	type: RelationshipType;
	directed: boolean;
};

const logger = pino({ level: 'info' });

const EMBEDDING_USER_AGENT = 'brAInwav-Memory-Core/1.0';

const SENSITIVE_PATTERNS: RegExp[] = [
	/sk-[A-Za-z0-9_-]{20,}/g,
	/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
	/\b\d{3}-\d{2}-\d{4}\b/g,
];

function scrubSensitiveContent(content: string): string {
	return SENSITIVE_PATTERNS.reduce(
		(current, pattern) => current.replace(pattern, '[REDACTED]'),
		content,
	);
}

function normalizeMetadata(
	metadata?: MemoryMetadata | Record<string, unknown>,
): MemoryMetadata | undefined {
	if (!metadata) {
		return undefined;
	}

	const candidate = metadata as MemoryMetadata;
	const normalized: MemoryMetadata = { ...metadata };

	const tenant = typeof candidate.tenant === 'string' ? candidate.tenant.trim() : '';
	if (tenant.length > 0) {
		normalized.tenant = tenant;
	} else {
		delete normalized.tenant;
	}

	const contentSha = typeof candidate.contentSha === 'string' ? candidate.contentSha.trim() : '';
	if (contentSha.length > 0) {
		normalized.contentSha = contentSha;
	} else {
		delete normalized.contentSha;
	}

	if (typeof candidate.sourceUri === 'string' && candidate.sourceUri.length > 0) {
		normalized.sourceUri = candidate.sourceUri;
	} else {
		delete normalized.sourceUri;
	}

	const labels = Array.isArray(candidate.labels)
		? candidate.labels
				.map((label) => (typeof label === 'string' ? label.trim() : ''))
				.filter((label) => label.length > 0)
		: [];
	if (labels.length > 0) {
		normalized.labels = Array.from(new Set(labels));
	} else {
		delete normalized.labels;
	}

	return normalized;
}

function computeContentSha(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

function buildProvenancePayload(metadata: MemoryMetadata | undefined, sanitizedContent: string) {
	const tenant =
		typeof metadata?.tenant === 'string' && metadata.tenant.length > 0 ? metadata.tenant : 'public';
	const labels = Array.isArray(metadata?.labels) ? [...metadata.labels] : [];
	const sourceUri =
		typeof metadata?.sourceUri === 'string' && metadata.sourceUri.length > 0
			? metadata.sourceUri
			: undefined;
	const contentSha =
		typeof metadata?.contentSha === 'string' && metadata.contentSha.length >= 8
			? metadata.contentSha
			: computeContentSha(sanitizedContent);

	return { tenant, labels, sourceUri, contentSha };
}

async function requestMlxEmbedding(text: string): Promise<number[] | null> {
	const baseUrl = process.env.MLX_EMBED_BASE_URL;
	if (!baseUrl) {
		return null;
	}

	try {
		const parsed = new URL(baseUrl);
		const { embedding } = await safeFetchJson<{ embedding: number[] }>(`${baseUrl}/embed`, {
			allowedHosts: [parsed.hostname.toLowerCase()],
			allowedProtocols: [parsed.protocol],
			allowLocalhost: isPrivateHostname(parsed.hostname),
			fetchOptions: {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': EMBEDDING_USER_AGENT,
				},
				body: JSON.stringify({ text }),
			},
		});
		if (!Array.isArray(embedding)) {
			logger.warn('brAInwav MLX embedding returned invalid payload');
			return null;
		}
		return embedding;
	} catch (error) {
		logger.warn('brAInwav MLX embedding failed', { error: (error as Error).message });
		return null;
	}
}

async function requestOllamaEmbedding(text: string): Promise<number[] | null> {
	const baseUrl = process.env.OLLAMA_BASE_URL;
	if (!baseUrl) {
		return null;
	}

	try {
		const parsed = new URL(baseUrl);
		const data = await safeFetchJson<Record<string, unknown>>(`${baseUrl}/embeddings`, {
			allowedHosts: [parsed.hostname.toLowerCase()],
			allowedProtocols: [parsed.protocol],
			allowLocalhost: isPrivateHostname(parsed.hostname),
			fetchOptions: {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ollama',
					'User-Agent': EMBEDDING_USER_AGENT,
				},
				body: JSON.stringify({
					model: process.env.OLLAMA_MODEL || 'mxbai-embed-large',
					input: text,
				}),
			},
		});
		const embedding = Array.isArray((data as OllamaEmbeddingResponse)?.data)
			? ((data as OllamaEmbeddingResponse).data?.[0]?.embedding as number[] | undefined)
			: (data as OllamaEmbeddingResponse)?.embedding;
		if (!Array.isArray(embedding)) {
			logger.warn('brAInwav Ollama embedding returned invalid payload');
			return null;
		}
		return embedding;
	} catch (error) {
		logger.warn('brAInwav Ollama embedding failed', { error: (error as Error).message });
		return null;
	}
}

function createMockEmbedding(text: string, dim: number): number[] {
	// Security: Validate array dimension to prevent excessive memory allocation
	const maxDim = 10000;
	if (dim > maxDim || dim < 1) {
		throw new Error(`brAInwav embedding dimension must be between 1 and ${maxDim}`);
	}

	const embedding = new Array(dim).fill(0);
	// Security: Limit text length to prevent unbounded loop iteration
	const maxTextLength = 10000;
	const safeTextLength = Math.min(text.length, maxTextLength);

	for (let i = 0; i < safeTextLength; i++) {
		const charCode = text.charCodeAt(i);
		embedding[i % dim] = (embedding[i % dim] + charCode) / 255;
	}
	const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
	return embedding.map((val) => (norm === 0 ? 0 : val / norm));
}

export class LocalMemoryProvider implements MemoryProvider {
	private readonly db: Database.Database;
	private readonly qdrant?: QdrantClient;
	private readonly qdrantConfig?: QdrantConfig;
	private qdrantHealthy = false;
	private lastQdrantCheck = 0;
	// Use a small shim type to inspect state safely
	private readonly circuitBreaker?: CircuitBreakerShim;
	private readonly queue: PQueue;
	private readonly config: MemoryCoreConfig;
	// private workflows: MemoryWorkflowEngine; // Temporarily disabled

	private readonly checkpointManager: CheckpointManager;

	private readonly shortTermStore: ShortTermMemoryStore;
	private readonly memoryLayerVersion = '2025-10-11';
	private readonly shortTermPromoteImportance: number;
	private readonly shortTermTtlMs: number;

	constructor(config: MemoryCoreConfig) {
		this.config = config;
		this.db = new Database(config.sqlitePath);
		this.db.pragma('journal_mode = WAL');
		this.db.pragma('foreign_keys = ON');

		// Initialize Qdrant if configured
		if (config.qdrant) {
			this.qdrantConfig = config.qdrant;
			this.qdrant = new QdrantClient({
				url: config.qdrant.url,
				apiKey: config.qdrant.apiKey,
				timeout: config.qdrant.timeout || 5000,
			});
		}

		// Initialize queue for concurrent operations
		this.queue = new PQueue({ concurrency: config.queueConcurrency });

		// Initialize circuit breaker
		if (config.enableCircuitBreaker) {
			this.circuitBreaker = new CircuitBreaker({
				maxFailures: config.circuitBreakerThreshold,
				timeout: 5000,
				resetTimeout: 30000,
			});
		}

		this.initializeDatabase();

		this.checkpointManager = createCheckpointManager(this.db, {
			policy: config.checkpoint,
		});

		const shortTermConfig = config.shortTerm ?? {
			ttlMs: 5 * 60 * 1000,
			promotionImportance: 8,
		};
		this.shortTermTtlMs = shortTermConfig.ttlMs;
		this.shortTermPromoteImportance = shortTermConfig.promotionImportance;
		this.shortTermStore = this.createShortTermStore();

		if (this.qdrant && this.qdrantConfig) {
			this.queue
				.add(async () => {
					const result = await this.backfillQdrantMemoryLayers({ batchSize: 256 });
					logger.info('brAInwav memory_layer backfill completed', result);
				})
				.catch((error) => {
					logger.warn('brAInwav memory_layer backfill failed', {
						error: (error as Error).message,
					});
				});
		}

		/* Temporarily disabled
  // this.workflows = new MemoryWorkflowEngine({
  //   store: {
  //     generateId: () => randomUUID(),
  //     getTimestamp: () => Date.now(),
  //     persistMemory: async (payload: StoreWorkflowPersistPayload) => {
  //       await this.persistMemoryRecord(payload);
  //     },
  //     scheduleVectorIndex: async (payload: StoreWorkflowIndexPayload) => {
  //       return this.scheduleVectorIndexing(payload);
  //     },
  //   },
  // });
  */
	}

	private normalizeStoreInput(input: MemoryStoreInput): NormalizedStoreInput {
		const tags = Array.isArray(input.tags)
			? input.tags
					.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
					.filter((tag) => tag.length > 0)
			: undefined;
		const metadata = normalizeMetadata(input.metadata);

		return {
			...input,
			tags,
			metadata,
		};
	}

	private createShortTermStore(): ShortTermMemoryStore {
		return new ShortTermMemoryStore({
			workflow: {
				runStore: async (input) => ({
					id: randomUUID(),
					vectorIndexed: false,
				}),
			},
			checkpointManager: this.checkpointManager,
			ttlMs: this.shortTermTtlMs,
			clock: () => Date.now(),
			logger,
		});
	}

	private resolveVectorLayer(importance?: number): 'semantic' | 'long_term' {
		const score = typeof importance === 'number' ? importance : 5;
		return score >= 8 ? 'long_term' : 'semantic';
	}

	private initializeDatabase(): void {
		// Create memories table with FTS5
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	content TEXT NOT NULL,
	importance INTEGER DEFAULT 5,
	domain TEXT,
	tags TEXT,
	metadata TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	vector_indexed INTEGER DEFAULT 0
      );
    `);

		// FTS5 table for keyword search
		this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
	content,
	content='memories',
	content_rowid='rowid',
	tokenize='porter'
      );
    `);

		// Triggers for FTS5
		this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
	INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
	UPDATE memories_fts SET content = new.content WHERE rowid = new.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
	DELETE FROM memories_fts WHERE rowid = old.rowid;
      END;
    `);

		// Relationships table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_relationships (
	id TEXT PRIMARY KEY,
	source_id TEXT NOT NULL,
	target_id TEXT NOT NULL,
	type TEXT NOT NULL,
	strength REAL DEFAULT 0.5,
	bidirectional INTEGER DEFAULT 0,
	created_at INTEGER NOT NULL,
	metadata TEXT,
	FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
	FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);

		// Indexes
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_domain ON memories(domain);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_vector_indexed ON memories(vector_indexed);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON memory_relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON memory_relationships(target_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_type ON memory_relationships(type);
    `);
	}

	get checkpoints(): CheckpointManager {
		return this.checkpointManager;
	}

	private async persistMemoryRecord({
		id,
		input,
		timestamp,
	}: StoreWorkflowPersistPayload): Promise<void> {
		const stmt = this.db.prepare(`
      INSERT INTO memories (
	id, content, importance, domain, tags, metadata, created_at, updated_at, vector_indexed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			id,
			input.content,
			input.importance || 5,
			input.domain || null,
			input.tags ? JSON.stringify(input.tags) : null,
			input.metadata ? JSON.stringify(input.metadata) : null,
			timestamp,
			timestamp,
			0,
		);
	}

	private async scheduleVectorIndexing({
		id,
		input,
		timestamp,
	}: StoreWorkflowIndexPayload): Promise<{ vectorIndexed: boolean }> {
		if (!this.qdrant || !this.qdrantConfig) {
			return { vectorIndexed: false };
		}

		if (!(await this.isQdrantHealthy())) {
			return { vectorIndexed: false };
		}

		const task = async () => {
			try {
				await this.ensureQdrantCollection();
				const sanitizedContent = scrubSensitiveContent(input.content);
				const embedding = await this.generateEmbedding(sanitizedContent);
				if (!embedding || embedding.length === 0) {
					throw new MemoryProviderError('INTERNAL', 'Failed to generate embedding');
				}

				if (!this.qdrant || !this.qdrantConfig) {
					throw new MemoryProviderError('INTERNAL', 'Qdrant not configured');
				}
				const provenance = buildProvenancePayload(input.metadata, sanitizedContent);
				const memoryLayer = this.resolveVectorLayer(input.importance);
				await this.qdrant.upsert(this.qdrantConfig.collection, {
					points: [
						{
							id,
							vector: embedding,
							payload: {
								id,
								domain: input.domain,
								tags: input.tags || [],
								labels: provenance.labels,
								tenant: provenance.tenant,
								sourceUri: provenance.sourceUri,
								contentSha: provenance.contentSha,
								createdAt: timestamp,
								updatedAt: timestamp,
								importance: input.importance || 5,
								memory_layer: memoryLayer,
								memory_layer_version: this.memoryLayerVersion,
								memory_layer_updated_at: new Date(timestamp).toISOString(),
							},
						},
					],
				});

				this.db.prepare('UPDATE memories SET vector_indexed = 1 WHERE id = ?').run(id);
				logger.debug('Vector indexed', {
					id,
					domain: input.domain,
					tenant: provenance.tenant,
				});
			} catch (error) {
				logger.warn('Failed to index vector', { id, error: (error as Error).message });
			}
		};

		this.queue.add(task).catch((error) => {
			logger.warn('Failed to schedule vector indexing', { id, error: (error as Error).message });
		});

		return { vectorIndexed: true };
	}

	private async isQdrantHealthy(): Promise<boolean> {
		if (!this.qdrant) return false;

		const now = Date.now();
		if (now - this.lastQdrantCheck < 5000) {
			return this.qdrantHealthy;
		}

		this.lastQdrantCheck = now;
		try {
			await this.qdrant.getCollections();
			this.qdrantHealthy = true;
		} catch (error) {
			logger.warn('Qdrant health check failed', { error: (error as Error).message });
			this.qdrantHealthy = false;
		}

		return this.qdrantHealthy;
	}

	private async ensureQdrantCollection(): Promise<void> {
		if (!this.qdrant || !this.qdrantConfig) return;

		try {
			await this.qdrant.getCollection(this.qdrantConfig.collection);
		} catch {
			// Map similarity names if needed by client (e.g., 'Euclidean' -> 'Euclid')
			const distanceMap = {
				Cosine: 'Cosine',
				Dot: 'Dot',
				Euclidean: 'Euclid',
			} as const;
			const mappedDistance =
				(distanceMap as Record<string, 'Cosine' | 'Dot' | 'Euclid' | 'Manhattan'>)[
					this.qdrantConfig.similarity
				] ?? 'Cosine';

			type CreateCollectionOptions = Parameters<QdrantClient['createCollection']>[1];
			const options = {
				vectors: {
					[this.qdrantConfig.collection]: {
						size: this.qdrantConfig.embedDim,
						distance: mappedDistance,
					},
				},
			} as unknown as CreateCollectionOptions;

			await this.qdrant.createCollection(this.qdrantConfig.collection, options);
			logger.info(`Created Qdrant collection: ${this.qdrantConfig.collection}`);
		}
	}

	private async generateEmbedding(text: string): Promise<number[]> {
		// brAInwav policy: No mock data in any code path - production or development
		const mlxEmbedding = await requestMlxEmbedding(text);
		if (mlxEmbedding) {
			return mlxEmbedding;
		}

		const ollamaEmbedding = await requestOllamaEmbedding(text);
		if (ollamaEmbedding) {
			return ollamaEmbedding;
		}

		// brAInwav policy: No mock data under any circumstances
		throw new MemoryProviderError(
			'INTERNAL',
			'brAInwav: Embedding backend not configured - please configure MLX or Ollama for embeddings',
		);
	}

	async get(id: string): Promise<Memory | null> {
		try {
			const row = (await this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id)) as
				| SQLiteMemoryRow
				| undefined;

			if (!row) {
				return null;
			}

			return {
				id: row.id,
				content: row.content,
				importance: row.importance,
				tags: row.tags ? JSON.parse(row.tags) : [],
				domain: row.domain,
				metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
				createdAt: new Date(row.created_at),
				updatedAt: new Date(row.updated_at),
				vectorIndexed: Boolean(row.vector_indexed),
			};
		} catch (error) {
			logger.error('Failed to get memory by ID', {
				error: (error as Error).message,
				id,
			});
			throw new MemoryProviderError('INTERNAL', 'Failed to get memory', {
				error: (error as Error).message,
			});
		}
	}

	async store(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }> {
		const normalizedInput = this.normalizeStoreInput(input);
		return this.persistNormalizedMemory(normalizedInput, input.domain);
	}

	async promoteShortTermSession(sessionId: string): Promise<Array<{ id: string }>> {
		return this.persistShortTermSession(sessionId);
	}

	async storeShortTerm(sessionId: string, input: MemoryStoreInput): Promise<StoreShortTermResult> {
		const normalized = this.normalizeStoreInput(input);
		const result = await this.shortTermStore.store({ sessionId, memory: normalized });
		const importance = normalized.importance ?? 5;
		logger.debug('Short-term memory stored', {
			sessionId,
			importance,
			promotionImportance: this.shortTermPromoteImportance,
		});
		if (importance >= this.shortTermPromoteImportance) {
			await this.persistShortTermSession(sessionId);
		}
		return result;
	}

	getShortTermSession(sessionId: string): ShortTermMemorySession | undefined {
		return this.shortTermStore.getSession(sessionId);
	}

	async flushShortTermExpired(): Promise<FlushExpiredResult> {
		const result = this.shortTermStore.flushExpired();
		for (const session of result.expiredSessions) {
			await this.persistShortTermSession(session.id, session);
		}
		return result;
	}

	async snapshotShortTerm(checkpointId: string): Promise<ShortTermSnapshot | null> {
		return this.shortTermStore.snapshot(checkpointId);
	}

	async backfillQdrantMemoryLayers(options: { batchSize?: number; signal?: AbortSignal } = {}) {
		if (!this.qdrant || !this.qdrantConfig) {
			return { scanned: 0, updated: 0, skipped: 0 };
		}

		const batchSize = Math.max(1, options.batchSize ?? 128);
		let offset: number[] | null | undefined;
		let scanned = 0;
		let updated = 0;
		let skipped = 0;

		const nowIso = () => new Date().toISOString();

		while (true) {
			if (options.signal?.aborted) {
				throw new Error('backfillQdrantMemoryLayers aborted');
			}

			const response = await this.qdrant.scroll(this.qdrantConfig.collection, {
				with_payload: true,
				with_vectors: false,
				limit: batchSize,
				offset: offset ?? undefined,
			});

			const points = response.points ?? [];
			if (points.length === 0) {
				break;
			}

			offset = response.next_page_offset;
			scanned += points.length;

			for (const point of points) {
				const payload = (point.payload ?? {}) as Record<string, unknown>;
				if (payload.memory_layer) {
					skipped += 1;
					continue;
				}

				const importance = typeof payload.importance === 'number' ? payload.importance : undefined;
				const layer = this.resolveVectorLayer(importance);
				await this.qdrant.setPayload(this.qdrantConfig.collection, {
					points: [point.id],
					payload: {
						memory_layer: layer,
						memory_layer_version: this.memoryLayerVersion,
						memory_layer_updated_at: nowIso(),
					},
				});
				updated += 1;

				if (options.signal?.aborted) {
					throw new Error('backfillQdrantMemoryLayers aborted');
				}
			}

			if (!offset) {
				break;
			}
		}

		return { scanned, updated, skipped };
	}

	private async persistShortTermSession(
		sessionId: string,
		session?: ShortTermMemorySession,
	): Promise<Array<{ id: string }>> {
		const target = session ?? this.shortTermStore.promoteSession(sessionId);
		if (!target) {
			return [];
		}
		const results: Array<{ id: string }> = [];
		for (const entry of target.memories) {
			const normalized = this.normalizeStoreInput({
				content: entry.content,
				importance: entry.importance,
				metadata: entry.metadata,
			});
			const stored = await this.persistNormalizedMemory(normalized, normalized.domain);
			results.push({ id: stored.id });
		}
		return results;
	}

	private async persistNormalizedMemory(
		normalizedInput: NormalizedStoreInput,
		domain?: string,
	): Promise<{ id: string; vectorIndexed: boolean }> {
		try {
			const id = randomUUID();
			const timestamp = Date.now();
			await this.persistMemoryRecord({ id, input: normalizedInput, timestamp });
			const indexingResult = await this.scheduleVectorIndexing({
				id,
				input: normalizedInput,
				timestamp,
			});
			const result = { id, vectorIndexed: indexingResult.vectorIndexed };
			logger.info('Memory stored', {
				id: result.id,
				domain,
				vectorIndexed: result.vectorIndexed,
			});
			return result;
		} catch (error) {
			logger.error('Failed to store memory', {
				error: (error as Error).message,
				domain,
			});
			throw new MemoryProviderError('STORAGE', 'Failed to store memory', {
				error: (error as Error).message,
			});
		}
	}

	async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
		this.ensureSearchGuards(input);
		const limit = Math.min(
			Math.max(1, input.limit ?? this.config.defaultLimit),
			this.config.maxLimit,
		);
		const offset = Math.min(Math.max(0, input.offset ?? 0), this.config.maxOffset);
		const threshold =
			typeof input.score_threshold === 'number'
				? input.score_threshold
				: this.config.defaultThreshold;

		try {
			// Try semantic/hybrid search if Qdrant is healthy
			if (this.qdrant && (input.search_type === 'semantic' || input.search_type === 'hybrid')) {
				if (await this.isQdrantHealthy()) {
					return this.searchWithQdrant(input, limit, offset, threshold);
				}
			}

			// Fallback to SQLite FTS
			return this.searchWithFts(input, limit, offset, threshold);
		} catch (error) {
			logger.error('Search failed', { error: (error as Error).message });
			throw new MemoryProviderError('INTERNAL', 'Search operation failed', {
				error: (error as Error).message,
			});
		}
	}

	private ensureSearchGuards(input: MemorySearchInput): void {
		const hasDomain = Boolean(input.domain);
		const hasTags = Array.isArray(input.tags) && input.tags.length > 0;
		const hasTenant = Boolean(input.tenant);
		const hasLabels = Array.isArray(input.labels) && input.labels.length > 0;

		if (!hasDomain && !hasTags && !hasTenant && !hasLabels) {
			throw new MemoryProviderError(
				'VALIDATION',
				'brAInwav: Tenant, domain, tags, or labels filter required for search',
			);
		}
	}

	private async searchWithQdrant(
		input: MemorySearchInput,
		limit: number,
		offset: number,
		threshold: number,
	): Promise<MemorySearchResult[]> {
		const sanitizedQuery = scrubSensitiveContent(input.query);
		const embedding = await this.generateEmbedding(sanitizedQuery);
		const searchType = input.search_type || 'semantic';

		// Qdrant search with filters
		const filter = this.buildQdrantFilter(input);

		const qdrantResults = await this.qdrant?.search(this.qdrantConfig?.collection ?? '', {
			vector: embedding,
			limit: limit + offset,
			score_threshold: searchType === 'semantic' ? threshold : 0,
			filter,
			with_payload: true,
		});

		const results: MemorySearchResult[] = [];

		// Get SQLite rows for full data
		const sliced = (qdrantResults ?? []).slice(offset);
		const ids = sliced
			.map((r) => r.id as string)
			.filter((id): id is string => typeof id === 'string');
		if (ids.length === 0) return results;

		// Security: Use parameterized query to prevent SQL injection
		const placeholders = ids.map(() => '?').join(',');
		const rows = this.db
			.prepare(`
      SELECT * FROM memories WHERE id IN (${placeholders})
    `)
			.all(...ids) as SQLiteMemoryRow[];

		const rowMap = new Map(rows.map((r) => [r.id, r]));

		for (const point of sliced) {
			const row = rowMap.get(point.id as string);
			if (!row) continue;

			const memory = this.mapRowToMemory(row);
			this.mergeVectorPayloadMetadata(memory, (point as { payload?: unknown }).payload);
			const pointTyped = point as { score?: number };
			const safeScore = typeof pointTyped.score === 'number' ? pointTyped.score : 0;
			const result: MemorySearchResult = {
				...memory,
				score: safeScore,
				matchType: 'semantic',
			};

			// If hybrid search is requested, delegate hybrid scoring to a helper to keep this function concise
			await this.applyHybridIfNeeded(result, point, input, limit, pointTyped.score);

			results.push(result);
		}

		// Sort by score
		results.sort((a, b) => b.score - a.score);
		return results;
	}

	private async searchWithFts(
		input: MemorySearchInput,
		limit: number,
		offset: number,
		_threshold: number,
	): Promise<MemorySearchResult[]> {
		// Build query components
		const { query, params } = this.buildFtsQuery(input);

		// Add pagination
		const finalQuery = `${query} ORDER BY score DESC, memories.created_at DESC LIMIT ? OFFSET ?`;
		const finalParams = [...params, limit, offset];

		const rows = this.db.prepare(finalQuery).all(...finalParams) as (SQLiteMemoryRow & {
			score: number;
		})[];

		return rows.map((row) => ({
			...this.mapRowToMemory(row),
			score: row.score || 0,
			matchType: 'keyword' as const,
		}));
	}

	// Extracted helper to build FTS query components - reduces cognitive complexity
	private buildFtsQuery(input: MemorySearchInput): {
		query: string;
		params: Array<string | number>;
	} {
		let query = `
      SELECT memories.*,
	     COALESCE(memories_fts.rank, 0) as score
      FROM memories
      LEFT JOIN memories_fts ON memories.rowid = memories_fts.rowid
    `;

		const conditions: string[] = [];
		const params: Array<string | number> = [];

		// Add FTS match condition
		this.addFtsMatchCondition(input, conditions, params);

		// Add filter conditions
		this.addDomainFilter(input, conditions, params);
		this.addTagsFilter(input, conditions, params);
		this.addTenantFilter(input, conditions, params);
		this.addLabelsFilter(input, conditions, params);

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`;
		}

		return { query, params };
	}

	// Extracted helper for FTS match condition
	private addFtsMatchCondition(
		input: MemorySearchInput,
		conditions: string[],
		params: Array<string | number>,
	): void {
		if (
			input.search_type === 'keyword' ||
			input.search_type === 'tags' ||
			input.search_type === 'hybrid'
		) {
			conditions.push('memories_fts MATCH ?');
			params.push(input.query);
		}
	}

	// Extracted helper for domain filter
	private addDomainFilter(
		input: MemorySearchInput,
		conditions: string[],
		params: Array<string | number>,
	): void {
		if (input.domain) {
			conditions.push('memories.domain = ?');
			params.push(input.domain);
		}
	}

	// Extracted helper for tags filter with security validation
	private addTagsFilter(
		input: MemorySearchInput,
		conditions: string[],
		params: Array<string | number>,
	): void {
		if (input.tags && input.tags.length > 0) {
			const tagConditions = input.tags
				.map((tag, index) => `json_extract(memories.tags, ?) IS NOT NULL`)
				.join(' AND ');
			conditions.push(`(${tagConditions})`);

			// Security: Validate tags to prevent injection
			for (const tag of input.tags) {
				const sanitizedTag = tag.replace(/[^a-zA-Z0-9\s\-_]/g, '');
				params.push(`$[? == "${sanitizedTag}"]`);
			}
		}
	}

	// Extracted helper for tenant filter
	private addTenantFilter(
		input: MemorySearchInput,
		conditions: string[],
		params: Array<string | number>,
	): void {
		if (input.tenant) {
			conditions.push("json_extract(memories.metadata, '$.tenant') = ?");
			params.push(input.tenant);
		}
	}

	// Extracted helper for labels filter
	private addLabelsFilter(
		input: MemorySearchInput,
		conditions: string[],
		params: Array<string | number>,
	): void {
		if (input.labels && input.labels.length > 0) {
			for (const label of input.labels) {
				conditions.push(`EXISTS (
					SELECT 1
					FROM json_each(memories.metadata, '$.labels') AS label
					WHERE label.value = ?
				)`);
				params.push(label);
			}
		}
	}

	private buildQdrantFilter(input: MemorySearchInput): Record<string, unknown> | undefined {
		const must: Array<Record<string, unknown>> = [];

		if (input.domain) {
			must.push({ key: 'domain', match: { value: input.domain } });
		}

		if (input.tags && input.tags.length > 0) {
			must.push({ key: 'tags', match: { any: input.tags } });
		}

		if (input.tenant) {
			must.push({ key: 'tenant', match: { value: input.tenant } });
		}

		if (input.labels && input.labels.length > 0) {
			for (const label of input.labels) {
				must.push({ key: 'labels', match: { value: label } });
			}
		}

		return must.length > 0 ? { must } : undefined;
	}

	private async fetchMemoriesForAnalysis(
		input: MemoryAnalysisInput,
		limit: number,
	): Promise<Memory[]> {
		let query = 'SELECT * FROM memories';
		const params: Array<string | number> = [];
		const conditions: string[] = [];

		if (input.domain) {
			conditions.push('domain = ?');
			params.push(input.domain);
		}

		if (input.tags && input.tags.length > 0) {
			const tagConditions = input.tags.map(() => 'json_extract(tags, ?) IS NOT NULL').join(' OR ');
			conditions.push(`(${tagConditions})`);
			// Security: Validate tags to prevent injection
			for (const tag of input.tags) {
				const sanitizedTag = tag.replace(/[^a-zA-Z0-9\s\-_]/g, '');
				params.push(`$[? == "${sanitizedTag}"]`);
			}
		}

		if (input.time_range) {
			conditions.push('created_at >= ? AND created_at <= ?');
			params.push(
				new Date(input.time_range.start).getTime(),
				new Date(input.time_range.end).getTime(),
			);
		}

		if (conditions.length > 0) {
			query += ` WHERE ${conditions.join(' AND ')}`;
		}

		query += ' ORDER BY created_at DESC LIMIT ?';
		params.push(limit);

		const rows = this.db.prepare(query).all(...params) as SQLiteMemoryRow[];
		return rows.map((row) => this.mapRowToMemory(row));
	}

	// Traverse relationships from a seed memory id using BFS. Extracted to lower cognitive complexity
	private traverseRelationships(seedId: string, maxDepth: number, maxNodes: number) {
		const visited = new Set<string>();
		const queue = [seedId];
		const nodes = new Map<string, MemoryGraphNode>();
		const edges = new Map<string, MemoryGraphEdge>();

		visited.add(seedId);

		for (let depth = 0; depth < maxDepth && queue.length > 0 && nodes.size < maxNodes; depth++) {
			const currentSize = queue.length;

			for (let i = 0; i < currentSize && nodes.size < maxNodes; i++) {
				const currentId = queue.shift();
				if (!currentId) continue;

				const rows = this.db
					.prepare(`
	    SELECT * FROM memory_relationships
	    WHERE source_id = ? OR target_id = ?
	  `)
					.all(currentId, currentId) as SQLiteRelationshipRow[];

				for (const row of rows) {
					this.processRelationshipRow(row, currentId, visited, nodes, edges, queue, maxNodes);
					if (nodes.size >= maxNodes) break;
				}
			}
		}

		return { nodes, edges };
	}

	// Extracted small helper to process a single relationship row to reduce cognitive complexity
	private processRelationshipRow(
		row: SQLiteRelationshipRow,
		currentId: string,
		visited: Set<string>,
		nodes: Map<string, MemoryGraphNode>,
		edges: Map<string, MemoryGraphEdge>,
		queue: string[],
		maxNodes: number,
	): void {
		const otherId = row.source_id === currentId ? row.target_id : row.source_id;

		if (!visited.has(otherId) && nodes.size < maxNodes) {
			visited.add(otherId);
			queue.push(otherId);

			const otherRow = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(otherId) as
				| SQLiteMemoryRow
				| undefined;
			if (otherRow) {
				nodes.set(otherId, {
					id: otherId,
					label: `${otherRow.content.slice(0, 50)}...`,
					type: 'memory',
					weight: otherRow.importance,
				});
			}
		}

		const edgeId = `${row.source_id}-${row.target_id}`;
		if (!edges.has(edgeId)) {
			edges.set(edgeId, {
				source: row.source_id,
				target: row.target_id,
				weight: row.strength,
				type: row.type as RelationshipType,
				directed: true,
			});
		}
	}

	private async mapRelationshipGraph(
		input: Extract<MemoryRelationshipsInput, { action: 'map_graph' }>,
	): Promise<MemoryGraph> {
		const maxDepth = input.max_depth || 3;
		const maxNodes = input.max_nodes || 100;

		// Ensure the seed memory is present and build base node
		const memoryRow = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(input.memory_id) as
			| SQLiteMemoryRow
			| undefined;
		const nodesMap = new Map<string, MemoryGraphNode>();
		if (memoryRow) {
			nodesMap.set(input.memory_id, {
				id: input.memory_id,
				label: `${memoryRow.content.slice(0, 50)}...`,
				type: 'memory',
				weight: memoryRow.importance,
			});
		}

		const { nodes, edges } = this.traverseRelationships(input.memory_id, maxDepth, maxNodes);

		// Merge seed node into the traversal results (traverseRelationships ensures seed is visited)
		for (const [k, v] of nodes.entries()) {
			nodesMap.set(k, v);
		}

		return {
			nodes: Array.from(nodesMap.values()),
			edges: Array.from(edges.values()),
			centralNode: input.memory_id,
			metrics: {
				nodeCount: nodesMap.size,
				edgeCount: edges.size,
				density: nodesMap.size > 1 ? (2 * edges.size) / (nodesMap.size * (nodesMap.size - 1)) : 0,
			},
		};
	}

	private async createRelationship(
		input: Extract<MemoryRelationshipsInput, { action: 'create' }>,
	): Promise<MemoryRelationship> {
		const id = randomUUID();
		const now = Date.now();
		const stmt = this.db.prepare(`
      INSERT INTO memory_relationships (id, source_id, target_id, type, strength, bidirectional, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			id,
			input.source_id,
			input.target_id,
			input.relationship_type,
			input.strength || 0.5,
			input.bidirectional || false,
			now,
		);

		return {
			id,
			sourceId: input.source_id,
			targetId: input.target_id,
			type: input.relationship_type,
			strength: input.strength || 0.5,
			bidirectional: input.bidirectional || false,
			createdAt: new Date(now),
		};
	}

	private async findRelationships(
		input: Extract<MemoryRelationshipsInput, { action: 'find' }>,
	): Promise<MemoryRelationship[]> {
		const query = `
       SELECT * FROM memory_relationships
       WHERE source_id = ? OR target_id = ?
       ORDER BY strength DESC
     `;
		const rows = this.db
			.prepare(query)
			.all(input.memory_id, input.memory_id) as SQLiteRelationshipRow[];

		return rows.map((row) => ({
			id: row.id,
			sourceId: row.source_id,
			targetId: row.target_id,
			type: row.type as RelationshipType,
			strength: row.strength,
			bidirectional: !!row.bidirectional,
			createdAt: new Date(row.created_at),
		}));
	}

	private async deleteRelationship(
		input: Extract<MemoryRelationshipsInput, { action: 'delete' }>,
	): Promise<{ success: boolean }> {
		const result = this.db
			.prepare(`
       DELETE FROM memory_relationships
       WHERE source_id = ? AND target_id = ? AND type = ?
     `)
			.run(input.source_id, input.target_id, input.relationship_type);

		if (
			'bidirectional' in input &&
			(input as unknown as { bidirectional?: boolean }).bidirectional
		) {
			this.db
				.prepare(`
	 DELETE FROM memory_relationships
	 WHERE source_id = ? AND target_id = ? AND type = ?
       `)
				.run(input.target_id, input.source_id, input.relationship_type);
		}

		return { success: result.changes > 0 };
	}

	async stats(input?: MemoryStatsInput): Promise<MemoryStats> {
		try {
			// CodeQL Fix #210, #191-195: Validate include is an array to prevent type confusion
			const includeRaw = input?.include || [
				'total_count',
				'domain_distribution',
				'tag_distribution',
			];
			const include = validateArrayParam(includeRaw, 'include', 'string');

			const stats: MemoryStats = {
				totalCount: 0,
				domainDistribution: {},
				tagDistribution: {},
				importanceDistribution: {},
			};

			// Total count
			if (include.includes('total_count')) {
				const result = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as {
					count: number;
				};
				stats.totalCount = result.count;
			}

			// Domain distribution
			if (include.includes('domain_distribution')) {
				const rows = this.db
					.prepare(`
	  SELECT domain, COUNT(*) as count FROM memories
	  WHERE domain IS NOT NULL
	  GROUP BY domain
	`)
					.all() as { domain: string; count: number }[];

				stats.domainDistribution = rows.reduce(
					(acc, row) => {
						acc[row.domain] = row.count;
						return acc;
					},
					{} as Record<string, number>,
				);
			}

			// Tag distribution
			if (include.includes('tag_distribution')) {
				const rows = this.db.prepare('SELECT tags FROM memories WHERE tags IS NOT NULL').all() as {
					tags: string;
				}[];
				const tagCounts = new Map<string, number>();

				rows.forEach((row) => {
					const tags = JSON.parse(row.tags) as string[];
					tags.forEach((tag) => {
						tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
					});
				});

				stats.tagDistribution = Object.fromEntries(tagCounts);
			}

			// Importance distribution
			if (include.includes('importance_distribution')) {
				const rows = this.db
					.prepare(`
	  SELECT importance, COUNT(*) as count FROM memories
	  GROUP BY importance
	`)
					.all() as { importance: number; count: number }[];

				stats.importanceDistribution = rows.reduce(
					(acc, row) => {
						acc[row.importance] = row.count;
						return acc;
					},
					{} as Record<number, number>,
				);
			}

			// Storage size
			if (include.includes('storage_size')) {
				const pageResult = this.db
					.prepare(
						'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
					)
					.get() as { size: number };
				const sqliteBytes = pageResult.size;

				stats.storageSize = {
					sqliteBytes,
					totalBytes: sqliteBytes,
				};
			}

			// Qdrant stats
			if (include.includes('qdrant_stats') && this.qdrant) {
				try {
					if (await this.isQdrantHealthy()) {
						const collectionName = this.qdrantConfig?.collection ?? '';
						await this.qdrant.getCollection(collectionName);
						const vectorCount = await this.qdrant.count(collectionName);

						stats.qdrantStats = {
							healthy: true,
							collectionExists: true,
							vectorCount: vectorCount.count,
						};
					} else {
						stats.qdrantStats = {
							healthy: false,
							collectionExists: false,
							vectorCount: 0,
						};
					}
				} catch {
					stats.qdrantStats = {
						healthy: false,
						collectionExists: false,
						vectorCount: 0,
					};
				}
			}

			return stats;
		} catch (error) {
			logger.error('Stats failed', { error: (error as Error).message });
			throw new MemoryProviderError('INTERNAL', 'Failed to retrieve stats', {
				error: (error as Error).message,
			});
		}
	}

	async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
		const details: Record<string, unknown> = {
			sqlite: 'healthy',
			queueSize: this.queue.size,
		};

		let qdrantState: 'healthy' | 'unhealthy' | 'disabled';
		if (!this.qdrant) {
			qdrantState = 'disabled';
		} else {
			qdrantState = (await this.isQdrantHealthy()) ? 'healthy' : 'unhealthy';
		}
		details.qdrant = qdrantState;

		// Provide a runtime-inspectable circuit breaker state without placeholder references
		if (this.circuitBreaker) {
			const cb = this.circuitBreaker;
			if (typeof cb.isClosed === 'function') {
				details.circuitBreaker = cb.isClosed() ? 'closed' : 'open';
			} else if (typeof cb.state === 'string') {
				details.circuitBreaker = cb.state;
			} else {
				details.circuitBreaker = 'active';
			}
		} else {
			details.circuitBreaker = 'disabled';
		}

		const healthy =
			details.sqlite === 'healthy' &&
			(details.qdrant === 'healthy' || details.qdrant === 'disabled');

		return { healthy, details };
	}

	private mapRowToMemory(row: SQLiteMemoryRow): Memory {
		return {
			id: row.id,
			content: row.content,
			importance: row.importance,
			domain: row.domain || undefined,
			tags: row.tags ? JSON.parse(row.tags) : [],
			metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
			vectorIndexed: !!row.vector_indexed,
		};
	}

	async cleanup(): Promise<void> {
		// Clean up old/expired data if needed
		logger.info('Cleanup completed');
	}

	async optimize(): Promise<void> {
		// Optimize database and indexes
		this.db.exec('VACUUM');
		this.db.exec('ANALYZE');
		logger.info('Database optimized');
	}

	async close(): Promise<void> {
		this.queue.clear();
		await this.queue.onIdle();
		this.db.close();
		logger.info('Memory provider closed');
	}

	async analysis(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult> {
		const analysisType = input.analysis_type || 'summary';
		const maxMemories = Math.min(input.max_memories || 100, 1000);

		try {
			// Fetch relevant memories
			const memories = await this.fetchMemoriesForAnalysis(input, maxMemories);

			switch (analysisType) {
				case 'summary':
					return this.generateSummary(memories, input);
				case 'temporal_patterns':
					return this.analyzeTemporalPatterns(memories, input);
				case 'tag_clusters':
					return this.analyzeTagClusters(memories, input);
				case 'concept_network':
					return this.buildConceptNetwork(memories, input);
				default:
					return this.generateCustomAnalysis(memories, input);
			}
		} catch (error) {
			logger.error('Analysis failed', { type: analysisType, error: (error as Error).message });
			throw new MemoryProviderError('INTERNAL', 'Analysis operation failed', {
				error: (error as Error).message,
			});
		}
	}

	private generateSummary(memories: Memory[], _input: MemoryAnalysisInput): MemoryAnalysisResult {
		const totalMemories = memories.length;
		const domains = [...new Set(memories.map((m) => m.domain).filter(Boolean))];
		const allTags = memories.flatMap((m) => m.tags);
		const tagCounts = allTags.reduce(
			(acc, tag) => {
				acc[tag] = (acc[tag] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const topTags = Object.entries(tagCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([tag, count]) => ({ tag, count }));

		const avgImportance =
			memories.reduce((sum, m) => sum + m.importance, 0) / Math.max(totalMemories, 1);

		const summary =
			`Analyzed ${totalMemories} memories across ${domains.length} domains. ` +
			`Most common tags: ${topTags.map((t) => t.tag).join(', ')}. ` +
			`Average importance: ${avgImportance.toFixed(2)}`;

		return {
			type: 'summary',
			summary,
			insights: [
				`Total memories analyzed: ${totalMemories}`,
				`Unique domains: ${domains.length}`,
				`Most frequent tag: ${topTags[0]?.tag || 'N/A'} (${topTags[0]?.count || 0} occurrences)`,
			],
			patterns: {
				domainCount: domains.length,
				tagCount: Object.keys(tagCounts).length,
				avgImportance,
			},
		};
	}

	private analyzeTemporalPatterns(
		memories: Memory[],
		_input: MemoryAnalysisInput,
	): MemoryAnalysisResult {
		const patterns = memories.reduce(
			(acc, memory) => {
				const date = new Date(memory.createdAt).toISOString().split('T')[0];
				if (!acc[date]) acc[date] = 0;
				acc[date]++;
				return acc;
			},
			{} as Record<string, number>,
		);

		const sortedDates = Object.keys(patterns).sort((a, b) => a.localeCompare(b));
		const temporalPatterns = sortedDates.map((date) => {
			const count = patterns[date];
			let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
			const idx = sortedDates.indexOf(date);
			if (idx > 0) {
				const prevCount = patterns[sortedDates[idx - 1]];
				if (count > prevCount * 1.1) trend = 'increasing';
				else if (count < prevCount * 0.9) trend = 'decreasing';
			}
			return { period: date, frequency: count, trend };
		});

		const mostActiveDay =
			sortedDates.length > 0
				? sortedDates.reduce((a, b) => (patterns[a] > patterns[b] ? a : b), sortedDates[0])
				: 'N/A';

		return {
			type: 'temporal_patterns',
			summary: `Analyzed temporal patterns across ${sortedDates.length} days`,
			insights: [
				`Most active day: ${mostActiveDay}`,
				`Average memories per day: ${sortedDates.length > 0 ? (memories.length / sortedDates.length).toFixed(2) : '0.00'}`,
			],
			temporalPatterns,
		};
	}

	private analyzeTagClusters(
		memories: Memory[],
		_input: MemoryAnalysisInput,
	): MemoryAnalysisResult {
		const tagMap = new Map<string, Set<string>>();

		memories.forEach((memory) => {
			memory.tags.forEach((tag) => {
				if (!tagMap.has(tag)) tagMap.set(tag, new Set());
				tagMap.get(tag)?.add(memory.id);
			});
		});

		const clusters = Array.from(tagMap.entries())
			.map(([tag, memoryIds]) => ({
				id: tag,
				label: tag,
				size: memoryIds.size,
				examples: memories
					.filter((m) => memoryIds.has(m.id))
					.slice(0, 3)
					.map((m) => `${m.content.slice(0, 100)}...`),
			}))
			.sort((a, b) => b.size - a.size)
			.slice(0, 20);

		return {
			type: 'tag_clusters',
			summary: `Identified ${clusters.length} tag clusters`,
			clusters,
		};
	}

	private buildConceptNetwork(
		memories: Memory[],
		_input: MemoryAnalysisInput,
	): MemoryAnalysisResult {
		// Simple concept extraction based on common words
		const wordFreq = new Map<string, number>();
		const stopWords = new Set([
			'the',
			'a',
			'an',
			'and',
			'or',
			'but',
			'in',
			'on',
			'at',
			'to',
			'for',
			'of',
			'with',
			'by',
		]);

		memories.forEach((memory) => {
			const words = memory.content.toLowerCase().split(/\s+/);
			words.forEach((word) => {
				if (word.length > 3 && !stopWords.has(word)) {
					wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
				}
			});
		});

		const topWords = Array.from(wordFreq.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 50)
			.map(([word, freq]) => ({ word, freq }));

		const nodes = topWords.map((item, idx) => ({
			id: `concept-${idx}`,
			label: item.word,
			weight: item.freq,
		}));

		// Simple edges based on co-occurrence
		const edges: Array<{ source: string; target: string; weight: number; type: string }> = [];
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < Math.min(i + 5, nodes.length); j++) {
				edges.push({
					source: nodes[i].id,
					target: nodes[j].id,
					weight: this.deterministicWeight(nodes[i].id, nodes[j].id),
					type: 'related_to',
				});
			}
		}

		return {
			type: 'concept_network',
			summary: `Built concept network with ${nodes.length} concepts`,
			conceptNetwork: { nodes, edges },
		};
	}

	private deterministicWeight(a: string, b: string): number {
		// Deterministic, repeatable pseudo-weight based on string hashing.
		let h = 2166136261 >>> 0;
		const s = `${a}::${b}`;
		for (let i = 0; i < s.length; i++) {
			h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
		}
		// Map to range [0.1, 0.6)
		return (h % 500) / 1000 + 0.1;
	}

	private generateCustomAnalysis(
		memories: Memory[],
		_input: MemoryAnalysisInput,
	): MemoryAnalysisResult {
		return {
			type: 'custom',
			summary: `Custom analysis on ${memories.length} memories`,
			insights: ['Custom analysis not yet implemented'],
		};
	}

	async relationships(
		input: MemoryRelationshipsInput,
	): Promise<MemoryRelationship | MemoryRelationship[] | MemoryGraph | { success: boolean }> {
		try {
			switch (input.action) {
				case 'create':
					return this.createRelationship(input);
				case 'find':
					return this.findRelationships(input);
				case 'map_graph':
					return this.mapRelationshipGraph(input);
				case 'delete':
					return this.deleteRelationship(input);
				default:
					throw new MemoryProviderError('VALIDATION', 'Invalid relationship action');
			}
		} catch (error) {
			logger.error('Relationship operation failed', {
				action: input.action,
				error: (error as Error).message,
			});
			throw new MemoryProviderError('INTERNAL', 'Relationship operation failed', {
				error: (error as Error).message,
			});
		}
	}

	private safePointScore(point: unknown): number {
		return typeof point === 'number' && !Number.isNaN(point) ? point : 0;
	}

	private combineHybridScore(semanticScore: unknown, ftsScore: unknown, weight: number): number {
		const safeSemantic = this.safePointScore(semanticScore);
		const safeFts = this.safePointScore(ftsScore);
		return safeSemantic * weight + safeFts * (1 - weight);
	}

	private mergeVectorPayloadMetadata(memory: Memory, payload: unknown): void {
		if (!payload || typeof payload !== 'object') {
			return;
		}

		const candidate = payload as Record<string, unknown>;
		const nextMetadata: Record<string, unknown> = { ...(memory.metadata ?? {}) };
		let mutated = false;

		const layer = candidate.memory_layer;
		if (typeof layer === 'string' && layer.length > 0) {
			nextMetadata.memory_layer = layer;
			mutated = true;
		}

		const layerVersion = candidate.memory_layer_version;
		if (typeof layerVersion === 'string' && layerVersion.length > 0) {
			nextMetadata.memory_layer_version = layerVersion;
			mutated = true;
		}

		const updatedAt = candidate.memory_layer_updated_at;
		if (typeof updatedAt === 'string' && updatedAt.length > 0) {
			nextMetadata.memory_layer_updated_at = updatedAt;
			mutated = true;
		}

		if (mutated) {
			memory.metadata = nextMetadata as MemoryMetadata;
		}
	}

	private async applyHybridIfNeeded(
		result: MemorySearchResult,
		point: unknown,
		input: MemorySearchInput,
		limit: number,
		pointScore?: number,
	): Promise<void> {
		if (input.search_type !== 'hybrid') return;
		const ftsResults = await this.searchWithFts(input, limit, 0, 0);
		const id = (point as { id?: string }).id;
		if (!id) return;
		const ftsResult = ftsResults.find((r) => r.id === id);
		if (!ftsResult) return;
		const hybridWeight = input.hybrid_weight || this.config.hybridWeight;
		result.score = this.combineHybridScore(pointScore, ftsResult.score, hybridWeight);
		result.matchType = 'hybrid';
	}
}
