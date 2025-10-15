/**
 * Type adapters for Local Memory tool schemas
 * 
 * This file provides adapters between @cortex-os/tool-spec schemas
 * and @cortex-os/memory-core provider interfaces to handle schema mismatches.
 */

import type {
    Memory,
    MemorySearchResult,
    LocalMemoryProvider,
    RemoteMemoryProvider,
} from '@cortex-os/memory-core';

// Adapter types for tool schemas that don't match memory-core exactly

export interface StoreMemoryInput {
    content: string; // Tool schema uses 'content'
    importance: number;
    tags?: string[];
    domain?: string;
    metadata?: Record<string, unknown>;
}

export interface SearchMemoryInput {
    query: string;
    searchType?: 'semantic' | 'keyword' | 'hybrid';
    limit?: number;
    tags?: string[];
    domain?: string;
}

export interface GetMemoryInput {
    id: string;
}

export interface AnalysisInput {
    query?: string;
    timeRange?: { start?: string; end?: string };
    tags?: string[];
}

export interface RelationshipsInput {
    memoryId: string;
    depth?: number;
}

export interface StatsInput {
    groupBy?: 'tag' | 'domain' | 'date';
}

/**
 * Adapter functions to convert between tool schemas and memory-core types
 */

export function adaptStoreInput(input: StoreMemoryInput): {
    text: string;
    importance: number;
    tags?: string[];
    domain?: string;
    metadata?: Record<string, unknown>;
} {
    return {
        text: input.content, // Map content -> text
        importance: input.importance,
        tags: input.tags,
        domain: input.domain,
        metadata: input.metadata,
    };
}

export function adaptSearchInput(input: SearchMemoryInput): {
    query: string;
    search_type?: 'semantic' | 'keyword' | 'hybrid';
    tags?: string[];
    domain?: string;
} {
    return {
        query: input.query,
        search_type: input.searchType, // Map searchType -> search_type
        tags: input.tags,
        domain: input.domain,
    };
}

export function adaptGetInput(input: GetMemoryInput): string {
    return input.id; // Memory provider expects plain string
}

export function adaptSearchResult(result: MemorySearchResult[]): {
    results: Array<{
        id: string;
        content: string;
        score?: number;
        tags?: string[];
        domain?: string;
    }>;
} {
    return {
        results: result.map((item) => ({
            id: item.id,
            content: item.content ?? '',
            score: item.score,
            tags: item.tags,
            domain: item.domain,
        })),
    };
}

export function adaptGetResult(memory: Memory | null, id: string): Memory | null {
    // Memory provider returns Memory, tool expects Memory
    // Just pass through, ensuring type compatibility
    return memory;
}

/**
 * Type guard to check if provider has analysis capability
 */
export function hasAnalysis(
    provider: LocalMemoryProvider | RemoteMemoryProvider
): provider is LocalMemoryProvider & { analysis: (input: unknown) => Promise<unknown> } {
    return 'analysis' in provider && typeof (provider as any).analysis === 'function';
}

/**
 * Type guard to check if provider has relationships capability
 */
export function hasRelationships(
    provider: LocalMemoryProvider | RemoteMemoryProvider
): provider is LocalMemoryProvider & { relationships: (input: unknown) => Promise<unknown> } {
    return 'relationships' in provider && typeof (provider as any).relationships === 'function';
}

/**
 * Type guard to check if provider has stats capability
 */
export function hasStats(
    provider: LocalMemoryProvider | RemoteMemoryProvider
): provider is LocalMemoryProvider & { stats: (input: unknown) => Promise<unknown> } {
    return 'stats' in provider && typeof (provider as any).stats === 'function';
}
