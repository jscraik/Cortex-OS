import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import { z } from 'zod';
import { postChunk as applyPostChunk, type PostChunkingOptions } from './chunkers/post-chunker.js';
import { CircuitBreaker } from './lib/circuit-breaker.js';
import { CitationBundler, type EnhancedCitationBundle } from './lib/citation-bundler.js';
import { ragPipelineConfigSchema, validateConfig } from './lib/config-validation.js';
import { type ContentSecurityConfig, ContentSecurityPolicy } from './lib/content-security.js';
import type { Chunk, Document, Embedder, ReliabilityPolicy, Store } from './lib/index.js';
import { rerankDocs } from './lib/rerank-docs.js';
import { withRetry } from './lib/retry.js';
import { validateContentSize, validateEmbeddingDim } from './lib/validation.js';
import { ingestText as ingestTextHelper } from './pipeline/ingest.js';
import type { Qwen3Reranker } from './pipeline/qwen3-reranker.js';
import {
	EvidenceGate,
	type EvidenceGateOptions,
	type EvidenceGateResult,
} from './retrieval/evidence-gate.js';
import {
	type FreshnessOptions,
	routeByCache,
	routeByFreshness,
	routeByLive,
} from './retrieval/freshness-router.js';
import { HierarchicalStore } from './store/hierarchical-store.js';

export interface RAGPipelineConfig {
	embedder: Embedder;
	store: Store;
	chunkSize?: number;
	chunkOverlap?: number;
	freshnessEpsilon?: number;
	cacheThresholdMs?: number;
	preferCache?: boolean;
	evidenceGate?: EvidenceGateOptions;
	reliability?: {
		embedder?: ReliabilityPolicy;
		store?: ReliabilityPolicy;
	};
	security?: {
		allowedEmbeddingDims?: number[]; // e.g., [384,768,1024,1536,3072]
		maxContentChars?: number; // default 25k
		contentSecurity?: Partial<ContentSecurityConfig>; // XSS/injection protection
	};
	retrieval?: {
		hierarchical?: {
			expandContext?: boolean;
			maxLevels?: number; // default 2
			dedupe?: boolean; // collapse repeated lines
			maxContextChars?: number; // cap context length
		};
	};
}

export interface EvidenceFirstResult {
	route: 'evidence' | 'llm' | 'no-answer';
	evidence: EnhancedCitationBundle;
	gateResult: EvidenceGateResult;
	response?: string;
}

export class RAGPipeline {
	private readonly E: Embedder;
	private readonly S: Store;
	private readonly reliability?: {
		embedder?: ReliabilityPolicy;
		store?: ReliabilityPolicy;
	};
	private readonly breaker: {
		embedder?: CircuitBreaker;
		store?: CircuitBreaker;
	} = {};
	private readonly hierarchical?: {
		expandContext: boolean;
		maxLevels: number;
		dedupe: boolean;
		maxContextChars?: number;
	};
	private readonly chunkSize: number;
	private readonly chunkOverlap: number;
	private readonly freshnessOptions: FreshnessOptions;
	private readonly evidenceGate: EvidenceGate;
	private readonly allowedEmbeddingDims: Set<number>;
	private readonly autoRegisterEmbeddingDims: boolean;
	private readonly maxContentChars: number;
	private readonly contentSecurity: ContentSecurityPolicy;
	private static readonly MAX_DYNAMIC_EMBED_DIM = 4096;
	private readonly assertEmbeddingDim = (vector: number[]): void => {
		try {
			validateEmbeddingDim(vector, Array.from(this.allowedEmbeddingDims));
			return;
		} catch (error) {
			if (!this.autoRegisterEmbeddingDims) {
				throw error;
			}

			const dimension = Array.isArray(vector) ? vector.length : 0;
			if (!Number.isInteger(dimension) || dimension <= 0) {
				throw error;
			}

			if (dimension > RAGPipeline.MAX_DYNAMIC_EMBED_DIM) {
				throw new Error(
					`Embedding dimension ${dimension} exceeds dynamic allowance of ${RAGPipeline.MAX_DYNAMIC_EMBED_DIM}`,
				);
			}

			if (!this.allowedEmbeddingDims.has(dimension)) {
				this.allowedEmbeddingDims.add(dimension);
			}

			validateEmbeddingDim(vector, Array.from(this.allowedEmbeddingDims));
		}
	};
	private readonly postChunking?: PostChunkingOptions;
	// Apply retry/breaker policies to an operation for a given edge
	private async runWithPolicies<T>(
		edge: 'embedder' | 'store',
		op: () => Promise<T>,
		runIdOverride?: string,
	): Promise<T> {
		const policy = this.reliability?.[edge];
		const breakerInst = this.breaker?.[edge];
		const label = edge === 'embedder' ? 'rag.embedder' : 'rag.store';
		const runId = runIdOverride ?? generateRunId();

		const exec = async () => {
			const start = Date.now();
			try {
				const inner = async () => (breakerInst ? breakerInst.execute(op) : op());
				const out = await inner();
				const ms = Date.now() - start;
				recordLatency(label, ms, { component: 'rag' });
				recordOperation(label, true, runId, { component: 'rag' });
				return out;
			} catch (err) {
				const ms = Date.now() - start;
				recordLatency(label, ms, { component: 'rag' });
				recordOperation(label, false, runId, { component: 'rag' });
				throw err;
			}
		};

		if (policy?.retry) {
			return withRetry(exec, {
				maxAttempts: policy.retry.maxAttempts,
				baseDelayMs: policy.retry.baseDelayMs ?? 100,
			});
		}
		return exec();
	}

	constructor(config: RAGPipelineConfig) {
		// Validate configuration with comprehensive schema first (this will catch most issues)
		try {
			validateConfig(ragPipelineConfigSchema, config, 'RAGPipeline');
		} catch (error) {
			// Re-throw with more specific context
			throw new Error(`RAGPipeline configuration validation failed: ${(error as Error).message}`);
		}

		const schema = z.object({
			embedder: z.custom<Embedder>(
				(e): e is Embedder =>
					typeof e === 'object' &&
					e !== null &&
					typeof (e as { embed?: unknown }).embed === 'function',
			),
			store: z.custom<Store>((s): s is Store => {
				const candidate = s as { upsert?: unknown; query?: unknown } | null;
				return (
					typeof s === 'object' &&
					s !== null &&
					typeof candidate?.upsert === 'function' &&
					typeof candidate?.query === 'function'
				);
			}),
			chunkSize: z.number().int().positive().default(300),
			chunkOverlap: z.number().int().nonnegative().default(0),
			freshnessEpsilon: z.number().min(0).max(1).default(0.02),
			cacheThresholdMs: z
				.number()
				.positive()
				.default(30 * 60 * 1000),
			preferCache: z.boolean().default(false),
			evidenceGate: z.any().optional(),
			retrieval: z
				.object({
					hierarchical: z
						.object({
							expandContext: z.boolean().default(false),
							maxLevels: z.number().int().positive().max(10).default(2),
							dedupe: z.boolean().default(true),
							maxContextChars: z.number().int().positive().optional(),
						})
						.optional(),
				})
				.optional(),
		});
		const parsed = schema.parse(config);
		this.E = parsed.embedder;
		// Store may be wrapped for hierarchical expansion; capture final instance in local then assign readonly field once
		let baseStore = parsed.store;
		this.chunkSize = parsed.chunkSize;
		this.chunkOverlap = parsed.chunkOverlap;
		this.freshnessOptions = {
			epsilon: parsed.freshnessEpsilon,
			cacheThresholdMs: parsed.cacheThresholdMs,
			preferCache: parsed.preferCache,
		};
		this.evidenceGate = new EvidenceGate(parsed.evidenceGate);
		this.reliability = config.reliability;
		// Initialize circuit breakers if configured
		const rb = this.reliability;
		if (rb?.embedder?.breaker) {
			this.breaker.embedder = new CircuitBreaker({
				failureThreshold: rb.embedder.breaker.failureThreshold,
				resetTimeoutMs: rb.embedder.breaker.resetTimeoutMs,
			});
		}
		if (rb?.store?.breaker) {
			this.breaker.store = new CircuitBreaker({
				failureThreshold: rb.store.breaker.failureThreshold,
				resetTimeoutMs: rb.store.breaker.resetTimeoutMs,
			});
		}
		// Security defaults and config
		const DEFAULT_DIMS = [384, 768, 1024, 1536, 3072];
		const DEFAULT_MAX_CHARS = 25_000;
		const sec = (config.security ?? {}) as {
			allowedEmbeddingDims?: number[];
			maxContentChars?: number;
			contentSecurity?: Partial<ContentSecurityConfig>;
		};
		const userProvidedDims = Array.isArray(sec.allowedEmbeddingDims)
			? sec.allowedEmbeddingDims.filter((dim) => Number.isInteger(dim) && dim > 0)
			: undefined;
		const hasExplicitDims =
			Array.isArray(sec.allowedEmbeddingDims) && (userProvidedDims?.length ?? 0) > 0;
		const baseDims = hasExplicitDims ? (userProvidedDims as number[]) : DEFAULT_DIMS;
		this.allowedEmbeddingDims = new Set(baseDims);
		this.autoRegisterEmbeddingDims = !hasExplicitDims;
		this.maxContentChars =
			typeof sec.maxContentChars === 'number' && sec.maxContentChars > 0
				? sec.maxContentChars
				: DEFAULT_MAX_CHARS;

		// Initialize content security policy
		this.contentSecurity = new ContentSecurityPolicy(sec.contentSecurity ?? {});

		const h = parsed.retrieval?.hierarchical;
		if (h?.expandContext) {
			// Wrap store with hierarchical expansion
			this.hierarchical = {
				expandContext: h.expandContext,
				maxLevels: h.maxLevels,
				dedupe: h.dedupe,
				maxContextChars: h.maxContextChars,
			};
			if (!(baseStore instanceof HierarchicalStore)) {
				baseStore = new HierarchicalStore(baseStore, {
					defaultExpandContext: true,
					defaultMaxLevels: h.maxLevels,
				});
			}
		}
		this.S = baseStore;
		// Optional: post-chunking settings from retrieval config
		this.postChunking = (
			config.retrieval as { postChunking?: PostChunkingOptions } | undefined
		)?.postChunking;
	}

	async ingest(chunks: Chunk[]): Promise<void> {
		const texts = chunks.map((c) => c.text);
		const ingestRunId = generateRunId();
		const ingestStart = Date.now();
		// Enforce content size limits pre-embed
		for (const t of texts) validateContentSize(t, this.maxContentChars);

		// Sanitize content for security before embedding and storage
		const sanitizedChunks = chunks.map((c) => ({
			...c,
			text: this.contentSecurity.sanitizeText(c.text),
			metadata: c.metadata ? this.contentSecurity.sanitizeMetadata(c.metadata) : undefined,
		}));

		const sanitizedTexts = sanitizedChunks.map((c) => c.text);
		const doEmbed = async () => this.E.embed(sanitizedTexts);
		const embedStart = Date.now();
		let embeddings: number[][];
		try {
			embeddings = await this.runWithPolicies('embedder', doEmbed, ingestRunId);
		} catch (err) {
			// Record total latency and failed operation when embedder fails early
			recordLatency('rag.ingest.total_ms', Date.now() - ingestStart, { component: 'rag' });
			recordOperation('rag.ingest', false, ingestRunId, { component: 'rag' });
			throw err;
		}
		recordLatency('rag.ingest.embed_ms', Date.now() - embedStart, { component: 'rag' });
		// Observability: embedding batch size and chunk distribution (lengths)
		recordLatency('rag.embed.batch_size', embeddings.length, { component: 'rag' });
		const totalChars = sanitizedTexts.reduce((a, t) => a + (t?.length ?? 0), 0);
		recordLatency('rag.chunk.total_chars', totalChars, { component: 'rag' });
		// Validate embedding dimensions
		if (embeddings.length > 0) {
			for (const v of embeddings) this.assertEmbeddingDim(v);
		}
		if (embeddings.length !== sanitizedChunks.length) {
			throw new Error(
				`Embedding count (${embeddings.length}) does not match chunk count (${sanitizedChunks.length})`,
			);
		}
		const toUpsert = sanitizedChunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
		const doUpsert = async () => this.S.upsert(toUpsert);
		const upsertStart = Date.now();
		try {
			await this.runWithPolicies('store', doUpsert, ingestRunId);
		} catch (err) {
			recordLatency('rag.ingest.total_ms', Date.now() - ingestStart, { component: 'rag' });
			recordOperation('rag.ingest', false, ingestRunId, { component: 'rag' });
			throw err;
		}
		recordLatency('rag.ingest.upsert_ms', Date.now() - upsertStart, { component: 'rag' });
		// total
		recordLatency('rag.ingest.total_ms', Date.now() - ingestStart, { component: 'rag' });
		recordOperation('rag.ingest', true, ingestRunId, { component: 'rag' });
	}

	async ingestText(source: string, text: string): Promise<void> {
		// Enforce content size limits pre-chunking
		validateContentSize(text, this.maxContentChars);

		// Sanitize content for security before processing
		const sanitizedText = this.contentSecurity.sanitizeText(text);

		await ingestTextHelper({
			source,
			text: sanitizedText,
			embedder: this.E,
			store: this.S,
			chunkSize: this.chunkSize,
			overlap: this.chunkOverlap,
		});
	}

	async retrieve(query: string, topK = 5): Promise<EnhancedCitationBundle> {
		return this.retrieveInternal(query, topK);
	}

	private async retrieveInternal(
		query: string,
		topK: number,
		runIdOverride?: string,
	): Promise<EnhancedCitationBundle> {
		validateContentSize(query, this.maxContentChars);

		// Sanitize query for security
		const sanitizedQuery = this.contentSecurity.sanitizeText(query);

		const retrieveRunId = runIdOverride ?? generateRunId();
		const totalStart = Date.now();
		const doEmbed = async () => this.E.embed([sanitizedQuery]);
		const embedStart = Date.now();
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed, retrieveRunId));
		recordLatency('rag.retrieve.embed_ms', Date.now() - embedStart, { component: 'rag' });
		if (embs.length > 0) this.assertEmbeddingDim(embs[0]);
		const emb = embs[0] ?? [];
		const queryStart = Date.now();
		let chunks = await this.queryMaybeHybrid(emb, sanitizedQuery, topK, retrieveRunId);
		chunks = this.applyPostChunkingIfEnabled(chunks, sanitizedQuery);
		recordLatency('rag.retrieve.query_ms', Date.now() - queryStart, { component: 'rag' });
		if (this.hierarchical?.expandContext) {
			// Optionally dedupe and cap context
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}

		// Sanitize retrieved chunks for security before returning
		const sanitizedChunks = chunks.map((c) => ({
			...c,
			text: this.contentSecurity.sanitizeText(c.text),
			metadata: c.metadata ? this.contentSecurity.sanitizeMetadata(c.metadata) : undefined,
		}));

		const routed = routeByFreshness(sanitizedChunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		try {
			const bundle = bundler.bundle(routed);
			recordLatency('rag.retrieve.total_ms', Date.now() - totalStart, { component: 'rag' });
			recordOperation('rag.retrieve', true, retrieveRunId, { component: 'rag' });
			return bundle;
		} catch (err) {
			recordLatency('rag.retrieve.total_ms', Date.now() - totalStart, { component: 'rag' });
			recordOperation('rag.retrieve', false, retrieveRunId, { component: 'rag' });
			throw err;
		}
	}

	async retrieveWithClaims(
		query: string,
		claims: string[],
		topK = 5,
	): Promise<EnhancedCitationBundle> {
		validateContentSize(query, this.maxContentChars);
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		if (embs.length > 0) this.assertEmbeddingDim(embs[0]);
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		chunks = this.applyPostChunkingIfEnabled(chunks, query);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundleWithClaims(routed, claims);
	}

	async retrieveWithDeduplication(query: string, topK = 5): Promise<EnhancedCitationBundle> {
		validateContentSize(query, this.maxContentChars);
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		if (embs.length > 0) this.assertEmbeddingDim(embs[0]);
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		chunks = this.applyPostChunkingIfEnabled(chunks, query);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundleWithDeduplication(routed);
	}

	async retrieveFromCache(
		query: string,
		topK = 5,
		cacheThresholdMs?: number,
	): Promise<EnhancedCitationBundle> {
		validateContentSize(query, this.maxContentChars);
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		if (embs.length > 0) this.assertEmbeddingDim(embs[0]);
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		chunks = this.applyPostChunkingIfEnabled(chunks, query);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByCache(chunks, cacheThresholdMs);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	async retrieveLive(
		query: string,
		topK = 5,
		freshnessThresholdMs?: number,
	): Promise<EnhancedCitationBundle> {
		validateContentSize(query, this.maxContentChars);
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		if (embs.length > 0) this.assertEmbeddingDim(embs[0]);
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByLive(chunks, freshnessThresholdMs);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	private async queryMaybeHybrid(emb: number[], query: string, topK: number, runId?: string) {
		const sAny = this.S as unknown as {
			queryWithText?: (
				e: number[],
				q: string,
				k?: number,
			) => Promise<Array<Chunk & { score?: number }>>;
		} & Store;
		const doQuery = async () =>
			typeof sAny.queryWithText === 'function'
				? sAny.queryWithText(emb, query, topK)
				: this.S.query(emb, topK);
		return selfSafe(this.runWithPolicies('store', doQuery, runId));
	}

	private applyContextPostprocessing<T extends Chunk & { score?: number }>(c: T): T {
		const meta = c.metadata ?? ({} as Record<string, unknown>);
		let context = typeof meta.context === 'string' ? meta.context : '';
		if (!context) return c;
		// Deduplicate lines if enabled
		if (this.hierarchical?.dedupe) {
			const seen = new Set<string>();
			context = context
				.split(/\r?\n/)
				.filter((line) => {
					const key = line.trim();
					if (!key) return false;
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				})
				.join('\n');
		}
		// Cap length if configured
		if (this.hierarchical?.maxContextChars && context.length > this.hierarchical.maxContextChars) {
			context = context.slice(0, this.hierarchical.maxContextChars);
		}
		return { ...c, metadata: { ...meta, context } } as T;
	}

	private applyPostChunkingIfEnabled<T extends Chunk & { score?: number }>(
		chunks: T[],
		query: string,
	): T[] {
		const cfg = this.postChunking;
		if (!cfg?.enabled || chunks.length === 0) return chunks;
		const simplified = chunks.map((c) => ({ id: c.id, text: c.text, metadata: c.metadata }));
		const merged = applyPostChunk(simplified, query, cfg);
		// Map merged back to minimal T by carrying text and metadata; ids already present
		return merged.map((m) => ({ id: m.id, text: m.text, metadata: m.metadata }) as T);
	}

	/**
	 * Evidence-first retrieval: routes based on evidence quality
	 */
	async retrieveWithEvidenceGate(
		query: string,
		claims?: string[],
		topK = 5,
	): Promise<EvidenceFirstResult> {
		// First, retrieve evidence
		const evidence = claims
			? await this.retrieveWithClaims(query, claims, topK)
			: await this.retrieve(query, topK);

		// Apply evidence gate to determine routing
		const routing = this.evidenceGate.shouldRoute(evidence, query);

		return {
			route: routing.route,
			evidence,
			gateResult: routing.result,
			response: routing.response,
		};
	}

	/**
	 * Updates evidence gate configuration
	 */
	updateEvidenceGate(options: Partial<EvidenceGateOptions>): void {
		this.evidenceGate.updateOptions(options);
	}

	/**
	 * Gets current evidence gate configuration
	 */
	getEvidenceGateOptions() {
		return this.evidenceGate.getOptions();
	}

	/**
	 * Retrieve and rerank in a single correlated operation.
	 * Emits retrieve metrics and correlates embedder/store/reranker via a shared run id.
	 */
	async retrieveAndRerank(
		query: string,
		topK: number,
		reranker: Qwen3Reranker,
	): Promise<Document[]> {
		// Use a single correlation id across steps and emit top-level op
		const runId = generateRunId();
		const start = Date.now();
		try {
			const bundle = await this.retrieveInternal(query, topK, runId);
			const docs: Document[] = bundle.citations.map((c) => ({ id: c.id, content: c.text ?? '' }));
			const out = await rerankDocs(reranker, query, docs, topK, { correlationId: runId });
			recordLatency('rag.retrieve_and_rerank.total_ms', Date.now() - start, { component: 'rag' });
			recordOperation('rag.retrieve_and_rerank', true, runId, { component: 'rag' });
			return out;
		} catch (err) {
			recordLatency('rag.retrieve_and_rerank.total_ms', Date.now() - start, { component: 'rag' });
			recordOperation('rag.retrieve_and_rerank', false, runId, { component: 'rag' });
			throw err;
		}
	}
}

// Helper to swallow errors and return a safe fallback
async function selfSafe<T>(p: Promise<T>): Promise<T> {
	try {
		return await p;
	} catch {
		// Return default empty-like values when reliability degraded
		return [] as unknown as T;
	}
}
