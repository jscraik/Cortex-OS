/**
 * MCP Tool definitions for the memories package.
 * These tools expose high-level memory operations (set, get, list, delete, search)
 * that wrap the core MemoryService functionality.
 */

import { z } from 'zod';
import type { Memory } from '../domain/types.js';
import type { MemoryService } from '../service/memory-service.js';
import { memoryZ } from '../schemas/memory.zod.js';

export interface MemoryTool {
        name: string;
        description: string;
        inputSchema: z.ZodTypeAny;
        handler: (
                params: unknown,
        ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

export interface MemoryToolDeps {
        service: Pick<MemoryService, 'save' | 'get' | 'del' | 'search' | 'list'>;
        now?: () => Date;
        idFactory?: () => string;
}

const provenanceSchema = z.object({
        source: z.enum(['user', 'agent', 'system']).default('agent'),
        actor: z.string().optional(),
        evidence: z
                .array(
                        z.object({
                                uri: z.string(),
                                range: z.tuple([z.number(), z.number()]).optional(),
                        }),
                )
                .optional(),
        hash: z.string().optional(),
});

const policySchema = z.object({
        pii: z.boolean().optional(),
        scope: z.enum(['session', 'user', 'org']).optional(),
        requiresConsent: z.boolean().optional(),
});

export const memorySetToolSchema = z
        .object({
                id: z.string().optional(),
                kind: z.enum(['note', 'event', 'artifact', 'embedding']).default('note'),
                text: z.string().optional(),
                vector: z.array(z.number()).min(1).optional(),
                tags: z.array(z.string()).default([]),
                ttl: z.string().optional(),
                createdAt: z.string().optional(),
                updatedAt: z.string().optional(),
                provenance: provenanceSchema.default({ source: 'agent' }),
                policy: policySchema.optional(),
                embeddingModel: z.string().optional(),
        })
        .superRefine((value, ctx) => {
                if (!value.text && (!value.vector || value.vector.length === 0)) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Provide text or vector content to store a memory',
                                path: ['text'],
                        });
                }
        });

export const memoryGetToolSchema = z.object({
        id: z.string().min(1, 'Memory id is required'),
});

export const memoryDeleteToolSchema = z.object({
        id: z.string().min(1, 'Memory id is required'),
});

export const memoryListToolSchema = z.object({
        limit: z.number().int().positive().max(100).default(20),
        tags: z.array(z.string()).optional(),
        text: z.string().optional(),
});

export const memorySearchToolSchema = z
        .object({
                text: z.string().min(1).optional(),
                vector: z.array(z.number()).min(1).optional(),
                topK: z.number().int().positive().max(100).default(8),
                tags: z.array(z.string()).optional(),
        })
        .refine((input) => input.text || input.vector, {
                message: 'Provide either text or vector search criteria',
        });

const toContent = (payload: unknown) => ({
        content: [
                {
                        type: 'text' as const,
                        text: JSON.stringify(payload),
                },
        ],
});

const defaultIdFactory = () => `mem-${Date.now()}`;
const defaultNow = () => new Date();

function buildMemory(input: z.infer<typeof memorySetToolSchema>, deps: MemoryToolDeps): Memory {
        const now = (deps.now ?? defaultNow)();
        const id = input.id ?? (deps.idFactory ?? defaultIdFactory)();
        const createdAt = input.createdAt ?? now.toISOString();
        const updatedAt = input.updatedAt ?? now.toISOString();
        return memoryZ.parse({
                id,
                kind: input.kind,
                text: input.text,
                vector: input.vector,
                tags: input.tags,
                ttl: input.ttl,
                createdAt,
                updatedAt,
                provenance: input.provenance,
                policy: input.policy,
                embeddingModel: input.embeddingModel,
        });
}

function createMemorySetTool(deps: MemoryToolDeps): MemoryTool {
        return {
                name: 'memory_set',
                description: 'Store or update a memory entry',
                inputSchema: memorySetToolSchema,
                handler: async (params: unknown) => {
                        const input = memorySetToolSchema.parse(params);
                        const memory = buildMemory(input, deps);
                        const saved = await deps.service.save(memory);
                        return toContent({
                                status: saved.status ?? 'stored',
                                memory: saved,
                        });
                },
        };
}

function createMemoryGetTool(deps: MemoryToolDeps): MemoryTool {
        return {
                name: 'memory_get',
                description: 'Retrieve a memory entry by identifier',
                inputSchema: memoryGetToolSchema,
                handler: async (params: unknown) => {
                        const { id } = memoryGetToolSchema.parse(params);
                        const memory = await deps.service.get(id);
                        if (!memory) {
                                return toContent({ found: false, id });
                        }
                        return toContent({ found: true, memory });
                },
        };
}

function createMemoryDeleteTool(deps: MemoryToolDeps): MemoryTool {
        return {
                name: 'memory_delete',
                description: 'Delete a memory entry by identifier',
                inputSchema: memoryDeleteToolSchema,
                handler: async (params: unknown) => {
                        const { id } = memoryDeleteToolSchema.parse(params);
                        await deps.service.del(id);
                        return toContent({ id, deleted: true });
                },
        };
}

function createMemoryListTool(deps: MemoryToolDeps): MemoryTool {
        return {
                name: 'memory_list',
                description: 'List stored memories with optional filtering',
                inputSchema: memoryListToolSchema,
                handler: async (params: unknown) => {
                        const input = memoryListToolSchema.parse(params);
                        const results = await deps.service.list({
                                limit: input.limit,
                                tags: input.tags,
                                text: input.text,
                        });
                        return toContent({
                                count: results.length,
                                results,
                                query: {
                                        limit: input.limit,
                                        tags: input.tags,
                                        text: input.text,
                                },
                        });
                },
        };
}

function createMemorySearchTool(deps: MemoryToolDeps): MemoryTool {
        return {
                name: 'memory_search',
                description: 'Search memories by text or vector similarity',
                inputSchema: memorySearchToolSchema,
                handler: async (params: unknown) => {
                        const input = memorySearchToolSchema.parse(params);
                        const results = await deps.service.search({
                                text: input.text,
                                vector: input.vector,
                                topK: input.topK,
                                tags: input.tags,
                        });
                        return toContent({
                                count: results.length,
                                results,
                                query: {
                                        text: input.text,
                                        vector: input.vector,
                                        topK: input.topK,
                                        tags: input.tags,
                                },
                        });
                },
        };
}

export interface MemoryMcpToolset {
        set: MemoryTool;
        get: MemoryTool;
        delete: MemoryTool;
        list: MemoryTool;
        search: MemoryTool;
        tools: MemoryTool[];
}

export const createMemoryMcpTools = (deps: MemoryToolDeps): MemoryMcpToolset => {
        const set = createMemorySetTool(deps);
        const get = createMemoryGetTool(deps);
        const del = createMemoryDeleteTool(deps);
        const list = createMemoryListTool(deps);
        const search = createMemorySearchTool(deps);
        return {
                set,
                get,
                delete: del,
                list,
                search,
                tools: [set, get, del, list, search],
        };
};

export const memoryMcpTools = (deps: MemoryToolDeps): MemoryTool[] =>
        createMemoryMcpTools(deps).tools;
