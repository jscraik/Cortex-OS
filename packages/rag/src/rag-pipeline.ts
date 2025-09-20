import { generateRunId, recordLatency, recordOperation } from '@cortex-os/observability';
import { z } from 'zod';
import { CircuitBreaker } from './lib/circuit-breaker.js';
import { CitationBundler, type EnhancedCitationBundle } from './lib/citation-bundler.js';
import type { Chunk, Embedder, ReliabilityPolicy, Store } from './lib/index.js';
import { withRetry } from './lib/retry.js';
import { ingestText as ingestTextHelper } from './pipeline/ingest.js';
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
	// Apply retry/breaker policies to an operation for a given edge
	private async runWithPolicies<T>(edge: 'embedder' | 'store', op: () => Promise<T>): Promise<T> {
		const policy = this.reliability?.[edge];
		const breakerInst = this.breaker?.[edge];
		const label = edge === 'embedder' ? 'rag.embedder' : 'rag.store';
		const runId = generateRunId();

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
	}

	async ingest(chunks: Chunk[]): Promise<void> {
		const texts = chunks.map((c) => c.text);
		const doEmbed = async () => this.E.embed(texts);
		const embeddings = await this.runWithPolicies('embedder', doEmbed);
		if (embeddings.length !== chunks.length) {
			throw new Error(
				`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
			);
		}
		const toUpsert = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
		const doUpsert = async () => this.S.upsert(toUpsert);
		await this.runWithPolicies('store', doUpsert);
	}

	async ingestText(source: string, text: string): Promise<void> {
		await ingestTextHelper({
			source,
			text,
			embedder: this.E,
			store: this.S,
			chunkSize: this.chunkSize,
			overlap: this.chunkOverlap,
		});
	}

	async retrieve(query: string, topK = 5): Promise<EnhancedCitationBundle> {
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		if (this.hierarchical?.expandContext) {
			// Optionally dedupe and cap context
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	async retrieveWithClaims(
		query: string,
		claims: string[],
		topK = 5,
	): Promise<EnhancedCitationBundle> {
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundleWithClaims(routed, claims);
	}

	async retrieveWithDeduplication(query: string, topK = 5): Promise<EnhancedCitationBundle> {
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
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
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
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
		const doEmbed = async () => this.E.embed([query]);
		const embs = await selfSafe(this.runWithPolicies('embedder', doEmbed));
		const emb = embs[0] ?? [];
		let chunks = await this.queryMaybeHybrid(emb, query, topK);
		if (this.hierarchical?.expandContext) {
			chunks = chunks.map((c) => this.applyContextPostprocessing(c));
		}
		const routed = routeByLive(chunks, freshnessThresholdMs);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	private async queryMaybeHybrid(emb: number[], query: string, topK: number) {
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
		return selfSafe(this.runWithPolicies('store', doQuery));
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
