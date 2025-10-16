export type StoreMemoryInput = {
        id?: string;
        /** Legacy field used by the simplified in-memory provider. */
        text?: string;
        /** Primary content body accepted by the refactored provider. */
        content?: string;
        tags?: string[];
        /** Optional domain used for isolation and provenance. */
        domain?: string;
        /** Optional importance score for ranking. */
        importance?: number;
        /** Deprecated metadata alias retained for backwards compatibility. */
        meta?: Record<string, unknown>;
        /** Preferred metadata bag for the modern APIs. */
        metadata?: Record<string, unknown> & {
                tenant?: string;
                labels?: string[];
                sourceUri?: string;
        };
};
export type StoreMemoryResult = { id: string; createdAt: string; vectorIndexed?: boolean };
export type SearchMemoryInput = {
        query: string;
        topK?: number;
        filterTags?: string[];
        /** Advanced search payload properties supported by the hardened provider. */
        search_type?: 'semantic' | 'keyword' | 'hybrid';
        limit?: number;
        offset?: number;
        score_threshold?: number;
        hybrid_weight?: number;
        /** Security filters */
        domain?: string;
        tenant?: string;
        labels?: string[];
        metadata?: Record<string, unknown> & {
                tenant?: string;
                labels?: string[];
        };
        tags?: string[];
};
export type SearchMemoryResult = {
        hits: Array<{ id: string; text: string; score: number; source: 'local' | 'pieces' }>;
        tookMs: number;
};
export type GetMemoryInput = { id: string };
export type GetMemoryResult = {
        id: string;
        text: string;
        tags: string[];
        meta?: Record<string, unknown>;
};
export type DeleteMemoryInput = { id: string };
export type DeleteMemoryResult = { id: string; deleted: boolean };
export type HealthStatus = { brand: 'brAInwav'; ok: true; details?: Record<string, unknown> };

export interface MemoryProvider {
        store(input: StoreMemoryInput, signal?: AbortSignal): Promise<StoreMemoryResult>;
        search(input: SearchMemoryInput, signal?: AbortSignal): Promise<SearchMemoryResult>;
        get(input: GetMemoryInput, signal?: AbortSignal): Promise<GetMemoryResult>;
        remove(input: DeleteMemoryInput, signal?: AbortSignal): Promise<DeleteMemoryResult>;
        health(): Promise<HealthStatus>;
}
