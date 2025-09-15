
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Memory } from '../domain/types.js';
import { createStoreFromEnv } from '../config/store-from-env.js';
import { memoryZ } from '../schemas/memory.zod.js';
import { createEmbedderFromEnv } from '../service/embedder-factory.js';
import { createMemoryService, type MemoryService } from '../service/memory-service.js';

interface MemoryTool {
        name: string;
        description: string;
        inputSchema: z.ZodSchema;
        handler: (
                params: unknown,
        ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

type ToolResponse = { content: Array<{ type: 'text'; text: string }> };

const formatResponse = (data: unknown): ToolResponse => ({
        content: [{ type: 'text', text: JSON.stringify(data) }],
});

let defaultServicePromise: Promise<MemoryService> | null = null;
const defaultFactory = async () => {
        if (!defaultServicePromise) {
                defaultServicePromise = (async () => {
                        const store = await createStoreFromEnv();
                        const embedder = createEmbedderFromEnv();
                        return createMemoryService(store, embedder);
                })();
        }
        return defaultServicePromise;
};

let activeFactory: () => Promise<MemoryService> = defaultFactory;
let cachedServicePromise: Promise<MemoryService> | null = null;

export const setMemoryServiceFactory = (factory: () => Promise<MemoryService>) => {
        activeFactory = factory;
        cachedServicePromise = null;
};

export const resetMemoryServiceFactory = () => {
        activeFactory = defaultFactory;
        cachedServicePromise = null;
};

async function getMemoryService(): Promise<MemoryService> {
        if (!cachedServicePromise) {
                        cachedServicePromise = activeFactory();
        }
        return cachedServicePromise;
}

const evidenceSchema = z.object({
        uri: z.string(),
        range: z.tuple([z.number(), z.number()]).optional(),
});

const provenanceSchema = z
        .object({
                source: z.enum(['user', 'agent', 'system']).default('agent'),
                actor: z.string().optional(),
                evidence: z.array(evidenceSchema).optional(),
                hash: z.string().optional(),
        })
        .default({ source: 'agent' });

const policySchema = z
        .object({
                pii: z.boolean().optional(),
                scope: z.enum(['session', 'user', 'org']).optional(),
                requiresConsent: z.boolean().optional(),
        })
        .optional();

export const memorySetToolSchema = z.object({
        id: z.string().optional(),
        kind: z.enum(['note', 'event', 'artifact', 'embedding']).default('note'),
        text: z.string().optional(),
        vector: z.array(z.number()).optional(),
        tags: z.array(z.string()).default([]),
        ttl: z.string().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        provenance: provenanceSchema,
        policy: policySchema,
        embeddingModel: z.string().optional(),
});

export const memoryGetToolSchema = z.object({
        id: z.string().min(1, 'id is required'),
});

export const memoryDeleteToolSchema = z.object({
        id: z.string().min(1, 'id is required'),

});

export const memoryListToolSchema = z.object({
        limit: z.number().int().positive().max(100).default(20),

        tags: z.array(z.string()).default([]),
        kind: z.enum(['note', 'event', 'artifact', 'embedding']).optional(),
        includePending: z.boolean().default(false),

});

export const memorySearchToolSchema = z
        .object({
                text: z.string().min(1).optional(),

                vector: z.array(z.number()).nonempty().optional(),
                topK: z.number().int().positive().max(100).default(8),
                tags: z.array(z.string()).default([]),
        })
        .refine((value) => value.text || value.vector, {
                message: 'text or vector is required',
                path: ['text'],
        });

export const memorySetTool: MemoryTool = {
        name: 'memory_set',
        description: 'Create or update a memory entry',
        inputSchema: memorySetToolSchema,
        handler: async (params: unknown) => {
                const input = memorySetToolSchema.parse(params);
                const service = await getMemoryService();
                const now = new Date().toISOString();
                const payload: Memory = memoryZ.parse({
                        id: input.id ?? randomUUID(),
                        kind: input.kind,
                        text: input.text,
                        vector: input.vector,
                        tags: input.tags,
                        ttl: input.ttl,
                        createdAt: input.createdAt ?? now,
                        updatedAt: input.updatedAt ?? now,
                        provenance: input.provenance,
                        policy: input.policy,
                        embeddingModel: input.embeddingModel,
                });

                const saved = await service.save(payload);
                return formatResponse({ status: 'stored', memory: saved });
        },
};

export const memoryGetTool: MemoryTool = {
        name: 'memory_get',
        description: 'Retrieve a memory entry by identifier',
        inputSchema: memoryGetToolSchema,
        handler: async (params: unknown) => {
                const { id } = memoryGetToolSchema.parse(params);
                const service = await getMemoryService();
                const memory = await service.get(id);
                if (!memory) {
                        return formatResponse({ found: false, id });
                }
                return formatResponse({ found: true, memory });
        },
};

export const memoryDeleteTool: MemoryTool = {
        name: 'memory_delete',
        description: 'Delete a memory entry',
        inputSchema: memoryDeleteToolSchema,
        handler: async (params: unknown) => {
                const { id } = memoryDeleteToolSchema.parse(params);
                const service = await getMemoryService();
                await service.del(id);
                return formatResponse({ deleted: true, id });
        },
};

export const memoryListTool: MemoryTool = {
        name: 'memory_list',
        description: 'List stored memories with optional filters',
        inputSchema: memoryListToolSchema,
        handler: async (params: unknown) => {
                const { limit, tags, kind, includePending } = memoryListToolSchema.parse(params);
                const service = await getMemoryService();
                const baseResults = await service.search({
                        text: '',
                        topK: limit,
                        tags: tags.length ? tags : undefined,
                });

                let memories = kind ? baseResults.filter((m) => m.kind === kind) : baseResults;

                if (includePending && service.listPending) {
                        const pending = await service.listPending();
                        const filteredPending = kind ? pending.filter((m) => m.kind === kind) : pending;
                        const remaining = Math.max(limit - memories.length, 0);
                        if (remaining > 0) {
                                memories = memories.concat(filteredPending.slice(0, remaining));
                        }
                }

                return formatResponse({ memories: memories.slice(0, limit) });
        },
};

export const memorySearchTool: MemoryTool = {
        name: 'memory_search',
        description: 'Search memories by text or embedding vector',
        inputSchema: memorySearchToolSchema,
        handler: async (params: unknown) => {
                const { text, vector, topK, tags } = memorySearchToolSchema.parse(params);
                const service = await getMemoryService();
                const results = await service.search({
                        text: text ?? undefined,
                        vector: vector ?? undefined,
                        topK,
                        tags: tags.length ? tags : undefined,
                });

                return formatResponse({
                        query: { text, vector: vector ? vector.length : undefined, tags },
                        results,
                });
        },
};

export const memoryMcpTools: MemoryTool[] = [
        memorySetTool,
        memoryGetTool,
        memoryDeleteTool,
        memoryListTool,
        memorySearchTool,
];

