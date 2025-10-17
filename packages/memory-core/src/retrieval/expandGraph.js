import { prisma } from '../db/prismaClient.js';
// Cache for graph expansion results
const expansionCache = new Map();
const CACHE_TTL = 300000; // 5 minutes
const _MAX_CACHE_SIZE = 1000;
export async function expandNeighbors(nodeIds, options) {
    if (nodeIds.length === 0) {
        return { neighborIds: [], edges: [] };
    }
    // Check cache first
    const cacheKey = Buffer.from([
        ...nodeIds.sort(),
        ...options.allowedEdges.sort(),
        options.maxNeighborsPerNode.toString(),
    ].join('|')).toString('base64');
    const cached = expansionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('brAInwav GraphRAG expansion cache hit', {
            component: 'memory-core',
            brand: 'brAInwav',
            cacheKey,
            age: Date.now() - cached.timestamp,
        });
        return cached.expansion;
    }
    const _startTime = Date.now();
    // Optimized database query with specific field selection
    const edges = await prisma.graphEdge.findMany({
        where: {
            type: { in: options.allowedEdges },
            OR: [{ srcId: { in: nodeIds } }, { dstId: { in: nodeIds } }],
        },
        select: {
            id: true,
            type: true,
            srcId: true,
            dstId: true,
            weight: true,
        },
        orderBy: { weight: 'desc' },
        take: Math.min(options.maxNeighborsPerNode * nodeIds.length, 1000), // Cap for performance
    });
    // Optimized neighbor ID computation using Set operations
    const nodeIdSet = new Set(nodeIds);
    const neighborIds = new Set();
    for (const edge of edges) {
        if (nodeIdSet.has(edge.srcId)) {
            neighborIds.add(edge.dstId);
        }
        if (nodeIdSet.has(edge.dstId)) {
            neighborIds.add(edge.srcId);
        }
    }
    // Remove original node IDs from neighbors
    for (const id of nodeIds) {
        neighborIds.delete(id);
    }
    const _result = {
        neighborIds: [...neighborIds],
        edges: edges.map((edge) => ({
            id: edge.id,
            type: edge.type,
            srcId: edge.srcId,
            dstId: edge.dstId,
            weight: edge.weight ?? null,
        })),
    };
}
