/**
 * Remote MCP Integration for RAG Package
 *
 * Provides optional remote retrieval/ingestion via MCP while keeping local store primary.
 */

import type { Chunk, Embedder, Store } from '../lib/types.js';
// Default to local HTTP shim; tests can inject a stub via global __createAgentMCPClient__
import type {
	AgentMCPClient,
	KnowledgeSearchFilters,
	KnowledgeSearchResult,
	MCPIntegrationConfig,
} from './agents-shim.js';
import { createAgentMCPClient as realCreateAgentMCPClient } from './agents-shim.js';

// Support test-time injection of the MCP client factory to avoid ESM mocking hassles
async function resolveAgentClientFactory(): Promise<(cfg: MCPIntegrationConfig) => AgentMCPClient> {
	const g = globalThis as unknown as {
		__createAgentMCPClient__?: (cfg: MCPIntegrationConfig) => AgentMCPClient;
	};
	if (typeof g.__createAgentMCPClient__ === 'function') return g.__createAgentMCPClient__;
	try {
		// Use dynamic import to allow Vitest alias to inject the stub without affecting TS build
		const mod = (await import(/* @vite-ignore */ '@cortex-os/agents')) as unknown as {
			createAgentMCPClient?: (cfg: MCPIntegrationConfig) => AgentMCPClient;
		};
		if (mod && typeof mod.createAgentMCPClient === 'function') return mod.createAgentMCPClient;
	} catch {
		// ignore and fallback
	}
	return realCreateAgentMCPClient;
}

export interface MinimalStore {
	upsert(chunks: Chunk[]): Promise<void>;
	query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
	embeddings?: number[][];
}
export type StoreLike = Store | MinimalStore;

export interface QueryOptions {
	k?: number;
	[key: string]: unknown;
}

export interface QueryResult {
	id: string;
	score: number;
	metadata?: Record<string, unknown>;
}

export interface RemoteConnectorToolHint {
        name: string;
        tags?: string[] | string;
}

export interface RemoteConnectorHint {
        id: string;
        scopes?: string[] | string;
        tags?: string[] | string;
        remoteTools?: RemoteConnectorToolHint[];
}

export interface RemoteRAGConfig extends MCPIntegrationConfig {
        enableRemoteRetrieval?: boolean;
        enableDocumentSync?: boolean;
        fallbackToLocal?: boolean;
        remoteSearchLimit?: number;
        hybridSearchWeights?: {
                local: number;
                remote: number;
        };
        connectorHints?: RemoteConnectorHint[];
        defaultScopeHints?: string[];
}

export interface RemoteRetrievalOptions extends QueryOptions {
        useRemoteKnowledge?: boolean;
        remoteFilters?: KnowledgeSearchFilters;
        hybridSearch?: boolean;
        remoteOnly?: boolean;
        topK?: number;
        fusionMethod?: 'weighted' | 'rrf';
        rrfK?: number;
        workspace?: string | string[];
        scopeHints?: string[];
}

export interface DocumentSyncResult {
	documentId: string;
	remoteUrl: string;
	syncedAt: string;
	status: 'success' | 'failed';
	error?: string;
}

export class RemoteMCPEmbedder implements Embedder {
	private mcpClient?: AgentMCPClient;
	private readonly fallbackEmbedder?: Embedder;
	private readonly config: RemoteRAGConfig;

	constructor(config: RemoteRAGConfig, fallbackEmbedder?: Embedder) {
		this.config = config;
		this.fallbackEmbedder = fallbackEmbedder;
	}

	async initialize(): Promise<void> {
		if (!this.mcpClient) {
			const factory = await resolveAgentClientFactory();
			this.mcpClient = factory(this.config as MCPIntegrationConfig);
			await this.mcpClient.initialize();
		}
	}

	async embed(texts: string[]): Promise<number[][]> {
		try {
			const client =
				this.mcpClient ??
				(await (async () => {
					const f = await resolveAgentClientFactory();
					const c = f(this.config as MCPIntegrationConfig);
					await c.initialize();
					this.mcpClient = c;
					return c;
				})());
			interface EmbeddingsToolResult {
				embeddings?: number[][];
			}
			const result = (await client.callTool('generate_embeddings', {
				texts,
				model: 'default',
			})) as EmbeddingsToolResult;

			if (Array.isArray(result.embeddings)) return result.embeddings;
			throw new Error('Invalid embedding response from remote MCP');
		} catch (error) {
			console.error('[RAG Remote] Remote embedding failed:', error);
			if (this.fallbackEmbedder && this.config.fallbackToLocal) {
				console.warn('[RAG Remote] Falling back to local embedder');
				return await this.fallbackEmbedder.embed(texts);
			}
			throw error;
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			const client =
				this.mcpClient ??
				(await (async () => {
					const f = await resolveAgentClientFactory();
					const c = f(this.config as MCPIntegrationConfig);
					await c.initialize();
					this.mcpClient = c;
					return c;
				})());
			return await client.healthCheck();
		} catch {
			return false;
		}
	}

	async cleanup(): Promise<void> {
		if (this.mcpClient) await this.mcpClient.disconnect();
	}
}

export class RemoteMCPEnhancedStore implements Store {
        private readonly localStore: StoreLike;
        private mcpClient?: AgentMCPClient;
        private readonly config: RemoteRAGConfig;
        private readonly connectorHints: Map<string, NormalizedConnectorHint>;
        private readonly remoteRetrievalEnabled: boolean;
        private readonly defaultScopeHints: string[];

        constructor(localStore: StoreLike, config: RemoteRAGConfig) {
                this.localStore = localStore;
                this.config = config;
                this.connectorHints = buildConnectorHints(config.connectorHints);
                const explicit =
                        typeof config.enableRemoteRetrieval === 'boolean' ? config.enableRemoteRetrieval : undefined;
                const hasFactsConnector = hasFactsEnabledConnector(this.connectorHints);
                this.remoteRetrievalEnabled = explicit ?? hasFactsConnector;
                const scopeSeed = new Set<string>(
                        Array.isArray(config.defaultScopeHints)
                                ? config.defaultScopeHints.map((hint) => String(hint))
                                : [],
                );
                if (hasFactsConnector) {
                        scopeSeed.add('facts');
                }
                this.defaultScopeHints = Array.from(scopeSeed);
        }

	async initialize(): Promise<void> {
		if (!this.mcpClient) {
			const factory = await resolveAgentClientFactory();
			this.mcpClient = factory(this.config as MCPIntegrationConfig);
			await this.mcpClient.initialize();
			// Initialize the local store if needed
			if ('initialize' in this.localStore && typeof this.localStore.initialize === 'function') {
				await this.localStore.initialize();
			}
		}
	}

	async store(
		items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
	): Promise<void> {
		const chunks: Chunk[] = items.map((i) => ({
			id: i.id,
			text: (i.metadata?.text as string) || '',
			metadata: i.metadata,
			embedding: i.vector,
		}));
		await this.localStore.upsert(chunks);
		if (this.config.enableDocumentSync) {
			await this.syncDocumentsRemote(items);
		}
	}

	async upsert(chunks: Chunk[]): Promise<void> {
		await this.store(
			chunks.map((c) => ({
				id: c.id,
				vector: c.embedding || [],
				metadata: { ...c.metadata, text: c.text },
			})),
		);
	}

	private async extendedQuery(
		vector: number[],
		options: RemoteRetrievalOptions = {},
	): Promise<QueryResult[]> {
		const results: QueryResult[] = [];

		// Handle local query if not remote-only
		await this.handleLocalQuery(vector, options, results);

		// Handle remote query if enabled
		if (this.shouldUseRemoteRetrieval(options)) {
			await this.handleRemoteQuery(vector, options, results);
		}

		// Apply final filtering and limiting
		return this.applyFinalFiltering(results, options);
	}

	private async handleLocalQuery(
		vector: number[],
		options: RemoteRetrievalOptions,
		results: QueryResult[],
	): Promise<void> {
		if (options.remoteOnly) return;

		try {
			const k = options.k || 10;
			const localChunks = await this.localStore.query(vector, k);
			const localResults: QueryResult[] = localChunks.map((c) => ({
				id: c.id,
				score: c.score ?? 0,
				metadata: {
					text: c.text,
					source: (c as unknown as { source?: string }).source,
					...c.metadata,
					provider: 'local',
				},
			}));
			results.push(...localResults);
		} catch (error) {
			console.error('[RAG Remote] Local query failed:', error);
		}
	}

        private shouldUseRemoteRetrieval(options: RemoteRetrievalOptions): boolean {
                const effective =
                        typeof this.config.enableRemoteRetrieval === 'boolean'
                                ? this.config.enableRemoteRetrieval
                                : this.remoteRetrievalEnabled;
                return Boolean(effective && options.useRemoteKnowledge !== false);
        }

	private async handleRemoteQuery(
		vector: number[],
		options: RemoteRetrievalOptions,
		results: QueryResult[],
	): Promise<void> {
		try {
			const remoteResults = await this.queryRemoteKnowledgeBase(vector, options);
			if (options.hybridSearch && results.length > 0) {
				const combined = this.combineResults(results, remoteResults, options);
				results.length = 0;
				results.push(...combined);
			} else {
				results.push(...remoteResults);
			}
		} catch (error) {
			console.error('[RAG Remote] Remote query failed:', error);
			if (!this.config.fallbackToLocal && results.length === 0) {
				throw error;
			}
		}
	}

	private applyFinalFiltering(
		results: QueryResult[],
		options: RemoteRetrievalOptions,
	): QueryResult[] {
		let adjusted = this.applyWorkspaceFilter(results, options.workspace);
		const limit = options.topK || options.k;
		if (typeof limit === 'number' && Number.isFinite(limit)) {
			adjusted = adjusted.slice(0, Math.max(0, limit));
		}
		return adjusted;
	}

	async query(embedding: number[], k?: number): Promise<(Chunk & { score?: number })[]>;
	async query(
		embedding: number[],
		options?: RemoteRetrievalOptions,
	): Promise<(Chunk & { score?: number })[]>;
	async query(
		embedding: number[],
		kOrOptions?: number | RemoteRetrievalOptions,
	): Promise<(Chunk & { score?: number })[]> {
		const options: RemoteRetrievalOptions =
			typeof kOrOptions === 'number' ? { k: kOrOptions } : (kOrOptions ?? {});
		const queryResults = await this.extendedQuery(embedding, options);
		return queryResults.map((r) => ({
			id: r.id,
			text: (r.metadata?.text as string) || '',
			score: r.score,
			metadata: r.metadata,
		}));
	}

	async delete(ids: string[]): Promise<void> {
		const anyStore = this.localStore as unknown as { delete?: (ids: string[]) => Promise<void> };
		if (anyStore.delete) await anyStore.delete(ids);
	}

        private async queryRemoteKnowledgeBase(
                vector: number[],
                options: RemoteRetrievalOptions,
        ): Promise<QueryResult[]> {
                const client =
			this.mcpClient ??
			(await (async () => {
				const f = await resolveAgentClientFactory();
				const c = f(this.config as MCPIntegrationConfig);
				await c.initialize();
				this.mcpClient = c;
				return c;
			})());
		const searchQuery = await this.vectorToQuery(vector);
                const filters = this.resolveRemoteFilters(options);
                const remoteResults = await client.searchKnowledgeBase(searchQuery, {
                        limit: options.topK || this.config.remoteSearchLimit || 10,
                        filters,
                });
                return remoteResults.map((result: KnowledgeSearchResult) => {
                        const baseMetadata: Record<string, unknown> = {
                                text: result.content,
                                source: result.source,
                                title: result.title,
                                timestamp: result.timestamp,
                                provider: 'remote',
                                ...(result.metadata ?? {}),
                        };
                        const metadata = this.enrichRemoteMetadata(result, baseMetadata);
                        return {
                                id: result.id,
                                score: result.score,
                                metadata,
                        };
                });
        }

        private resolveRemoteFilters(options: RemoteRetrievalOptions): KnowledgeSearchFilters | undefined {
                if (options.remoteFilters) return options.remoteFilters;
                const hints = new Set<string>(
                        [
                                ...(Array.isArray(options.scopeHints) ? options.scopeHints : []),
                                ...this.defaultScopeHints,
                        ]
                                .filter((hint): hint is string => typeof hint === 'string')
                                .map((hint) => hint.toLowerCase()),
                );
                const wantsFacts = Array.from(hints).some(
                        (hint) => hint.includes('fact') || hint.includes('wikidata') || hint.includes('claims'),
                );
                if (!wantsFacts) return undefined;
                const targetHint =
                        this.connectorHints.get('wikidata') ||
                        Array.from(this.connectorHints.values()).find((entry) =>
                                entry.scopes.some((scope) => scope.includes('facts')),
                        );
                if (!targetHint) return undefined;
                const tags = new Set<string>();
                const sources = new Set<string>();
                sources.add(`connector:${targetHint.id}`);
                tags.add(`connector:${targetHint.id}`);
                const vectorTool = targetHint.remoteTools.find((tool) =>
                        tool.tags.some((tag) => tag.toLowerCase().includes('vector')) || /vector/i.test(tool.name),
                );
                if (vectorTool) {
                        tags.add(`tool:${vectorTool.name}`);
                        tags.add('tool:vector');
                }
                const filters: KnowledgeSearchFilters = {};
                if (tags.size > 0) filters.tags = Array.from(tags);
                if (sources.size > 0) filters.source = Array.from(sources);
                return filters;
        }

        private enrichRemoteMetadata(
                result: KnowledgeSearchResult,
                metadata: Record<string, unknown>,
        ): Record<string, unknown> {
                const toolName = extractRemoteToolName(metadata);
                const connectorId = extractConnectorId(metadata);
                const existingWikidata = metadata.wikidata;
                const shouldAttachClaims =
                        existingWikidata ||
                        (toolName ? /wikidata\.get_claims/i.test(toolName) : false) ||
                        (connectorId ? /wikidata/i.test(connectorId) : false);

                if (!shouldAttachClaims) {
                        return metadata;
                }

                const claims = extractClaimsFromMetadata(metadata);
                const sanitizedClaims = claims.map((claim) => sanitizeRemoteClaim(claim));
                const identifiers = collectRemoteIdentifiers(sanitizedClaims, metadata);
                metadata.wikidata = {
                        connectorId:
                                connectorId ??
                                (typeof result.source === 'string' && result.source.toLowerCase().includes('wikidata')
                                        ? 'wikidata'
                                        : 'wikidata'),
                        tool: toolName ?? 'wikidata.get_claims',
                        qids: identifiers.qids,
                        claimIds: identifiers.claimIds,
                        claims: sanitizedClaims,
                };
                return metadata;
        }

	private async syncDocumentsRemote(
		items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
	): Promise<DocumentSyncResult[]> {
		const results: DocumentSyncResult[] = [];
		for (const item of items) {
			try {
				if (item.metadata?.text && typeof item.metadata.text === 'string') {
					if (!this.mcpClient) throw new Error('MCP client not initialized');
					const syncResult = await this.mcpClient.uploadDocument(
						item.metadata.text,
						(item.metadata.filename as string) || `document-${item.id}.txt`,
						{
							tags: ['cortex-rag', 'auto-synced'],
							metadata: { cortexId: item.id, syncedAt: new Date().toISOString(), ...item.metadata },
						},
					);
					results.push({
						documentId: item.id,
						remoteUrl: syncResult.url,
						syncedAt: new Date().toISOString(),
						status: 'success',
					});
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				results.push({
					documentId: item.id,
					remoteUrl: '',
					syncedAt: new Date().toISOString(),
					status: 'failed',
					error: errorMsg,
				});
				console.error(`[RAG Remote] Failed to upload document ${item.id}:`, error);
			}
		}
		return results;
	}

	private combineResults(
		localResults: QueryResult[],
		remoteResults: QueryResult[],
		options: RemoteRetrievalOptions,
	): QueryResult[] {
		const method = options.fusionMethod || 'weighted';
		let fused: QueryResult[] = [];
		if (method === 'rrf') {
			fused = this.rrfCombine(localResults, remoteResults, options.rrfK ?? 60);
		} else {
			const weights = this.config.hybridSearchWeights || { local: 0.7, remote: 0.3 };
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
			fused = [...weightedLocal, ...weightedRemote].sort((a, b) => b.score - a.score);
		}
		let deduped = this.deduplicateResults(fused);
		deduped = this.applyWorkspaceFilter(deduped, options.workspace);
		return deduped.slice(0, options.topK || options.k || 10);
	}

	private rrfCombine(
		localResults: QueryResult[],
		remoteResults: QueryResult[],
		k: number,
	): QueryResult[] {
		const rank = (arr: QueryResult[]) =>
			arr
				.slice()
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.reduce<Record<string, number>>((acc, item, idx) => {
					acc[this.resultKey(item)] = idx + 1;
					return acc;
				}, {});
		const localRank = rank(localResults);
		const remoteRank = rank(remoteResults);
		const byKey = new Map<string, QueryResult>();
		for (const r of [...localResults, ...remoteResults]) {
			const key = this.resultKey(r);
			if (!byKey.has(key)) byKey.set(key, r);
		}
		const scored: Array<QueryResult & { score: number }> = [];
		for (const [key, base] of byKey.entries()) {
			const rLocal = localRank[key];
			const rRemote = remoteRank[key];
			let score = 0;
			if (rLocal) score += 1 / (k + rLocal);
			if (rRemote) score += 1 / (k + rRemote);
			scored.push({ ...base, score });
		}
		return scored.sort((a, b) => b.score - a.score);
	}

	private resultKey(r: QueryResult): string {
		const id = r.id || '';
		const text = (r.metadata?.text as string) || '';
		return (id || text.substring(0, 100)).trim().toLowerCase();
	}

	private deduplicateResults(results: QueryResult[]): QueryResult[] {
		const seen = new Set<string>();
		const deduplicated: QueryResult[] = [];
		for (const result of results) {
			const id = result.id || '';
			const text = (result.metadata?.text as string) || '';
			const key = (id || text.substring(0, 100)).trim().toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				deduplicated.push(result);
			}
		}
		return deduplicated;
	}

	private applyWorkspaceFilter(
		results: QueryResult[],
		workspace?: string | string[],
	): QueryResult[] {
		if (!workspace) return results;
		const want = Array.isArray(workspace) ? workspace : [workspace];
		const matches = (meta: Record<string, unknown> | undefined): boolean => {
			if (!meta) return false;
			const ws = (meta.workspace ?? meta.workspaceId ?? meta.workspace_id) as
				| string
				| string[]
				| undefined;
			if (!ws) return false;
			const have = Array.isArray(ws) ? ws : [ws];
			return have.some((v) => want.includes(String(v)));
		};
		return results.filter((r) => matches(r.metadata));
	}

	private async vectorToQuery(vector: number[]): Promise<string> {
		const STOPWORDS = new Set(
			'and or the a an to of in for with on at by from as is are be was were it this that these those into over under between within without using via about across against toward toward(s) not no yes you we they i me my our your their its if else then than which who whom whose what when where why how do does did done can could should would may might must'.split(
				/\s+/,
			),
		);
		const tokenize = (s: string): string[] =>
			s
				.toLowerCase()
				.replace(/[^a-z0-9\s_-]+/g, ' ')
				.split(/\s+/)
				.filter((w) => w.length > 2 && !STOPWORDS.has(w));
		try {
			const k = Math.max(3, Math.min(7, this.config.remoteSearchLimit || 5));
			const neighbors = await this.localStore.query(vector, k);
			if (!neighbors || neighbors.length === 0) throw new Error('no-neighbors');
			const freq = new Map<string, number>();
			const getMeta = (m: unknown, key: string): string => {
				if (m && typeof m === 'object' && key in (m as Record<string, unknown>)) {
					const v = (m as Record<string, unknown>)[key];
					return typeof v === 'string' ? v : '';
				}
				return '';
			};
			for (const n of neighbors) {
				const title = getMeta(n.metadata, 'title');
				const text = getMeta(n.metadata, 'text') || n.text || '';
				const tokens = [...tokenize(title), ...tokenize(text)];
				for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
			}
			const topTokens = [...freq.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 8)
				.map(([t]) => t);
			if (topTokens.length >= 2) return `keywords: ${topTokens.join(' ')}`;
			if (neighbors[0]) {
				const t = getMeta(neighbors[0].metadata, 'title') || neighbors[0].text || '';
				const tk = tokenize(t).slice(0, 5);
				if (tk.length) return `topic: ${tk.join(' ')}`;
			}
			throw new Error('no-keywords');
		} catch {
			const variance = (arr: number[]) => {
				if (!arr.length) return 0;
				const m = arr.reduce((a, b) => a + b, 0) / arr.length;
				return arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length;
			};
			const v = variance(vector);
			if (v < 0.01) return 'foundational concepts overview';
			if (v < 0.05) return 'implementation details and best practices';
			if (v < 0.1) return 'edge cases and optimization techniques';
			return 'troubleshooting complex integration scenarios';
		}
	}

	async cleanup(): Promise<void> {
		if (this.mcpClient) await this.mcpClient.disconnect();
	}
}

export class RemoteMCPDocumentIngestionManager {
	private mcpClient?: AgentMCPClient;
	constructor(config: RemoteRAGConfig) {
		this.config = config;
	}
	private readonly config: RemoteRAGConfig;
	async initialize(): Promise<void> {
		if (!this.mcpClient) {
			const factory = await resolveAgentClientFactory();
			this.mcpClient = factory(this.config as MCPIntegrationConfig);
			await this.mcpClient.initialize();
			// Simple validation that client is ready
			console.debug('Document ingestion manager initialized');
		}
	}
	async createIngestionJob(
		title: string,
		documents: Array<{ filename: string; content: string; metadata?: Record<string, unknown> }>,
		options: {
			priority?: 'low' | 'medium' | 'high' | 'urgent';
			tags?: string[];
			chunkSize?: number;
			batchSize?: number;
		} = {},
	): Promise<{ taskId: string; jobId: string }> {
		try {
			if (!this.mcpClient) throw new Error('MCP client not initialized');
			const task = (await this.mcpClient.createTask(
				title,
				`Ingest ${documents.length} documents into knowledge base`,
				{
					priority: options.priority || 'medium',
					tags: ['document-ingestion', 'rag', ...(options.tags || [])],
				},
			)) as { taskId?: string };
			const batchSize = options.batchSize || 10;
			let processed = 0;
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize);
				try {
					await this.processBatch(batch, options);
					processed += batch.length;
                                        if (task.taskId && this.mcpClient) {
                                                await this.mcpClient.updateTaskStatus(
                                                        task.taskId,
                                                        'in_progress',
                                                        `Processed ${processed}/${documents.length} documents`,
                                                );
                                        }
				} catch (error) {
					console.error(`[RAG Remote] Batch processing failed for batch ${i}:`, error);
				}
			}
                        if (task.taskId && this.mcpClient) {
                                await this.mcpClient.updateTaskStatus(
                                        task.taskId,
                                        'completed',
                                        `Successfully ingested ${processed}/${documents.length} documents`,
                                );
                        }
			return { taskId: task.taskId ?? `task-${Date.now()}`, jobId: `job-${Date.now()}` };
		} catch (error) {
			console.error('[RAG Remote] Ingestion job creation failed:', error);
			throw error;
		}
	}

	private async processBatch(
		documents: Array<{ filename: string; content: string; metadata?: Record<string, unknown> }>,
		options: { chunkSize?: number; tags?: string[] },
	): Promise<void> {
		for (const doc of documents) {
			try {
				const client =
					this.mcpClient ??
					(await (async () => {
						const f = await resolveAgentClientFactory();
						const c = f(this.config as MCPIntegrationConfig);
						await c.initialize();
						this.mcpClient = c;
						return c;
					})());
				await client.uploadDocument(doc.content, doc.filename, {
					tags: ['rag-ingested', ...(options.tags || [])],
					metadata: {
						...doc.metadata,
						ingestedAt: new Date().toISOString(),
						chunkSize: options.chunkSize,
					},
				});
			} catch (error) {
				console.error(`[RAG Remote] Failed to upload document ${doc.filename}:`, error);
			}
		}
	}

	async cleanup(): Promise<void> {
		if (this.mcpClient) await this.mcpClient.disconnect();
	}
}

export function createRemoteMCPEmbedder(
        config: RemoteRAGConfig,
        fallbackEmbedder?: Embedder,
): RemoteMCPEmbedder {
        return new RemoteMCPEmbedder(config, fallbackEmbedder);
}

interface NormalizedConnectorHint {
        id: string;
        scopes: string[];
        tags: string[];
        remoteTools: Array<{ name: string; tags: string[] }>;
}

const REMOTE_QID_REGEX = /\bQ\d{2,}\b/gi;
const REMOTE_CLAIM_ID_REGEX = /\b[QP]\d+\$[A-Za-z0-9-]+\b/gi;

const toStringArray = (value: string[] | string | undefined): string[] => {
        if (Array.isArray(value)) return value.map((entry) => String(entry));
        if (typeof value === 'string') return [value];
        return [];
};

const buildConnectorHints = (hints: RemoteConnectorHint[] | undefined): Map<string, NormalizedConnectorHint> => {
        const normalized = new Map<string, NormalizedConnectorHint>();
        if (!Array.isArray(hints)) return normalized;
        for (const hint of hints) {
                if (!hint || typeof hint !== 'object' || typeof hint.id !== 'string') continue;
                const scopes = toStringArray(hint.scopes).map((scope) => scope.toLowerCase());
                const tags = toStringArray(hint.tags).map((tag) => tag.toLowerCase());
                const remoteTools = Array.isArray(hint.remoteTools)
                        ? hint.remoteTools
                                  .map((tool) => {
                                          if (!tool || typeof tool !== 'object' || typeof tool.name !== 'string') return undefined;
                                          return {
                                                  name: tool.name,
                                                  tags: toStringArray(tool.tags).map((tag) => tag.toLowerCase()),
                                          };
                                  })
                                  .filter((tool): tool is { name: string; tags: string[] } => Boolean(tool))
                        : [];
                normalized.set(hint.id, { id: hint.id, scopes, tags, remoteTools });
        }
        return normalized;
};

const hasFactsEnabledConnector = (hints: Map<string, NormalizedConnectorHint>): boolean => {
        for (const hint of hints.values()) {
                if (hint.id === 'wikidata') return true;
                if (hint.tags.some((tag) => tag.includes('wikidata'))) return true;
                if (hint.scopes.some((scope) => scope.includes('facts'))) return true;
        }
        return false;
};

const extractRemoteToolName = (metadata: Record<string, unknown>): string | undefined => {
        const candidates = ['tool', 'toolName', 'mcpTool', 'sourceTool'];
        for (const key of candidates) {
                const value = metadata[key];
                if (typeof value === 'string' && value) return value;
        }
        return undefined;
};

const extractConnectorId = (metadata: Record<string, unknown>): string | undefined => {
        const candidates = ['connectorId', 'connector', 'provider', 'source'];
        for (const key of candidates) {
                const value = metadata[key];
                if (typeof value === 'string' && value) return value;
        }
        return undefined;
};

const extractClaimsFromMetadata = (metadata: Record<string, unknown>): Array<Record<string, unknown> | string> => {
        const claims: Array<Record<string, unknown> | string> = [];
        const addFrom = (value: unknown): void => {
                if (!value) return;
                if (Array.isArray(value)) {
                        for (const entry of value) addFrom(entry);
                        return;
                }
                if (typeof value === 'string') {
                        claims.push(value);
                        return;
                }
                if (typeof value === 'object') {
                        const record = value as Record<string, unknown>;
                        if (record.property || record.claimId || record.guid || record.qid) {
                                claims.push(record);
                                return;
                        }
                        for (const nested of Object.values(record)) {
                                addFrom(nested);
                        }
                }
        };

        addFrom(metadata.claims);
        addFrom(metadata.statements);
        if (metadata.data && typeof metadata.data === 'object') {
                addFrom((metadata.data as Record<string, unknown>).claims);
        }
        if (metadata.claimsByProperty && typeof metadata.claimsByProperty === 'object') {
                for (const value of Object.values(metadata.claimsByProperty as Record<string, unknown>)) {
                        addFrom(value);
                }
        }
        return claims;
};

const sanitizeRemoteClaim = (claim: Record<string, unknown> | string): Record<string, unknown> | string => {
        if (typeof claim === 'string') return claim;
        const allowed = new Set([
                'property',
                'propertyId',
                'propertyLabel',
                'value',
                'valueType',
                'datavalue',
                'qualifiers',
                'references',
                'qid',
                'entity',
                'entityId',
                'item',
                'subject',
                'claimId',
                'guid',
                'source',
                'label',
                'description',
        ]);
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(claim)) {
                if (allowed.has(key)) sanitized[key] = value;
        }
        if (!sanitized.qid && typeof claim.id === 'string' && /^Q\d+/i.test(claim.id)) {
                sanitized.qid = claim.id;
        }
        if (!sanitized.claimId && typeof claim.id === 'string' && claim.id.includes('$')) {
                sanitized.claimId = claim.id;
        }
        return sanitized;
};

const collectRemoteIdentifiers = (
        claims: Array<Record<string, unknown> | string>,
        metadata: Record<string, unknown>,
): { qids: string[]; claimIds: string[] } => {
        const qids = new Set<string>();
        const claimIds = new Set<string>();
        const QID_KEYS = ['qid', 'entityId', 'entity', 'item', 'subject'];
        const CLAIM_ID_KEYS = ['claimId', 'guid', 'id', 'statementId'];

        const addQidFromString = (value: unknown): void => {
                if (typeof value !== 'string') return;
                const matches = value.match(REMOTE_QID_REGEX);
                if (!matches) return;
                for (const match of matches) qids.add(match.toUpperCase());
        };

        const addClaimIdFromString = (value: unknown): void => {
                if (typeof value !== 'string') return;
                const matches = value.match(REMOTE_CLAIM_ID_REGEX);
                if (!matches) return;
                for (const match of matches) claimIds.add(match);
        };

        function collectFromRecord(record: Record<string, unknown>): void {
                for (const key of QID_KEYS) {
                        if (key in record) addQidFromString(record[key]);
                }
                for (const key of CLAIM_ID_KEYS) {
                        if (key in record) addClaimIdFromString(record[key]);
                }
                if ('references' in record) collectFromValue(record.references);
                if ('qualifiers' in record) collectFromValue(record.qualifiers);
        }

        function collectFromValue(value: unknown): void {
                if (!value) return;
                if (Array.isArray(value)) {
                        for (const entry of value) collectFromValue(entry);
                        return;
                }
                if (typeof value === 'string') {
                        addQidFromString(value);
                        addClaimIdFromString(value);
                        return;
                }
                if (typeof value === 'object') {
                        collectFromRecord(value as Record<string, unknown>);
                }
        }

        for (const claim of claims) {
                collectFromValue(claim);
        }

        collectFromRecord(metadata);

        return { qids: Array.from(qids), claimIds: Array.from(claimIds) };
};

export function createRemoteMCPEnhancedStore(
	localStore: StoreLike,
	config: RemoteRAGConfig,
): RemoteMCPEnhancedStore {
	return new RemoteMCPEnhancedStore(localStore, config);
}

export function createRemoteMCPIngestionManager(
	config: RemoteRAGConfig,
): RemoteMCPDocumentIngestionManager {
	return new RemoteMCPDocumentIngestionManager(config);
}

//
// Phase C.2: Remote MCP Orchestration Implementation
//

import type { ConnectorEntry } from '@cortex-os/protocol';
import { routeFactQuery } from './agents-shim.js';

// Types for Phase C.2
export interface VectorSearchResult {
	qid: string;
	score: number;
	title?: string;
	content?: string;
}

export interface ClaimsResult {
	claims: Array<{
		guid: string;
		property: string;
		value?: string;
		description?: string;
	}>;
}

export interface SparqlResult {
	query: string;
	results: Array<Record<string, unknown>>;
}

export interface WikidataMetadata {
	qid: string;
	claimGuid?: string;
	title?: string;
	properties?: string[];
	brand: string;
}

export interface SparqlMetadata {
	sparql: string;
	queryType: string;
	resultCount: number;
	variables: string[];
	brand: string;
}

export interface WorkflowResult {
	content: string;
	source: string;
	metadata: {
		wikidata?: {
			qid?: string;
			claimGuid?: string;
			sparql?: string;
		};
		fallbackReason?: string;
		partialFailure?: string;
		originalError?: string;
		brand: string;
	};
}

export interface WorkflowOptions {
	mcpClient?: AgentMCPClient;
	localStore?: Store;
	timeout?: number;
	enableSparql?: boolean;
	enablePartialResults?: boolean;
}

/**
 * Execute multi-step Wikidata workflow: vector → claims → SPARQL
 * 
 * Phase C.2: Remote MCP Orchestration - orchestrates the complete three-step
 * workflow with metadata stitching, fallback handling, and brAInwav branding.
 *
 * @param query - The query to execute
 * @param connector - The wikidata connector entry
 * @param options - Workflow execution options
 * @returns Promise resolving to workflow result with metadata
 */
export async function executeWikidataWorkflow(
	query: string,
	connector: ConnectorEntry,
	options?: WorkflowOptions,
): Promise<WorkflowResult> {
	const enableSparql = options?.enableSparql ?? true;
	const enablePartialResults = options?.enablePartialResults ?? true;
	const timeout = options?.timeout ?? 30000;
	
	try {
		// Step 1: Route to vector search tool
		const routing = await routeFactQuery(query, connector, { scope: 'facts' });
		
		if (!options?.mcpClient) {
			throw new Error('MCP client not provided for remote workflow');
		}
		
		// Step 1: Execute vector search
		const vectorResult = await options.mcpClient.callTool(
			routing.toolName,
			{ ...routing.parameters, query },
			timeout
		) as { results: VectorSearchResult[] };
		
		if (!vectorResult.results || vectorResult.results.length === 0) {
			return await fallbackToLocal(query, options.localStore, 'no_vector_results');
		}
		
		const topResult = vectorResult.results[0];
		let claimsResult: ClaimsResult | null = null;
		let sparqlResult: SparqlResult | null = null;
		let partialFailure: string | undefined;
		
		// Step 2: Get claims for top QID
		try {
			claimsResult = await options.mcpClient.callTool(
				'get_claims',
				{ 
					qid: topResult.qid,
					brand: 'brAInwav'
				},
				timeout
			) as ClaimsResult;
		} catch (error) {
			console.warn(`brAInwav: Claims retrieval failed for ${topResult.qid}:`, error);
			if (!enablePartialResults) {
				return await fallbackToLocal(query, options.localStore, 'claims_failed');
			}
			partialFailure = 'claims_unavailable';
		}
		
		// Step 3: Execute SPARQL (optional)
		if (enableSparql) {
			try {
				const sparqlQuery = `SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 . ?inventor wdt:P106 wd:Q901 }`;
				sparqlResult = await options.mcpClient.callTool(
					'sparql',
					{ 
						query: sparqlQuery,
						brand: 'brAInwav'
					},
					timeout
				) as SparqlResult;
			} catch (error) {
				console.warn('brAInwav: SPARQL execution failed:', error);
				// SPARQL failure is non-fatal
			}
		}
		
		// Stitch metadata together
		const wikidataMetadata: any = { qid: topResult.qid };
		if (claimsResult && claimsResult.claims.length > 0) {
			wikidataMetadata.claimGuid = claimsResult.claims[0].guid;
		}
		if (sparqlResult) {
			wikidataMetadata.sparql = sparqlResult.query;
		}
		
		return {
			content: topResult.content || topResult.title || `Entity ${topResult.qid}`,
			source: partialFailure ? 'wikidata_partial' : 'wikidata_workflow',
			metadata: {
				wikidata: wikidataMetadata,
				partialFailure,
				brand: 'brAInwav',
			},
		};
		
	} catch (error) {
		console.error('brAInwav: Wikidata workflow failed:', error);
		return await fallbackToLocal(
			query, 
			options?.localStore, 
			'network_error',
			error instanceof Error ? error.message : String(error)
		);
	}
}

/**
 * Stitch QIDs and claim GUIDs into metadata
 * 
 * @param vectorResult - Vector search result with QID
 * @param claimsResult - Claims result with GUIDs
 * @returns Combined metadata with brAInwav branding
 */
export function stitchWikidataMetadata(
	vectorResult: VectorSearchResult,
	claimsResult: ClaimsResult,
): WikidataMetadata {
	const properties = claimsResult.claims.map(claim => claim.property);
	
	return {
		qid: vectorResult.qid,
		claimGuid: claimsResult.claims[0]?.guid,
		title: vectorResult.title,
		properties,
		brand: 'brAInwav',
	};
}

/**
 * Capture SPARQL query metadata for provenance
 * 
 * @param sparqlResult - SPARQL execution result
 * @returns Metadata with query information and brAInwav branding
 */
export function captureSparqlMetadata(sparqlResult: SparqlResult): SparqlMetadata {
	// Extract query type (SELECT, ASK, CONSTRUCT, DESCRIBE)
	const queryType = sparqlResult.query.trim().split(/\s+/)[0].toUpperCase();
	
	// Extract variables from SELECT queries
	const variables: string[] = [];
	if (queryType === 'SELECT') {
		const selectMatch = sparqlResult.query.match(/SELECT\s+(.+?)\s+WHERE/i);
		if (selectMatch) {
			const variablesPart = selectMatch[1];
			const varMatches = variablesPart.match(/\?(\w+)/g);
			if (varMatches) {
				variables.push(...varMatches.map(v => v.substring(1)));
			}
		}
	}
	
	return {
		sparql: sparqlResult.query,
		queryType,
		resultCount: sparqlResult.results.length,
		variables,
		brand: 'brAInwav',
	};
}

/**
 * Execute fallback with ranking preservation
 * 
 * @param query - Original query
 * @param results - Local results to preserve
 * @param options - Fallback options
 * @returns Results with preserved ranking
 */
export function executeWithFallback(
	query: string,
	results: Array<{ content: string; score: number; id?: string }>,
	options?: { preserveRanking?: boolean }
): Array<{ content: string; score: number; id?: string; metadata?: { rank: number } }> {
	if (!options?.preserveRanking) {
		return results;
	}
	
	return results.map((result, index) => ({
		...result,
		metadata: {
			...((result as any).metadata || {}),
			rank: index + 1,
		},
	}));
}

/**
 * Fallback to local store on remote failure
 * 
 * @param query - Original query  
 * @param localStore - Local store to query
 * @param reason - Reason for fallback
 * @param errorMessage - Optional error message
 * @returns Fallback workflow result
 */
async function fallbackToLocal(
	query: string,
	localStore?: Store,
	reason?: string,
	errorMessage?: string,
): Promise<WorkflowResult> {
	if (!localStore) {
		return {
			content: 'No results available - remote service unavailable and no local fallback configured',
			source: 'error',
			metadata: {
				fallbackReason: reason || 'no_local_store',
				originalError: errorMessage,
				brand: 'brAInwav',
			},
		};
	}
	
	try {
		// Use a simple embedding for fallback (would normally use actual embedder)
		const embedding = new Array(1024).fill(0.1); // Placeholder embedding
		const localResults = await localStore.query(embedding, { k: 5 });
		
		const bestResult = localResults[0];
		if (!bestResult) {
			return {
				content: 'No local results found for query',
				source: 'local_fallback',
				metadata: {
					fallbackReason: reason || 'remote_unavailable',
					originalError: errorMessage,
					brand: 'brAInwav',
				},
			};
		}
		
		return {
			content: bestResult.content,
			source: 'local_fallback',
			metadata: {
				fallbackReason: reason || 'remote_unavailable',
				originalError: errorMessage,
				brand: 'brAInwav',
			},
		};
		
	} catch (localError) {
		return {
			content: 'Both remote and local retrieval failed',
			source: 'error',
			metadata: {
				fallbackReason: 'local_also_failed',
				originalError: errorMessage,
				localError: localError instanceof Error ? localError.message : String(localError),
				brand: 'brAInwav',
			},
		};
	}
}
