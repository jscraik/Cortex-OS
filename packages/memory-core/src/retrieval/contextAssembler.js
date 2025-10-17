import { prisma } from '../db/prismaClient.js';
import { GraphNodeType } from '../db/prismaEnums.js';
const NODE_PRIORITY = {
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
const _contextCache = new Map();
const _CACHE_TTL = 600000; // 10 minutes
const _MAX_CACHE_SIZE = 500;
export async function assembleContext(nodeIds, maxChunks, seedResults) {
    if (nodeIds.length === 0) {
        return { nodes: [], chunks: [] };
    }
    const [rawNodes, chunkRefs] = await Promise.all([
        prisma.graphNode.findMany({ where: { id: { in: nodeIds } } }),
        prisma.chunkRef.findMany({
            where: { nodeId: { in: nodeIds } },
            include: { node: true },
            orderBy: { createdAt: 'desc' },
            take: maxChunks * 2, // Reduced from 3 to 2 for better performance
        }),
    ]);
    // Pre-compute maps for O(1) lookups
    const seedById = new Map(seedResults.map((result) => [result.id, result]));
    const seenPaths = new Set();
    const chunks = [];
    // Optimized sorting with pre-computed priorities
    const sortedRefs = chunkRefs.sort((a, b) => {
        const aPriority = NODE_PRIORITY[a.node.type] ?? 0;
        const bPriority = NODE_PRIORITY[b.node.type] ?? 0;
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
        const aScore = seedById.get(a.qdrantId)?.score ?? Number(a.meta?.score ?? 0);
        const bScore = seedById.get(b.qdrantId)?.score ?? Number(b.meta?.score ?? 0);
        return bScore - aScore;
    });
    // Batch chunk processing
    const processedChunks = sortedRefs.slice(0, maxChunks * 2).map((ref) => {
        const seed = seedById.get(ref.qdrantId);
        const content = seed?.chunkContent ?? ref.meta?.snippet ?? '';
        const key = `${ref.path}:${ref.lineStart ?? 0}-${ref.lineEnd ?? 0}`;
        return {
            ref,
            content: content || `${ref.path}:${ref.lineStart ?? 1}-${ref.lineEnd ?? 1}`,
            key,
            score: seed?.score ?? Number(ref.meta?.score ?? 0),
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
            lineStart: ref.lineStart ?? ref.meta?.lineStart ?? undefined,
            lineEnd: ref.lineEnd ?? ref.meta?.lineEnd ?? undefined,
            score,
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
