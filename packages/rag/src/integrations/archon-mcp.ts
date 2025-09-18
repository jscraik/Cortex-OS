/**
 * Archon MCP Integration for RAG Package
 *
 * Leverages MCP for remote retrieval services and task manager
 * for document ingestion jobs as outlined in the Archon integration plan.
 */

import type {
	AgentMCPClient,
	ArchonIntegrationConfig,
	KnowledgeSearchFilters,
	KnowledgeSearchResult,
} from '@cortex-os/agents';
import { createAgentMCPClient } from '@cortex-os/agents';
// Align with actual RAG core types
import type { Chunk, Embedder, Store } from '../lib/types.js';

// Lightweight store contract accepted for enhancement
export interface MinimalStore {
	upsert(chunks: Chunk[]): Promise<void>;
	query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
	// Optional embeddings API some downstream integrations expect
	embeddings?: number[][]; // non-breaking optional surface
}
export type StoreLike = Store | MinimalStore;

// Local query option/result types (bridge old interface expectations)
export interface QueryOptions {
	k?: number;
	// Additional filter fields optionally supplied to remote KB
	[key: string]: unknown;
}

export interface QueryResult {
	id: string;
	score: number;
	metadata?: Record<string, unknown>;
}

export interface ArchonRAGConfig extends ArchonIntegrationConfig {
	enableRemoteRetrieval?: boolean;
	enableDocumentSync?: boolean;
	fallbackToLocal?: boolean;
	remoteSearchLimit?: number;
	hybridSearchWeights?: {
		local: number;
		remote: number;
	};
}

export interface RemoteRetrievalOptions extends QueryOptions {
	useArchonKnowledge?: boolean;
	archonFilters?: KnowledgeSearchFilters;
	hybridSearch?: boolean;
	remoteOnly?: boolean;
	/**
	 * Maximum number of results to return after (optionally) combining local + remote.
	 * Applies post reweight/dedup stage.
	 */
	topK?: number;
}

export interface DocumentSyncResult {
	documentId: string;
	archonUrl: string;
	syncedAt: string;
	status: 'success' | 'failed';
	error?: string;
}

/**
 * Archon-enhanced embedder that can use remote embedding services
 */
export class ArchonEmbedder implements Embedder {
	private readonly mcpClient: AgentMCPClient;
	private readonly fallbackEmbedder?: Embedder;
	private readonly config: ArchonRAGConfig;

	constructor(config: ArchonRAGConfig, fallbackEmbedder?: Embedder) {
		this.config = config;
		this.fallbackEmbedder = fallbackEmbedder;
		this.mcpClient = createAgentMCPClient(config);
	}

	async initialize(): Promise<void> {
		await this.mcpClient.initialize();
	}

	async embed(texts: string[]): Promise<number[][]> {
		try {
			// Try to use Archon's embedding service via MCP
			interface EmbeddingsToolResult {
				embeddings?: number[][];
			}
			const result = (await this.mcpClient.callTool('generate_embeddings', {
				texts,
				model: 'default',
			})) as EmbeddingsToolResult;

			if (Array.isArray(result.embeddings)) return result.embeddings;

			throw new Error('Invalid embedding response from Archon');
		} catch (error) {
			console.error('[Archon RAG] Remote embedding failed:', error);

			// Fallback to local embedder if available
			if (this.fallbackEmbedder && this.config.fallbackToLocal) {
				console.warn('[Archon RAG] Falling back to local embedder');
				return await this.fallbackEmbedder.embed(texts);
			}

			throw error;
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			return await this.mcpClient.healthCheck();
		} catch {
			return false;
		}
	}

	async cleanup(): Promise<void> {
		await this.mcpClient.disconnect();
	}
}

/**
 * Archon-enhanced store that can query remote knowledge base
 */
export class ArchonEnhancedStore implements Store {
	private readonly localStore: StoreLike;
	private readonly mcpClient: AgentMCPClient;
	private readonly config: ArchonRAGConfig;

	constructor(localStore: StoreLike, config: ArchonRAGConfig) {
		this.localStore = localStore;
		this.config = config;
		this.mcpClient = createAgentMCPClient(config);
	}

	async initialize(): Promise<void> {
		await this.mcpClient.initialize();
	}

	async store(
		items: Array<{
			id: string;
			vector: number[];
			metadata?: Record<string, unknown>;
		}>,
	): Promise<void> {
		// Map incoming items to Chunk shape expected by core Store
		const chunks: Chunk[] = items.map((i) => ({
			id: i.id,
			text: (i.metadata?.text as string) || '',
			metadata: i.metadata,
			embedding: i.vector,
		}));

		// Persist via upsert
		await this.localStore.upsert(chunks);

		// Optionally sync documents to Archon
		if (this.config.enableDocumentSync) {
			await this.syncDocumentsToArchon(items);
		}
	}

	// Compatibility with core Store interface (expects upsert)
	async upsert(chunks: Chunk[]): Promise<void> {
		// Convert incoming core chunks to internal representation and reuse store path
		await this.store(
			chunks.map((c) => ({
				id: c.id,
				vector: c.embedding || [],
				metadata: { ...c.metadata, text: c.text },
			})),
		);
	}

	// Extended query retaining local+remote fusion; internal result shape then mapped to Chunk for interface compliance
	private async extendedQuery(
		vector: number[],
		options: RemoteRetrievalOptions = {},
	): Promise<QueryResult[]> {
		const results: QueryResult[] = [];

		// If remote-only mode, skip local search
		if (!options.remoteOnly) {
			try {
				const k = options.k || 10;
				const localChunks = await this.localStore.query(vector, k);
				const localResults: QueryResult[] = localChunks.map((c) => ({
					id: c.id,
					score: c.score ?? 0,
					metadata: {
						text: c.text,
						source: c.source,
						...c.metadata,
						provider: 'local',
					},
				}));
				results.push(...localResults);
			} catch (error) {
				console.error('[Archon RAG] Local query failed:', error);
			}
		}

		// Query Archon knowledge base if enabled
		if (this.config.enableRemoteRetrieval && options.useArchonKnowledge !== false) {
			try {
				const remoteResults = await this.queryArchonKnowledgeBase(vector, options);

				if (options.hybridSearch && results.length > 0) {
					// Combine and reweight results
					const combinedResults = this.combineResults(results, remoteResults, options);
					return combinedResults;
				} else {
					results.push(...remoteResults);
				}
			} catch (error) {
				console.error('[Archon RAG] Remote query failed:', error);

				// If fallback is disabled and we have no local results, throw
				if (!this.config.fallbackToLocal && results.length === 0) {
					throw error;
				}
			}
		}

		return results;
	}

	// Store interface query (embedding: number[], k?: number) -> returns Chunk[]
	async query(embedding: number[], k?: number): Promise<(Chunk & { score?: number })[]> {
		const queryResults = await this.extendedQuery(embedding, { k });
		// Map back to Chunk-esque structure (text may live in metadata.text)
		return queryResults.map((r) => ({
			id: r.id,
			text: (r.metadata?.text as string) || '',
			score: r.score,
			metadata: r.metadata,
		}));
	}

	async delete(ids: string[]): Promise<void> {
		// Core Store has no delete signature in types; implement conditional
		if (
			(
				this.localStore as unknown as {
					delete?: (ids: string[]) => Promise<void>;
				}
			).delete
		) {
			await (
				this.localStore as unknown as {
					delete: (ids: string[]) => Promise<void>;
				}
			).delete(ids);
		}
	}

	private async queryArchonKnowledgeBase(
		vector: number[],
		options: RemoteRetrievalOptions,
	): Promise<QueryResult[]> {
		// Convert vector to a search query (this would be more sophisticated in practice)
		const searchQuery = await this.vectorToQuery(vector);

		const archonResults = await this.mcpClient.searchKnowledgeBase(searchQuery, {
			limit: options.topK || this.config.remoteSearchLimit || 10,
			// Narrow cast filters to a generic record without weakening global type safety
			filters: options.archonFilters as unknown as Record<string, unknown> | undefined,
		});

		return archonResults.map((result: KnowledgeSearchResult) => ({
			id: result.id,
			score: result.score,
			metadata: {
				text: result.content,
				source: result.source,
				title: result.title,
				timestamp: result.timestamp,
				provider: 'archon',
				...result.metadata,
			},
		}));
	}

	private async syncDocumentsToArchon(
		items: Array<{
			id: string;
			vector: number[];
			metadata?: Record<string, unknown>;
		}>,
	): Promise<DocumentSyncResult[]> {
		const results: DocumentSyncResult[] = [];

		for (const item of items) {
			try {
				if (item.metadata?.text && typeof item.metadata.text === 'string') {
					const syncResult = await this.mcpClient.uploadDocument(
						item.metadata.text,
						(item.metadata.filename as string) || `document-${item.id}.txt`,
						{
							tags: ['cortex-rag', 'auto-synced'],
							metadata: {
								cortexId: item.id,
								syncedAt: new Date().toISOString(),
								...item.metadata,
							},
						},
					);

					results.push({
						documentId: item.id,
						archonUrl: syncResult.url,
						syncedAt: new Date().toISOString(),
						status: 'success',
					});
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				results.push({
					documentId: item.id,
					archonUrl: '',
					syncedAt: new Date().toISOString(),
					status: 'failed',
					error: errorMsg,
				});
				console.error(`[Archon RAG] Failed to sync document ${item.id}:`, error);
			}
		}

		return results;
	}

	private combineResults(
		localResults: QueryResult[],
		remoteResults: QueryResult[],
		options: RemoteRetrievalOptions,
	): QueryResult[] {
		const weights = this.config.hybridSearchWeights || {
			local: 0.7,
			remote: 0.3,
		};

		// Reweight scores
		const weightedLocal = localResults.map((result) => ({
			...result,
			score: result.score * weights.local,
			metadata: { ...result.metadata, source_type: 'local' },
		}));

		const weightedRemote = remoteResults.map((result) => ({
			...result,
			score: result.score * weights.remote,
			metadata: { ...result.metadata, source_type: 'remote' },
		}));

		// Combine and sort by weighted score
		const combined = [...weightedLocal, ...weightedRemote].sort((a, b) => b.score - a.score);

		// Deduplicate based on content similarity if needed
		const deduped = this.deduplicateResults(combined);

		return deduped.slice(0, options.topK || 10);
	}

	private deduplicateResults(results: QueryResult[]): QueryResult[] {
		const seen = new Set<string>();
		const deduplicated: QueryResult[] = [];

		for (const result of results) {
			// Simple deduplication based on text content
			const text = (result.metadata?.text as string) || '';
			const key = text.substring(0, 100).trim().toLowerCase();

			if (!seen.has(key)) {
				seen.add(key);
				deduplicated.push(result);
			}
		}

		return deduplicated;
	}

	private async vectorToQuery(_vector: number[]): Promise<string> {
		// Heuristic placeholder: map vector variance to a generic intent bucket.
		// Future: replace with reverse embedding or centroid label lookup strategy.
		const self = this as unknown as { _vectorToQueryWarned?: boolean };
		if (!self._vectorToQueryWarned) {
			// One-time warning to surface technical debt.
			console.warn(
				'[ArchonEnhancedStore] vectorToQuery using heuristic fallback – upgrade recommended.',
			);
			self._vectorToQueryWarned = true;
		}
		const variance = (arr: number[]) => {
			if (!arr.length) return 0;
			const m = arr.reduce((a, b) => a + b, 0) / arr.length;
			return arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length;
		};
		const v = variance(_vector);
		if (v < 0.01) return 'foundational concepts overview';
		if (v < 0.05) return 'implementation details and best practices';
		if (v < 0.1) return 'edge cases and optimization techniques';
		return 'troubleshooting complex integration scenarios';
	}

	async cleanup(): Promise<void> {
		await this.mcpClient.disconnect();
	}
}

/**
 * Document ingestion task manager using Archon's task system
 */
export class ArchonDocumentIngestionManager {
	private readonly mcpClient: AgentMCPClient;

	constructor(config: ArchonRAGConfig) {
		this.mcpClient = createAgentMCPClient(config);
	}

	async initialize(): Promise<void> {
		await this.mcpClient.initialize();
	}

	/**
	 * Create a document ingestion job in Archon
	 */
	async createIngestionJob(
		title: string,
		documents: Array<{
			filename: string;
			content: string;
			metadata?: Record<string, unknown>;
		}>,
		options: {
			priority?: 'low' | 'medium' | 'high' | 'urgent';
			tags?: string[];
			chunkSize?: number;
			batchSize?: number;
		} = {},
	): Promise<{ taskId: string; jobId: string }> {
		try {
			// Create task for the ingestion job
			const task = await this.mcpClient.createTask(
				title,
				`Ingest ${documents.length} documents into knowledge base`,
				{
					priority: options.priority || 'medium',
					tags: ['document-ingestion', 'rag', ...(options.tags || [])],
				},
			);

			// Process documents in batches
			const batchSize = options.batchSize || 10;
			let processed = 0;

			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize);

				try {
					await this.processBatch(batch, options);
					processed += batch.length;

					// Update task progress
					if (task.taskId) {
						await this.mcpClient.updateTaskStatus(
							task.taskId,
							'in_progress',
							`Processed ${processed}/${documents.length} documents`,
						);
					}
				} catch (error) {
					console.error(`[Archon RAG] Batch processing failed for batch ${i}:`, error);
					// Continue with next batch
				}
			}

			// Mark task as completed
			if (task.taskId) {
				await this.mcpClient.updateTaskStatus(
					task.taskId,
					'completed',
					`Successfully ingested ${processed}/${documents.length} documents`,
				);
			}

			return {
				taskId: task.taskId,
				jobId: `job-${Date.now()}`,
			};
		} catch (error) {
			console.error('[Archon RAG] Ingestion job creation failed:', error);
			throw error;
		}
	}

	private async processBatch(
		documents: Array<{
			filename: string;
			content: string;
			metadata?: Record<string, unknown>;
		}>,
		options: {
			chunkSize?: number;
			tags?: string[];
		},
	): Promise<void> {
		for (const doc of documents) {
			try {
				await this.mcpClient.uploadDocument(doc.content, doc.filename, {
					tags: ['rag-ingested', ...(options.tags || [])],
					metadata: {
						...doc.metadata,
						ingestedAt: new Date().toISOString(),
						chunkSize: options.chunkSize,
					},
				});
			} catch (error) {
				console.error(`[Archon RAG] Failed to upload document ${doc.filename}:`, error);
				// Continue with other documents
			}
		}
	}

	async cleanup(): Promise<void> {
		await this.mcpClient.disconnect();
	}
}

/**
 * Factory functions for creating Archon-enhanced RAG components
 */
export function createArchonEmbedder(
	config: ArchonRAGConfig,
	fallbackEmbedder?: Embedder,
): ArchonEmbedder {
	return new ArchonEmbedder(config, fallbackEmbedder);
}

export function createArchonEnhancedStore(
	localStore: StoreLike,
	config: ArchonRAGConfig,
): ArchonEnhancedStore {
	return new ArchonEnhancedStore(localStore, config);
}

export function createArchonIngestionManager(
	config: ArchonRAGConfig,
): ArchonDocumentIngestionManager {
	return new ArchonDocumentIngestionManager(config);
}
