import { GraphEdgeType } from '@prisma/client';
import { prisma } from '../db/prismaClient.js';

export interface ExpandGraphOptions {
  allowedEdges: GraphEdgeType[];
  maxNeighborsPerNode: number;
}

export interface ExpandedGraph {
  neighborIds: string[];
  edges: Array<{
    id: string;
    type: GraphEdgeType;
    srcId: string;
    dstId: string;
    weight: number | null;
  }>;
}

export async function expandNeighbors(
  nodeIds: string[],
  options: ExpandGraphOptions,
): Promise<ExpandedGraph> {
  if (nodeIds.length === 0) {
    return { neighborIds: [], edges: [] };
  }

  const edges = await prisma.graphEdge.findMany({
    where: {
      type: { in: options.allowedEdges },
      OR: [{ srcId: { in: nodeIds } }, { dstId: { in: nodeIds } }],
    },
    orderBy: { weight: 'desc' },
    take: options.maxNeighborsPerNode * nodeIds.length,
  });

  const neighborIds = new Set<string>();
  for (const edge of edges) {
    if (nodeIds.includes(edge.srcId)) {
      neighborIds.add(edge.dstId);
    }
    if (nodeIds.includes(edge.dstId)) {
      neighborIds.add(edge.srcId);
    }
  }

  for (const id of nodeIds) {
    neighborIds.delete(id);
  }

  return {
    neighborIds: [...neighborIds],
    edges: edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      srcId: edge.srcId,
      dstId: edge.dstId,
      weight: edge.weight,
    })),
  };
}
