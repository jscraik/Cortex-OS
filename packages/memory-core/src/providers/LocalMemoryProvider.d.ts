import type { DeleteMemoryInput, DeleteMemoryResult, GetMemoryInput, GetMemoryResult, HealthStatus, MemoryProvider, SearchMemoryInput, SearchMemoryResult, StoreMemoryInput, StoreMemoryResult } from '../provider/MemoryProvider.js';
import type { MemoryCoreConfig } from '../types.js';
export interface LocalMemoryProviderOptions {
    /** Maximum number of records to retain in memory. */
    maxRecords?: number;
    maxLimit?: number;
}
/**
 * Lightweight in-memory implementation of the memory provider interface.
 *
 * The previous implementation depended on a large number of unfinished integrations
 * (Prisma models, Qdrant clients, Pieces adapters, bespoke loggers, etc.). None of
 * those modules exist in the current workspace, which meant the TypeScript compiler
 * could not resolve dozens of imports and the provider class surfaced nearly one
 * hundred type errors.  To unblock development we provide a pragmatic in-memory
 * implementation that satisfies the exported API surface without pulling in the
 * missing dependencies.  The class focuses on deterministic, easily testable
 * behaviour while keeping the public contract identical to the original file.
 */
export declare class LocalMemoryProvider implements MemoryProvider {
    private readonly records;
    private readonly maxRecords;
    constructor(options?: LocalMemoryProviderOptions | Partial<MemoryCoreConfig>);
    store(input: StoreMemoryInput): Promise<StoreMemoryResult>;
    search(input: SearchMemoryInput): Promise<SearchMemoryResult>;
    get(input: GetMemoryInput): Promise<GetMemoryResult>;
    remove(input: DeleteMemoryInput): Promise<DeleteMemoryResult>;
    health(): Promise<HealthStatus>;
}
