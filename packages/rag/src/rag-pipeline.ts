import { z } from 'zod';
import { CitationBundler, type EnhancedCitationBundle } from './lib/citation-bundler.js';
import type { Chunk, Embedder, Store } from './lib/index.js';
import { ingestText as ingestTextHelper } from './pipeline/ingest.js';
import { routeByFreshness, routeByCache, routeByLive, type FreshnessOptions } from './retrieval/freshness-router.js';
import { EvidenceGate, type EvidenceGateOptions, type EvidenceGateResult } from './retrieval/evidence-gate.js';

export interface RAGPipelineConfig {
	embedder: Embedder;
	store: Store;
	chunkSize?: number;
	chunkOverlap?: number;
	freshnessEpsilon?: number;
	cacheThresholdMs?: number;
	preferCache?: boolean;
	evidenceGate?: EvidenceGateOptions;
}

export interface EvidenceFirstResult {
	route: 'evidence' | 'llm' | 'no-answer';
	evidence: EnhancedCitationBundle;
	gateResult: EvidenceGateResult;
	response?: string;
}

export class RAGPipeline {
	private E: Embedder;
	private S: Store;
	private chunkSize: number;
	private chunkOverlap: number;
	private freshnessOptions: FreshnessOptions;
	private evidenceGate: EvidenceGate;

	constructor(config: RAGPipelineConfig) {
		const schema = z.object({
			embedder: z.custom<Embedder>(
				(e): e is Embedder =>
					typeof e === 'object' &&
					e !== null &&
					typeof (e as any).embed === 'function',
			),
			store: z.custom<Store>(
				(s): s is Store =>
					typeof s === 'object' &&
					s !== null &&
					typeof (s as any).upsert === 'function' &&
					typeof (s as any).query === 'function',
			),
			chunkSize: z.number().int().positive().default(300),
			chunkOverlap: z.number().int().nonnegative().default(0),
			freshnessEpsilon: z.number().min(0).max(1).default(0.02),
			cacheThresholdMs: z.number().positive().default(30 * 60 * 1000),
			preferCache: z.boolean().default(false),
			evidenceGate: z.any().optional(),
		});
		const parsed = schema.parse(config);
		this.E = parsed.embedder;
		this.S = parsed.store;
		this.chunkSize = parsed.chunkSize;
		this.chunkOverlap = parsed.chunkOverlap;
		this.freshnessOptions = {
			epsilon: parsed.freshnessEpsilon,
			cacheThresholdMs: parsed.cacheThresholdMs,
			preferCache: parsed.preferCache,
		};
		this.evidenceGate = new EvidenceGate(parsed.evidenceGate);
	}

	async ingest(chunks: Chunk[]): Promise<void> {
		const texts = chunks.map((c) => c.text);
		const embeddings = await this.E.embed(texts);
		if (embeddings.length !== chunks.length) {
			throw new Error(
				`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
			);
		}
		const toUpsert = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
		await this.S.upsert(toUpsert);
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
		const [emb] = await this.E.embed([query]);
		const chunks = await this.S.query(emb, topK);
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	async retrieveWithClaims(
		query: string,
		claims: string[],
		topK = 5
	): Promise<EnhancedCitationBundle> {
		const [emb] = await this.E.embed([query]);
		const chunks = await this.S.query(emb, topK);
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundleWithClaims(routed, claims);
	}

	async retrieveWithDeduplication(
		query: string,
		topK = 5
	): Promise<EnhancedCitationBundle> {
		const [emb] = await this.E.embed([query]);
		const chunks = await this.S.query(emb, topK);
		const routed = routeByFreshness(chunks, this.freshnessOptions);
		const bundler = new CitationBundler();
		return bundler.bundleWithDeduplication(routed);
	}

	async retrieveFromCache(
		query: string,
		topK = 5,
		cacheThresholdMs?: number
	): Promise<EnhancedCitationBundle> {
		const [emb] = await this.E.embed([query]);
		const chunks = await this.S.query(emb, topK);
		const routed = routeByCache(chunks, cacheThresholdMs);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	async retrieveLive(
		query: string,
		topK = 5,
		freshnessThresholdMs?: number
	): Promise<EnhancedCitationBundle> {
		const [emb] = await this.E.embed([query]);
		const chunks = await this.S.query(emb, topK);
		const routed = routeByLive(chunks, freshnessThresholdMs);
		const bundler = new CitationBundler();
		return bundler.bundle(routed);
	}

	/**
	 * Evidence-first retrieval: routes based on evidence quality
	 */
	async retrieveWithEvidenceGate(
		query: string,
		claims?: string[],
		topK = 5
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
