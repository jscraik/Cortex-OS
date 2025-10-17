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
export declare function assembleContext(nodeIds: string[], maxChunks: number, seedResults: GraphRAGSearchResult[]): Promise<AssembledContext>;
