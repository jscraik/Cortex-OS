import { describe, expect, beforeEach, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { MemoryService } from '../src/service/memory-service.js';
import { createMemoryService } from '../src/service/memory-service.js';
import { LocalEmbedder } from './util/local-embedder.js';
import {
        createMemoryMcpTools,
        memoryDeleteToolSchema,
        memoryGetToolSchema,
        memoryListToolSchema,
        memorySearchToolSchema,
        memorySetToolSchema,
        type MemoryMcpToolset,
} from '../src/mcp/tools.js';

function parseContent(result: Awaited<ReturnType<MemoryMcpToolset['set']['handler']>>) {
        const payload = result.content.at(0);
        if (!payload) {
                throw new Error('Tool did not return any content');
        }
        return JSON.parse(payload.text);
}

describe('memories MCP tools', () => {
        let store: InMemoryStore;
        let service: MemoryService;
        let tools: MemoryMcpToolset;
        const fixedNow = new Date('2025-01-01T00:00:00.000Z');
        let idCounter: number;

        beforeEach(() => {
                store = new InMemoryStore();
                service = createMemoryService(store, new LocalEmbedder());
                idCounter = 0;
                tools = createMemoryMcpTools({
                        service,
                        now: () => fixedNow,
                        idFactory: () => `mem-${++idCounter}`,
                });
        });

        it('validates schemas for each tool', () => {
                expect(memorySetToolSchema.safeParse({
                        kind: 'note',
                        text: 'remember the milk',
                        provenance: { source: 'user' },
                }).success).toBe(true);

                expect(memoryGetToolSchema.safeParse({ id: 'mem-123' }).success).toBe(true);
                expect(memoryDeleteToolSchema.safeParse({ id: 'mem-456' }).success).toBe(true);
                expect(memoryListToolSchema.safeParse({ limit: 5 }).success).toBe(true);
                expect(memorySearchToolSchema.safeParse({ text: 'query' }).success).toBe(true);
        });

        it('stores a memory entry with generated identifiers', async () => {
                const result = await tools.set.handler({
                        kind: 'note',
                        text: 'remember the milk',
                        tags: ['personal'],
                        provenance: { source: 'user', actor: 'jamie' },
                });

                const payload = parseContent(result);
                expect(payload.status).toBe('approved');
                expect(payload.memory.id).toBe('mem-1');
                expect(payload.memory.createdAt).toBe(fixedNow.toISOString());
                expect(payload.memory.updatedAt).toBe(fixedNow.toISOString());

                const stored = await store.get('mem-1');
                expect(stored?.text).toBe('remember the milk');
                expect(stored?.tags).toEqual(['personal']);
        });

        it('retrieves a stored memory by identifier', async () => {
                await tools.set.handler({
                        id: 'mem-custom',
                        kind: 'note',
                        text: 'existing memory',
                        tags: ['test'],
                        provenance: { source: 'agent' },
                });

                const result = await tools.get.handler({ id: 'mem-custom' });
                const payload = parseContent(result);

                expect(payload.found).toBe(true);
                expect(payload.memory.id).toBe('mem-custom');
                expect(payload.memory.tags).toEqual(['test']);
        });

        it('returns not found when retrieving missing memory', async () => {
                const result = await tools.get.handler({ id: 'missing' });
                const payload = parseContent(result);

                expect(payload.found).toBe(false);
                expect(payload.id).toBe('missing');
        });

        it('deletes a memory entry and confirms removal', async () => {
                await tools.set.handler({
                        id: 'mem-delete',
                        kind: 'note',
                        text: 'to be removed',
                        provenance: { source: 'system' },
                });

                const result = await tools.delete.handler({ id: 'mem-delete' });
                const payload = parseContent(result);

                expect(payload.deleted).toBe(true);
                expect(payload.id).toBe('mem-delete');
                expect(await store.get('mem-delete')).toBeNull();
        });

        it('lists memories with limit and tag filtering', async () => {
                await tools.set.handler({
                        id: 'mem-1',
                        kind: 'note',
                        text: 'first entry',
                        tags: ['inbox'],
                        provenance: { source: 'user' },
                });
                await tools.set.handler({
                        id: 'mem-2',
                        kind: 'note',
                        text: 'second entry',
                        tags: ['inbox', 'work'],
                        provenance: { source: 'user' },
                });
                await tools.set.handler({
                        id: 'mem-3',
                        kind: 'note',
                        text: 'third entry',
                        tags: ['archive'],
                        provenance: { source: 'user' },
                });

                const result = await tools.list.handler({ limit: 2, tags: ['inbox'] });
                const payload = parseContent(result);

                expect(payload.count).toBe(2);
                expect(payload.results.map((m: any) => m.id)).toEqual(['mem-1', 'mem-2']);
        });

        it('searches memories by text relevance', async () => {
                await tools.set.handler({
                        id: 'mem-a',
                        kind: 'note',
                        text: 'schedule dentist appointment',
                        tags: ['health'],
                        provenance: { source: 'user' },
                });
                await tools.set.handler({
                        id: 'mem-b',
                        kind: 'note',
                        text: 'buy groceries for dinner',
                        tags: ['personal'],
                        provenance: { source: 'user' },
                });

                const result = await tools.search.handler({ text: 'groceries', topK: 1 });
                const payload = parseContent(result);

                expect(payload.count).toBe(1);
                expect(payload.results[0].id).toBe('mem-b');
                expect(payload.query.text).toBe('groceries');
        });

        it('rejects search requests without criteria', async () => {
                await expect(() => tools.search.handler({})).rejects.toThrow(
                        /Provide either text or vector search criteria/,
                );
        });
});
