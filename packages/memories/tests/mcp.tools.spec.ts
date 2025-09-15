
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import {
        memoryDeleteTool,
        memoryGetTool,
        memoryListTool,
        memorySearchTool,
        memorySetTool,
        resetMemoryServiceFactory,
        setMemoryServiceFactory,
} from '../src/mcp/tools.js';
import { createMemoryService } from '../src/service/memory-service.js';
import { LocalEmbedder } from './util/local-embedder.js';

const storedSchema = z.object({
        status: z.literal('stored'),
        memory: z.object({ id: z.string(), tags: z.array(z.string()).optional() }).passthrough(),
});

const getSchema = z.discriminatedUnion('found', [
        z.object({ found: z.literal(false), id: z.string() }),
        z.object({
                found: z.literal(true),
                memory: z.object({ id: z.string(), tags: z.array(z.string()).optional() }).passthrough(),
        }),
]);

const listSchema = z.object({
        memories: z.array(
                z.object({ id: z.string(), tags: z.array(z.string()).default([]) }).passthrough(),
        ),
});

const searchSchema = z.object({
        query: z.object({
                text: z.string().nullable().optional(),
                vector: z.number().optional(),
                tags: z.array(z.string()),
        }),
        results: z.array(
                z.object({ id: z.string(), tags: z.array(z.string()).default([]) }).passthrough(),
        ),
});

type ToolResult = Awaited<ReturnType<typeof memorySetTool.handler>>;

function extractPayload(result: ToolResult): unknown {
        const payload = result.content[0]?.text ?? '{}';
        return JSON.parse(payload) as unknown;
}

describe('memory MCP tools', () => {
        beforeEach(() => {
                const service = createMemoryService(new InMemoryStore(), new LocalEmbedder());
                setMemoryServiceFactory(() => Promise.resolve(service));
        });

        afterEach(() => {
                resetMemoryServiceFactory();
        });

        it('stores memory entries via set tool', async () => {
                const now = new Date().toISOString();
                const res = await memorySetTool.handler({
                        id: 'mem-1',
                        kind: 'note',
                        text: 'remember the milk',
                        tags: ['todo'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });

                const payload = storedSchema.parse(extractPayload(res));
                expect(payload.status).toBe('stored');
                expect(payload.memory.id).toBe('mem-1');
        });

        it('retrieves memory entries by id', async () => {
                const now = new Date().toISOString();
                await memorySetTool.handler({
                        id: 'mem-2',
                        kind: 'note',
                        text: 'project alpha kickoff',
                        tags: ['project'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });

                const res = await memoryGetTool.handler({ id: 'mem-2' });
                const payload = getSchema.parse(extractPayload(res));
                expect(payload.found).toBe(true);
                if (payload.found) {
                        expect(payload.memory.id).toBe('mem-2');
                }

                const missing = await memoryGetTool.handler({ id: 'missing' });
                expect(getSchema.parse(extractPayload(missing))).toEqual({ found: false, id: 'missing' });
        });

        it('deletes memory entries', async () => {
                const now = new Date().toISOString();
                await memorySetTool.handler({
                        id: 'mem-3',
                        kind: 'note',
                        text: 'remove me',
                        tags: ['cleanup'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });

                const res = await memoryDeleteTool.handler({ id: 'mem-3' });
                const payload = z
                        .object({ deleted: z.literal(true), id: z.string() })
                        .parse(extractPayload(res));
                expect(payload).toEqual({ deleted: true, id: 'mem-3' });

                const after = await memoryGetTool.handler({ id: 'mem-3' });
                expect(getSchema.parse(extractPayload(after))).toEqual({ found: false, id: 'mem-3' });
        });

        it('lists memories with optional filters', async () => {
                const now = new Date().toISOString();
                await memorySetTool.handler({
                        id: 'mem-4',
                        kind: 'note',
                        text: 'alpha project status',
                        tags: ['project'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });
                await memorySetTool.handler({
                        id: 'mem-5',
                        kind: 'event',
                        text: 'beta launch scheduled',
                        tags: ['launch'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });

                const listRes = await memoryListTool.handler({ limit: 5 });
                const listPayload = listSchema.parse(extractPayload(listRes));
                expect(Array.isArray(listPayload.memories)).toBe(true);
                expect(listPayload.memories.length).toBeGreaterThanOrEqual(2);

                const filtered = await memoryListTool.handler({ tags: ['project'] });
                const filteredPayload = listSchema.parse(extractPayload(filtered));
                expect(filteredPayload.memories).toHaveLength(1);
                expect(filteredPayload.memories[0]?.id).toBe('mem-4');
        });

        it('searches memories by text or vector', async () => {
                const now = new Date().toISOString();
                const stored = await memorySetTool.handler({
                        id: 'mem-6',
                        kind: 'note',
                        text: 'vector aware memory',
                        tags: ['ml'],
                        createdAt: now,
                        updatedAt: now,
                        provenance: { source: 'agent' },
                });
                const storedPayload = storedSchema.parse(extractPayload(stored));

                const textRes = await memorySearchTool.handler({ text: 'vector', topK: 5 });
                const textPayload = searchSchema.parse(extractPayload(textRes));
                expect(textPayload.results.some((m) => m.id === 'mem-6')).toBe(true);

                const vectorRes = await memorySearchTool.handler({
                        vector: storedPayload.memory.vector,
                        topK: 1,
                });
                const vectorPayload = searchSchema.parse(extractPayload(vectorRes));
                expect(vectorPayload.results[0]?.id).toBe('mem-6');

                await expect(memorySearchTool.handler({} as unknown)).rejects.toThrow(
                        /text or vector/i,

                );
        });
});
