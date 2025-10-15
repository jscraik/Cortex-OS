import type { GetMemoryResult, MemoryProvider, SearchMemoryResult, StoreMemoryResult } from '@cortex-os/memory-core';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

const DEFAULT_PROVENANCE: Memory['provenance'] = { source: 'system' };

type ProviderMeta = Record<string, unknown> | undefined;

function ensureTimestamp(value?: unknown, fallback?: string): string {
        if (typeof value === 'string' && value.trim().length > 0) {
                return value;
        }
        return fallback ?? new Date().toISOString();
}

function serialiseMeta(memory: Memory): Record<string, unknown> {
        return {
                kind: memory.kind,
                ttl: memory.ttl,
                provenance: memory.provenance,
                metadata: memory.metadata,
                embeddingModel: memory.embeddingModel,
                vector: memory.vector,
                createdAt: memory.createdAt,
                updatedAt: memory.updatedAt,
        } satisfies Record<string, unknown>;
}

function resolveKind(meta: ProviderMeta): Memory['kind'] {
        const value = meta?.kind;
        if (value === 'note' || value === 'event' || value === 'artifact' || value === 'embedding') {
                return value;
        }
        return 'note';
}

function resolveProvenance(meta: ProviderMeta): Memory['provenance'] {
        const provenance = meta?.provenance;
        if (
                provenance &&
                typeof provenance === 'object' &&
                provenance !== null &&
                'source' in provenance &&
                (provenance as Memory['provenance']).source
        ) {
                return provenance as Memory['provenance'];
        }
        return DEFAULT_PROVENANCE;
}

function resolveVector(meta: ProviderMeta): number[] | undefined {
        const vector = meta?.vector;
        if (Array.isArray(vector) && vector.every((value) => typeof value === 'number')) {
                return vector as number[];
        }
        return undefined;
}

function hydrateMemory(
        result: GetMemoryResult,
        meta: ProviderMeta,
        overrides: Partial<Memory> = {},
): Memory {
        const createdAt = ensureTimestamp(meta?.createdAt, overrides.createdAt);
        const updatedAt = ensureTimestamp(meta?.updatedAt, createdAt);

        return {
                id: result.id,
                kind: resolveKind(meta),
                text: result.text,
                tags: Array.isArray(result.tags) ? result.tags : [],
                createdAt,
                updatedAt,
                provenance: resolveProvenance(meta),
                metadata: (meta?.metadata as Record<string, unknown> | undefined) ?? overrides.metadata,
                ttl: typeof meta?.ttl === 'string' ? (meta.ttl as string) : overrides.ttl,
                embeddingModel:
                        typeof meta?.embeddingModel === 'string'
                                ? (meta.embeddingModel as string)
                                : overrides.embeddingModel,
                vector: resolveVector(meta) ?? overrides.vector,
                content: overrides.content,
                contentType: overrides.contentType,
                contentSize: overrides.contentSize,
        } satisfies Memory;
}

export class MemoryProviderStore implements MemoryStore {
        constructor(private readonly provider: MemoryProvider) {}

        async upsert(memory: Memory, _namespace?: string): Promise<Memory> {
                const createdAt = ensureTimestamp(memory.createdAt);
                const updatedAt = ensureTimestamp(memory.updatedAt, createdAt);
                const payload = {
                        id: memory.id,
                        text: memory.text ?? '',
                        tags: memory.tags,
                        meta: serialiseMeta({ ...memory, createdAt, updatedAt }),
                } satisfies Parameters<MemoryProvider['store']>[0];

                let result: StoreMemoryResult;
                try {
                        result = await this.provider.store(payload);
                } catch (error) {
                        throw new Error(
                                `Failed to persist memory ${memory.id ?? ''}: ${
                                        error instanceof Error ? error.message : String(error)
                                }`,
                        );
                }

                return {
                        ...memory,
                        id: result.id,
                        createdAt: ensureTimestamp(memory.createdAt, result.createdAt),
                        updatedAt: ensureTimestamp(memory.updatedAt, result.createdAt),
                } satisfies Memory;
        }

        async get(id: string, _namespace?: string): Promise<Memory | null> {
                try {
                        const result = await this.provider.get({ id });
                        return hydrateMemory(result, result.meta ?? {});
                } catch (error) {
                        if (error instanceof Error && /not found/i.test(error.message)) {
                                return null;
                        }
                        throw error;
                }
        }

        async delete(id: string, _namespace?: string): Promise<void> {
                try {
                        await this.provider.remove({ id });
                } catch (error) {
                        throw new Error(
                                `Failed to delete memory ${id}: ${error instanceof Error ? error.message : String(error)}`,
                        );
                }
        }

        async searchByText(query: TextQuery, _namespace?: string): Promise<Memory[]> {
                const result: SearchMemoryResult = await this.provider.search({
                        query: query.text,
                        topK: query.topK,
                        filterTags: query.filterTags,
                });

                const memories = await Promise.all(
                        result.hits.map(async (hit) => {
                                try {
                                        const record = await this.provider.get({ id: hit.id });
                                        return hydrateMemory(record, record.meta ?? {}, {
                                                metadata: {
                                                        ...(record.meta as Record<string, unknown> | undefined)?.metadata,
                                                        score: hit.score,
                                                        source: hit.source,
                                                },
                                        });
                                } catch {
                                        const now = new Date().toISOString();
                                        return {
                                                id: hit.id,
                                                kind: 'note',
                                                text: hit.text,
                                                tags: query.filterTags ?? [],
                                                createdAt: now,
                                                updatedAt: now,
                                                provenance: DEFAULT_PROVENANCE,
                                                metadata: { score: hit.score, source: hit.source },
                                        } satisfies Memory;
                                }
                        }),
                );

                return memories;
        }

        async searchByVector(query: VectorQuery, _namespace?: string): Promise<(Memory & { score: number })[]> {
                if (query.queryText) {
                        const textResults = await this.searchByText(
                                {
                                        text: query.queryText,
                                        topK: query.topK,
                                        filterTags: query.filterTags,
                                },
                                _namespace,
                        );
                        return textResults.map((memory) => ({ ...memory, score: (memory.metadata as any)?.score ?? 0 }));
                }
                return [];
        }

        /**
         * No-op: The underlying Provider API does not currently expose purge semantics,
         * so this method does not actually remove any expired items and always returns 0.
         * Callers should NOT rely on this method to perform any cleanup or memory management.
         * Relying on this no-op may lead to memory leaks or unexpected behavior if expired items accumulate.
         */
        async purgeExpired(_nowISO: string, _namespace?: string): Promise<number> {
                return 0;
        }

        async list(_namespace?: string, _limit?: number, _offset?: number): Promise<Memory[]> {
                // Provider API does not currently expose a list endpoint.
                // Returning an empty array here may break pagination or cause unexpected behavior
                // for callers expecting actual data. Callers should be aware that listing is not supported
                // and handle this case appropriately.
                return [];
        }

        // Helper for tests to inspect provider interactions
        getProvider(): MemoryProvider {
                return this.provider;
        }
}

export function createProviderStore(provider: MemoryProvider): MemoryStore {
        return new MemoryProviderStore(provider);
}
