import type { GraphEdgeType } from '@prisma/client';
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
export declare function expandNeighbors(nodeIds: string[], options: ExpandGraphOptions): Promise<ExpandedGraph>;
