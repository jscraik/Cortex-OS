import { GraphNodeType } from '@prisma/client';
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
                meta: unknown | null;
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

export async function assembleContext(
	nodeIds: string[],
	maxChunks: number,
	seedResults: GraphRAGSearchResult[],
): Promise<AssembledContext> {
	if (nodeIds.length === 0) {
		return { nodes: [], chunks: [] };
	}

        const [rawNodes, chunkRefs] = await Promise.all([
                prisma.graphNode.findMany({ where: { id: { in: nodeIds } } }),
                prisma.chunkRef.findMany({
                        where: { nodeId: { in: nodeIds } },
                        include: { node: true },
			orderBy: { createdAt: 'desc' },
			take: maxChunks * 3,
		}),
	]);

	const seedById = new Map(seedResults.map((result) => [result.id, result]));
	const seenPaths = new Set<string>();
	const chunks: ContextChunk[] = [];

	const sortedRefs = chunkRefs.sort((a, b) => {
		const aSeed = seedById.get(a.qdrantId);
		const bSeed = seedById.get(b.qdrantId);
		const aPriority = NODE_PRIORITY[a.node.type] ?? 0;
		const bPriority = NODE_PRIORITY[b.node.type] ?? 0;
		if (aPriority !== bPriority) {
			return bPriority - aPriority;
		}
		const aScore = aSeed?.score ?? Number(a.meta?.score ?? 0);
		const bScore = bSeed?.score ?? Number(b.meta?.score ?? 0);
		return bScore - aScore;
	});

	for (const ref of sortedRefs) {
		if (chunks.length >= maxChunks) {
			break;
		}
		const key = `${ref.path}:${ref.lineStart ?? 0}-${ref.lineEnd ?? 0}`;
		if (seenPaths.has(key)) {
			continue;
		}
		seenPaths.add(key);

		const seed = seedById.get(ref.qdrantId);
		const content = seed?.chunkContent ?? (ref.meta as any)?.snippet ?? '';

		chunks.push({
			id: ref.id,
			nodeId: ref.nodeId,
			path: ref.path,
			content: content || `${ref.path}:${ref.lineStart ?? 1}-${ref.lineEnd ?? 1}`,
			lineStart: ref.lineStart ?? (ref.meta as any)?.lineStart ?? undefined,
			lineEnd: ref.lineEnd ?? (ref.meta as any)?.lineEnd ?? undefined,
			score: seed?.score ?? Number((ref.meta as any)?.score ?? 0),
			nodeType: ref.node.type,
			nodeKey: ref.node.key,
		});
	}

        const nodes = rawNodes.map((node) => ({
                id: node.id,
                type: node.type,
                key: node.key,
                label: node.label,
                meta: node.meta ?? null,
        }));

        return { nodes, chunks };
}
