import type { BranchId, CheckpointId, CheckpointMeta, CheckpointRecord, StateEnvelope } from '@cortex-os/contracts';
import type { MemoryAnalysisInput, MemoryRelationshipsInput, MemorySearchInput, MemoryStatsInput, MemoryStoreInput } from '@cortex-os/tool-spec';
export type MemoryMetadata = Record<string, unknown> & {
    sourceUri?: string;
    contentSha?: string;
    tenant?: string;
    labels?: string[];
};
export interface Memory {
    id: string;
    content: string;
    importance: number;
    tags: string[];
    domain?: string;
    metadata?: MemoryMetadata;
    createdAt: Date;
    updatedAt: Date;
    vectorIndexed?: boolean;
}
export interface MemorySearchResult extends Memory {
    score: number;
    matchType?: 'semantic' | 'keyword' | 'hybrid';
    highlights?: string[];
}
export interface MemoryRelationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationshipType;
    strength: number;
    bidirectional: boolean;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
export type RelationshipType = 'references' | 'extends' | 'contradicts' | 'supports' | 'precedes' | 'follows' | 'related_to';
export interface MemoryStats {
    totalCount: number;
    domainDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
    importanceDistribution: Record<number, number>;
    temporalDistribution?: Array<{
        date: string;
        count: number;
    }>;
    storageSize?: {
        sqliteBytes: number;
        qdrantBytes?: number;
        totalBytes: number;
    };
    indexStats?: {
        sqliteIndexSize: number;
        qdrantVectorCount?: number;
        lastIndexed?: Date;
    };
    qdrantStats?: {
        healthy: boolean;
        collectionExists: boolean;
        vectorCount: number;
        indexedSegments?: number;
    };
    recentActivity?: Array<{
        date: string;
        stored: number;
        searched: number;
        analyzed: number;
    }>;
}
export interface MemoryAnalysisResult {
    type: string;
    summary?: string;
    insights?: string[];
    patterns?: Record<string, unknown>;
    clusters?: Array<{
        id: string;
        label: string;
        size: number;
        examples: string[];
    }>;
    conceptNetwork?: {
        nodes: Array<{
            id: string;
            label: string;
            weight: number;
        }>;
        edges: Array<{
            source: string;
            target: string;
            weight: number;
            type: string;
        }>;
    };
    temporalPatterns?: Array<{
        period: string;
        frequency: number;
        trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    metadata?: Record<string, unknown>;
}
export interface MemoryGraph {
    nodes: Array<{
        id: string;
        label: string;
        type: 'memory' | 'concept' | 'tag';
        weight: number;
        metadata?: Record<string, unknown>;
    }>;
    edges: Array<{
        source: string;
        target: string;
        weight: number;
        type: RelationshipType;
        directed: boolean;
    }>;
    centralNode?: string;
    metrics?: {
        nodeCount: number;
        edgeCount: number;
        density: number;
        centrality?: Record<string, number>;
    };
}
export interface MemoryProvider {
    get(id: string): Promise<Memory | null>;
    store(input: MemoryStoreInput): Promise<{
        id: string;
        vectorIndexed: boolean;
    }>;
    search(input: MemorySearchInput): Promise<MemorySearchResult[]>;
    analysis(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult>;
    relationships(input: MemoryRelationshipsInput): Promise<MemoryRelationship | MemoryRelationship[] | MemoryGraph | {
        success: boolean;
    }>;
    stats(input?: MemoryStatsInput): Promise<MemoryStats>;
    healthCheck(): Promise<{
        healthy: boolean;
        details: Record<string, unknown>;
    }>;
    cleanup?(): Promise<void>;
    optimize?(): Promise<void>;
    close?(): Promise<void>;
    checkpoints?: import('./checkpoints/CheckpointManager.js').CheckpointManager;
}
export interface QdrantConfig {
    url: string;
    apiKey?: string;
    collection: string;
    embedDim: number;
    similarity: 'Cosine' | 'Euclidean' | 'Dot';
    timeout?: number;
}
export interface QdrantPoint {
    id: string;
    vector: number[];
    payload: {
        id: string;
        domain?: string;
        tags: string[];
        labels: string[];
        tenant?: string;
        sourceUri?: string;
        contentSha?: string;
        createdAt: number;
        updatedAt: number;
        importance: number;
    };
}
export interface SQLiteMemoryRow {
    id: string;
    content: string;
    importance: number;
    domain?: string;
    tags?: string;
    metadata?: string;
    created_at: number;
    updated_at: number;
    vector_indexed?: number;
}
export interface SQLiteRelationshipRow {
    id: string;
    source_id: string;
    target_id: string;
    type: string;
    strength: number;
    bidirectional: number;
    created_at: number;
    metadata?: string;
}
export declare class MemoryProviderError extends Error {
    code: 'NOT_FOUND' | 'VALIDATION' | 'STORAGE' | 'NETWORK' | 'INDEX' | 'INTERNAL';
    details?: Record<string, unknown>;
    constructor(code: 'NOT_FOUND' | 'VALIDATION' | 'STORAGE' | 'NETWORK' | 'INDEX' | 'INTERNAL', message: string, details?: Record<string, unknown>);
}
export interface CheckpointConfig {
    maxRetained: number;
    ttlMs: number;
    branchBudget: number;
    samplerLabel?: string;
}
export interface CheckpointSnapshot extends CheckpointRecord {
    digest: string;
}
export interface CheckpointListPage {
    items: CheckpointRecord[];
    nextCursor?: string;
}
export interface CheckpointContext {
    meta: CheckpointMeta;
    state: StateEnvelope;
    digest: string;
}
export interface CheckpointBranchRequest {
    from: CheckpointId;
    count: number;
    labels?: string[];
}
export interface CheckpointBranchResult {
    parent: CheckpointId;
    branchId: BranchId;
    checkpoints: CheckpointId[];
}
export interface MemoryCoreConfig {
    sqlitePath: string;
    qdrant?: QdrantConfig;
    shortTerm?: {
        ttlMs: number;
        promotionImportance: number;
    };
    embeddingModel?: string;
    embedDim?: number;
    defaultLimit: number;
    maxLimit: number;
    maxOffset: number;
    defaultThreshold: number;
    hybridWeight: number;
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    queueConcurrency: number;
    logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
    checkpoint?: CheckpointConfig;
}
