import { GraphNodeType } from '../db/prismaEnums.js';
import { prisma } from '../db/prismaClient.js';
import type { GraphRAGSearchResult } from './QdrantHybrid.js';

export interface ContextChunk {
	id: string;
	nodeId: string;
	path: string;
	content: string;
	lineStart?: number;
	lineEnd?: number;
	score: number;
	nodeType: GraphNodeType;
	nodeKey: string;
}

export interface AssembledContext {
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		meta: unknown;
	}>;
	chunks: ContextChunk[];
}

const NODE_PRIORITY: Record<GraphNodeType, number> = {
	[GraphNodeType.DOC]: 4,
	[GraphNodeType.ADR]: 4,
	[GraphNodeType.CONTRACT]: 3,
	[GraphNodeType.SERVICE]: 3,
	[GraphNodeType.PACKAGE]: 2,
	[GraphNodeType.AGENT]: 2,
	[GraphNodeType.TOOL]: 2,
	[GraphNodeType.EVENT]: 1,
	[GraphNodeType.FILE]: 1,
	[GraphNodeType.API]: 1,
	[GraphNodeType.PORT]: 1,
};

// Cache for context assembly results
const contextCache = new Map<string, { context: AssembledContext; timestamp: number }>();
const CACHE_TTL = 600000; // 10 minutes
const MAX_CACHE_SIZE = 500;

export async function assembleContext(
	nodeIds: string[],
	maxChunks: number,
	seedResults: GraphRAGSearchResult[],
): Promise<AssembledContext> {
	if (nodeIds.length === 0) {
		return { nodes: [], chunks: [] };
	}

	// Check cache first
	const cacheKey = Buffer.from([...nodeIds.sort(), maxChunks.toString()].join('|')).toString('base64');
	const cached = contextCache.get(cacheKey);
	if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
		console.log('brAInwav GraphRAG context cache hit', {
			component: 'memory-core',
			brand: 'brAInwav',
			cacheKey,
			age: Date.now() - cached.timestamp,
		});
		return cached.context;
	}

	const startTime = Date.now();

	// Optimized database queries with specific field selection
	const [nodes, chunkRefs] = await Promise.all([
		prisma.graphNode.findMany({
			where: { id: { in: nodeIds } },
			select: { id: true, type: true, key: true, label: true, meta: true },
		}),
		prisma.chunkRef.findMany({
			where: { nodeId: { in: nodeIds } },
			select: {
				id: true,
				nodeId: true,
				qdrantId: true,
				path: true,
				lineStart: true,
				lineEnd: true,
				meta: true,
				node: { select: { type: true, key: true } },
			},
			orderBy: { createdAt: 'desc' },
			take: maxChunks * 2, // Reduced from 3 to 2 for better performance
		}),
	]);

	// Pre-compute maps for O(1) lookups
	const seedById = new Map(seedResults.map((result) => [result.id, result]));
	const seenPaths = new Set<string>();
	const chunks: ContextChunk[] = [];

	// Optimized sorting with pre-computed priorities
	const sortedRefs = chunkRefs.sort((a, b) => {
		const aPriority = NODE_PRIORITY[a.node.type] ?? 0;
		const bPriority = NODE_PRIORITY[b.node.type] ?? 0;
		if (aPriority !== bPriority) {
			return bPriority - aPriority;
		}
		const aScore = seedById.get(a.qdrantId)?.score ?? Number((a.meta as any)?.score ?? 0);
		const bScore = seedById.get(b.qdrantId)?.score ?? Number((b.meta as any)?.score ?? 0);
		return bScore - aScore;
	});

	// Batch chunk processing
	const processedChunks = sortedRefs.slice(0, maxChunks * 2).map((ref) => {
		const seed = seedById.get(ref.qdrantId);
		const content = seed?.chunkContent ?? (ref.meta as any)?.snippet ?? '';
		const key = `${ref.path}:${ref.lineStart ?? 0}-${ref.lineEnd ?? 0}`;

		return {
			ref,
			content: content || `${ref.path}:${ref.lineStart ?? 1}-${ref.lineEnd ?? 1}`,
			key,
			score: seed?.score ?? Number((ref.meta as any)?.score ?? 0),
		};
	});

	// Deduplicate and limit chunks
	for (const { ref, content, key, score } of processedChunks) {
		if (chunks.length >= maxChunks || seenPaths.has(key)) {
			continue;
		}
		seenPaths.add(key);

		chunks.push({
			id: ref.id,
			nodeId: ref.nodeId,
			path: ref.path,
			content,
			lineStart: ref.lineStart ?? (ref.meta as any)?.lineStart ?? undefined,
			lineEnd: ref.lineEnd ?? (ref.meta as any)?.lineEnd ?? undefined,
			score,
			nodeType: ref.node.type,
			nodeKey: ref.node.key,
		});
	}

	const result = { nodes, chunks };

	// Cache results
	if (contextCache.size < MAX_CACHE_SIZE) {
		contextCache.set(cacheKey, {
			context: result,
			timestamp: Date.now(),
		});
	} else {
		// Evict oldest entry
		const oldestKey = contextCache.keys().next().value;
		contextCache.delete(oldestKey);
		contextCache.set(cacheKey, {
			context: result,
			timestamp: Date.now(),
		});
	}

	console.log('brAInwav GraphRAG context assembly completed', {
		component: 'memory-core',
		brand: 'brAInwav',
		nodeCount: nodes.length,
		chunkCount: chunks.length,
		durationMs: Date.now() - startTime,
		cacheSize: contextCache.size,
	});

	return result;
}

/**
 * Clean up expired cache entries
 */
export function cleanupContextCache(): void {
	const now = Date.now();
	for (const [key, value] of contextCache.entries()) {
		if (now - value.timestamp > CACHE_TTL) {
			contextCache.delete(key);
		}
	}
}
