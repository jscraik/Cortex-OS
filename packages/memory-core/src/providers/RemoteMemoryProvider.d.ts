import type { DeleteMemoryInput, DeleteMemoryResult, GetMemoryInput, GetMemoryResult, HealthStatus, MemoryProvider, SearchMemoryInput, SearchMemoryResult, StoreMemoryInput, StoreMemoryResult } from '../provider/MemoryProvider.js';
export interface RemoteMemoryProviderOptions {
    baseUrl: string;
    apiKey?: string;
    fetchImpl?: typeof fetch;
}
/**
 * Minimal remote provider that talks to a JSON HTTP service when available and
 * gracefully falls back to the in-memory implementation when the network layer
 * is unavailable.  This keeps the public API surface stable without taking a
 * dependency on the unfinished gateway utilities from the original code.
 */
export declare class RemoteMemoryProvider implements MemoryProvider {
    private readonly baseUrl?;
    private readonly apiKey?;
    private readonly fetchImpl?;
    private readonly fallback;
    constructor(options: RemoteMemoryProviderOptions);
    private request;
    store(input: StoreMemoryInput): Promise<StoreMemoryResult>;
    search(input: SearchMemoryInput): Promise<SearchMemoryResult>;
    get(input: GetMemoryInput): Promise<GetMemoryResult>;
    remove(input: DeleteMemoryInput): Promise<DeleteMemoryResult>;
    health(): Promise<HealthStatus>;
}
