import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { type QdrantConfig, type SparseVector } from '../retrieval/QdrantHybrid.js';
declare const ingestRequestSchema: z.ZodObject<{
    documentId: z.ZodString;
    source: z.ZodString;
    text: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hierarchical: z.ZodDefault<z.ZodBoolean>;
    multimodal: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    source?: string;
    metadata?: Record<string, unknown>;
    text?: string;
    documentId?: string;
    hierarchical?: boolean;
    multimodal?: any[];
}, {
    source?: string;
    metadata?: Record<string, unknown>;
    text?: string;
    documentId?: string;
    hierarchical?: boolean;
    multimodal?: any[];
}>;
export type GraphRAGIngestRequest = z.input<typeof ingestRequestSchema>;
export interface GraphRAGIngestResult {
    documentId: string;
    chunks: number;
    metadata?: Record<string, unknown>;
}
interface QdrantChunkPayload {
    id: string;
    nodeId: string;
    content: string;
    vector: number[];
    sparseVector: SparseVector;
    metadata: Record<string, unknown>;
}
interface GraphChunkRefInput {
    nodeId: string;
    qdrantId: string;
    path: string;
    meta: Prisma.JsonObject;
}
interface GraphDocumentRecord {
    nodeId: string;
    nodeKey: string;
    previousChunkIds: string[];
}
interface GraphPersistence {
    ensureDocument(input: GraphRAGIngestRequest): Promise<GraphDocumentRecord>;
    replaceChunkRefs(nodeId: string, refs: GraphChunkRefInput[]): Promise<void>;
}
interface VectorStore {
    init(embedDense: (text: string) => Promise<number[]>, embedSparse: (text: string) => Promise<SparseVector>): Promise<void>;
    add(chunks: QdrantChunkPayload[]): Promise<void>;
    remove(ids: string[]): Promise<void>;
    close(): Promise<void>;
}
interface KnowledgeGraphAdapter {
    upsertDocument(payload: {
        nodeId: string;
        documentId: string;
        label: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    close(): Promise<void>;
}
interface GraphRAGIngestServiceOptions {
    chunkSize?: number;
    qdrant?: Partial<QdrantConfig>;
    neo4j?: {
        enabled: boolean;
        uri?: string;
        user?: string;
        password?: string;
    };
    idFactory?: () => string;
    clock?: () => number;
}
interface GraphRAGIngestDependencies {
    persistence: GraphPersistence;
    store: VectorStore;
    neo4j?: KnowledgeGraphAdapter;
    chunkSize: number;
    idFactory: () => string;
    clock: () => number;
}
export declare class GraphRAGIngestService {
    private readonly deps;
    private embedDense?;
    private embedSparse?;
    constructor(deps: GraphRAGIngestDependencies);
    initialize(embedDense: (text: string) => Promise<number[]>, embedSparse: (text: string) => Promise<SparseVector>): Promise<void>;
    ingest(request: GraphRAGIngestRequest): Promise<GraphRAGIngestResult>;
    close(): Promise<void>;
    private assertInitialized;
    private buildVectorPayloads;
}
export declare function createGraphRAGIngestService(options?: GraphRAGIngestServiceOptions): GraphRAGIngestService;
export {};
