/**
 * MCP Tool definitions for the RAG package.
 * Implements ingestion, search, retrieval, reranking, and citation helpers
 * that expose the core RAG pipeline over the Model Context Protocol (MCP).
 */

import { z } from 'zod';
import { byChars } from '../chunk/index.js';
import { handleRAG } from '../index.js';
import { CitationBundler } from '../lib/citation-bundler.js';
import type { RAGQuerySchema } from '../lib/contracts-shim.js';
import type { Chunk, Document, Embedder, Store } from '../lib/index.js';
import { retrieveDocs } from '../lib/retrieve-docs.js';
import { RAGPipeline } from '../rag-pipeline.js';

type MCPContent = { type: 'text'; text: string };
type MCPResponse = { content: MCPContent[] };

interface RAGTool {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	handler: (params: unknown) => Promise<MCPResponse>;
}

class SimpleEmbedder implements Embedder {
	private readonly dimensions: number;

	constructor(dimensions = 32) {
		this.dimensions = dimensions;
	}

	async embed(queries: string[]): Promise<number[][]> {
		return queries.map((query) => this.encode(query));
	}

	private encode(text: string): number[] {
		const vector = new Array(this.dimensions).fill(0);
		const normalized = text.toLowerCase();
		for (const char of normalized) {
			const code = char.charCodeAt(0);
			if (!Number.isFinite(code)) continue;
			const bucket = code % this.dimensions;
			vector[bucket] += 1;
		}
		const magnitude = Math.sqrt(
			vector.reduce((sum, value) => sum + value * value, 0),
		);
		if (magnitude === 0) return vector;
		return vector.map((value) => value / magnitude);
	}
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (
		!Array.isArray(a) ||
		!Array.isArray(b) ||
		a.length === 0 ||
		b.length === 0
	) {
		return 0;
	}
	const length = Math.min(a.length, b.length);
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < length; i++) {
		const ai = a[i];
		const bi = b[i];
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}
	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function cloneMetadata(metadata?: Record<string, unknown>) {
	if (!metadata) return undefined;
	return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
}

class ManagedMemoryStore implements Store {
	private items: Array<Chunk & { embedding?: number[] }> = [];

	async upsert(chunks: Chunk[]): Promise<void> {
		const now = Date.now();
		for (const chunk of chunks) {
			const normalized: Chunk & { embedding?: number[] } = {
				...chunk,
				updatedAt: chunk.updatedAt ?? now,
				metadata: cloneMetadata(chunk.metadata),
				embedding: chunk.embedding ? [...chunk.embedding] : undefined,
			};
			const index = this.items.findIndex((item) => item.id === normalized.id);
			if (index >= 0) {
				this.items[index] = normalized;
			} else {
				this.items.push(normalized);
			}
		}
	}

	async query(
		embedding: number[],
		k = 5,
	): Promise<Array<Chunk & { score?: number }>> {
		const limit = Math.max(1, k);
		const scored = this.items
			.filter((item) => Array.isArray(item.embedding))
			.map((item) => ({
				...item,
				metadata: cloneMetadata(item.metadata),
				score: cosineSimilarity(embedding, item.embedding as number[]),
			}))
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, limit)
			.map((item) => ({
				...item,
				embedding: item.embedding ? [...item.embedding] : undefined,
			}));
		return scored;
	}

	clear(): void {
		this.items = [];
	}

	stats() {
		const documents = new Set<string>();
		let characters = 0;
		let lastUpdated = 0;
		for (const item of this.items) {
			const docId = item.source ?? item.id.split('#')[0];
			documents.add(docId);
			characters += item.text.length;
			lastUpdated = Math.max(lastUpdated, item.updatedAt ?? 0);
		}
		return {
			documents: documents.size,
			chunks: this.items.length,
			characters,
			lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
		};
	}
}

interface RagEnvironment {
	embedder: SimpleEmbedder;
	store: ManagedMemoryStore;
	pipeline: RAGPipeline;
}

function createEnvironment(): RagEnvironment {
	const embedder = new SimpleEmbedder();
	const store = new ManagedMemoryStore();
	const pipeline = new RAGPipeline({
		embedder,
		store,
		chunkSize: 400,
		chunkOverlap: 40,
	});
	return { embedder, store, pipeline };
}

let currentEnv = createEnvironment();

function getEnv(): RagEnvironment {
	return currentEnv;
}

export function __resetRagPipelineForTesting(): void {
	currentEnv = createEnvironment();
}

function createToolResponse(
	tool: string,
	payload: Record<string, unknown>,
): MCPResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					tool,
					timestamp: new Date().toISOString(),
					...payload,
				}),
			},
		],
	};
}

function mapResults(results: Array<Chunk & { score?: number }>): Array<{
	documentId: string;
	chunkId: string;
	text: string;
	score: number;
	metadata?: Record<string, unknown> | null;
	updatedAt?: string | null;
}> {
	return results.map((result) => ({
		documentId: result.source ?? result.id.split('#')[0],
		chunkId: result.id,
		text: result.text,
		score: result.score ?? 0,
		metadata: result.metadata ?? null,
		updatedAt: result.updatedAt
			? new Date(result.updatedAt).toISOString()
			: null,
	}));
}

export const ragQueryToolSchema = z.object({
	query: z.string().min(1).describe('The query text to search for'),
	topK: z
		.number()
		.int()
		.positive()
		.max(100)
		.default(5)
		.describe('Number of results to return'),
	maxTokens: z
		.number()
		.int()
		.positive()
		.max(4096)
		.default(1024)
		.describe('Maximum tokens for response'),
	timeoutMs: z
		.number()
		.int()
		.positive()
		.max(120000)
		.default(30000)
		.describe('Timeout in milliseconds'),
});

const baseIngestSchema = z.object({
	documentId: z
		.string()
		.min(1)
		.max(256)
		.describe('Unique identifier for the document being ingested'),
	text: z
		.string()
		.min(1)
		.describe('Raw document text to store and chunk for retrieval'),
	metadata: z
		.record(z.unknown())
		.optional()
		.describe('Optional metadata attached to each chunk'),
	chunkSize: z
		.number()
		.int()
		.positive()
		.max(4000)
		.default(400)
		.describe('Maximum characters per chunk'),
	chunkOverlap: z
		.number()
		.int()
		.min(0)
		.max(1000)
		.default(40)
		.describe('Overlap between consecutive chunks'),
});

export const ragDocumentIngestToolSchema = baseIngestSchema;

export const ragSearchToolSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe('Search query to run against the knowledge base'),
	topK: z
		.number()
		.int()
		.positive()
		.max(50)
		.default(5)
		.describe('Maximum number of chunks to return'),
});

export const ragRetrieveToolSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe('Question to retrieve supporting context for'),
	topK: z
		.number()
		.int()
		.positive()
		.max(50)
		.default(5)
		.describe('Maximum number of citations to include'),
});

const rerankDocumentSchema = z.object({
	id: z.string().min(1),
	content: z.string().min(1),
	metadata: z.record(z.unknown()).optional(),
	embedding: z.array(z.number()).optional(),
});

export const ragRerankToolSchema = z.object({
	query: z.string().min(1),
	documents: z.array(rerankDocumentSchema).min(1),
	topK: z.number().int().positive().max(50).default(5),
});

export const ragCitationToolSchema = z.object({
	query: z.string().min(1),
	topK: z.number().int().positive().max(50).default(5),
	claims: z.array(z.string().min(1)).optional(),
});

export const ragStatusToolSchema = z.object({
	includeStats: z
		.boolean()
		.default(false)
		.describe('Include detailed ingestion statistics'),
});

export const ragQueryTool: RAGTool = {
	name: 'rag_query',
	description: 'Query the RAG knowledge base using semantic search',
	inputSchema: ragQueryToolSchema,
	handler: async (params: unknown) => {
		const { query, topK, maxTokens, timeoutMs } =
			ragQueryToolSchema.parse(params);

		const input = {
			config: {
				maxTokens,
				timeoutMs,
				memory: {
					maxItems: topK * 10,
					maxBytes: maxTokens * 4,
				},
			},
			query: { query, topK } satisfies z.infer<typeof RAGQuerySchema>,
			json: true,
		};

		const result = await handleRAG(input);
		return { content: [{ type: 'text', text: result }] };
	},
};

const ragDocumentIngestToolImpl: RAGTool = {
	name: 'rag_ingest_document',
	description: 'Chunk and ingest a document into the in-memory RAG store',
	inputSchema: baseIngestSchema,
	handler: async (params: unknown) => {
		const { documentId, text, metadata, chunkSize, chunkOverlap } =
			baseIngestSchema.parse(params);
		const env = getEnv();
		const now = Date.now();
		const parts = byChars(text, chunkSize, chunkOverlap);
		const chunks: Chunk[] = parts.map((part, index) => ({
			id: `${documentId}#${index}`,
			text: part,
			source: documentId,
			updatedAt: now,
			metadata: cloneMetadata(metadata),
		}));
		await env.pipeline.ingest(chunks);
		const stats = env.store.stats();
		return createToolResponse('rag_ingest_document', {
			status: 'ingested',
			documentId,
			chunks: chunks.length,
			metadata: metadata ?? null,
			store: stats,
		});
	},
};

export const ragDocumentIngestTool = ragDocumentIngestToolImpl;
export const ragIngestTool = ragDocumentIngestToolImpl;

export const ragSearchTool: RAGTool = {
	name: 'rag_search',
	description: 'Search indexed chunks and return scored matches',
	inputSchema: ragSearchToolSchema,
	handler: async (params: unknown) => {
		const { query, topK } = ragSearchToolSchema.parse(params);
		const env = getEnv();
		const [embedding] = await env.embedder.embed([query]);
		const results = await env.store.query(embedding, topK);
		return createToolResponse('rag_search', {
			query,
			topK,
			results: mapResults(results),
			totalResults: results.length,
		});
	},
};

export const ragRetrieveTool: RAGTool = {
	name: 'rag_retrieve',
	description: 'Retrieve contextual passages with bundled citations',
	inputSchema: ragRetrieveToolSchema,
	handler: async (params: unknown) => {
		const { query, topK } = ragRetrieveToolSchema.parse(params);
		const env = getEnv();
		const [embedding] = await env.embedder.embed([query]);
		const results = await env.store.query(embedding, topK);
		const bundler = new CitationBundler();
		const bundle = bundler.bundle(results);
		const mapped = mapResults(results);
		const citations = bundle.citations.map((citation) => {
			const match = mapped.find((item) => item.chunkId === citation.id);
			return {
				documentId: citation.source ?? citation.id.split('#')[0],
				chunkId: citation.id,
				text: citation.text,
				score: citation.score ?? 0,
				metadata: match?.metadata ?? null,
				updatedAt: match?.updatedAt ?? null,
			};
		});
		return createToolResponse('rag_retrieve', {
			query,
			topK,
			context: bundle.text,
			citations,
			noEvidence: bundle.noEvidence ?? false,
		});
	},
};

export const ragRerankTool: RAGTool = {
	name: 'rag_rerank',
	description:
		'Rerank provided documents against a query using cosine similarity',
	inputSchema: ragRerankToolSchema,
	handler: async (params: unknown) => {
		const { query, documents, topK } = ragRerankToolSchema.parse(params);
		const env = getEnv();
		const limit = Math.min(topK, documents.length);
		const [queryEmbedding] = await env.embedder.embed([query]);
		const prepared: Document[] = documents.map((doc) => ({
			id: doc.id,
			content: doc.content,
			metadata: cloneMetadata(doc.metadata),
			embedding: doc.embedding ? [...doc.embedding] : undefined,
		}));
		const reranked = await retrieveDocs(
			env.embedder as unknown as Embedder,
			queryEmbedding,
			prepared,
			limit,
		);
		const mapped = reranked.map((doc) => ({
			id: doc.id,
			content: doc.content,
			metadata: doc.metadata ?? null,
			similarity: doc.similarity ?? 0,
		}));
		return createToolResponse('rag_rerank', {
			query,
			topK: limit,
			documents: mapped,
		});
	},
};

export const ragCitationTool: RAGTool = {
	name: 'rag_citations',
	description: 'Generate citation bundles and optional per-claim evidence',
	inputSchema: ragCitationToolSchema,
	handler: async (params: unknown) => {
		const { query, topK, claims } = ragCitationToolSchema.parse(params);
		const env = getEnv();
		const [embedding] = await env.embedder.embed([query]);
		const results = await env.store.query(embedding, topK);
		const bundler = new CitationBundler();
		const bundle =
			claims && claims.length > 0
				? bundler.bundleWithClaims(results, claims)
				: bundler.bundle(results);
		const mapped = mapResults(results);
		const citations = bundle.citations.map((citation) => {
			const match = mapped.find((item) => item.chunkId === citation.id);
			return {
				documentId: citation.source ?? citation.id.split('#')[0],
				chunkId: citation.id,
				text: citation.text,
				score: citation.score ?? 0,
				metadata: match?.metadata ?? null,
				updatedAt: match?.updatedAt ?? null,
			};
		});
		const claimCitations = (bundle.claimCitations ?? []).map((claim) => ({
			claim: claim.claim,
			noEvidence: claim.noEvidence ?? false,
			citations: claim.citations.map((citation) => {
				const match = mapped.find((item) => item.chunkId === citation.id);
				return {
					documentId: citation.source ?? citation.id.split('#')[0],
					chunkId: citation.id,
					text: citation.text,
					score: citation.score ?? 0,
					metadata: match?.metadata ?? null,
					updatedAt: match?.updatedAt ?? null,
				};
			}),
		}));
		return createToolResponse('rag_citations', {
			query,
			topK,
			citations,
			claimCitations,
			noEvidence: bundle.noEvidence ?? false,
		});
	},
};

export const ragStatusTool: RAGTool = {
	name: 'rag_status',
	description: 'Get status and statistics of the RAG system',
	inputSchema: ragStatusToolSchema,
	handler: async (params: unknown) => {
		const { includeStats } = ragStatusToolSchema.parse(params);
		const env = getEnv();
		const base = {
			status: 'active',
		} as Record<string, unknown>;
		if (includeStats) {
			base.stats = env.store.stats();
		}
		return createToolResponse('rag_status', base);
	},
};

export const ragMcpTools: RAGTool[] = [
	ragQueryTool,
	ragDocumentIngestTool,
	ragSearchTool,
	ragRetrieveTool,
	ragRerankTool,
	ragCitationTool,
	ragStatusTool,
];
