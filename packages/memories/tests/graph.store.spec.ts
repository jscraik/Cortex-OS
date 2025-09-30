import { beforeEach, describe, expect, it } from 'vitest';
import { GraphMemoryStore } from '../src/adapters/store.graph.js';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';

function nowISO() {
    return new Date().toISOString();
}

function makeMemory(id: string, now = nowISO(), tags: string[] = ['test']): Memory {
    return {
        id,
        kind: 'note',
        text: `memory-${id}`,
        tags,
        createdAt: now,
        updatedAt: now,
        provenance: { source: 'user' },
    };
}

describe('GraphMemoryStore (helpers & graph algorithms)', () => {
    let backing: InMemoryStore;
    let store: GraphMemoryStore;

    beforeEach(() => {
        backing = new InMemoryStore();
        store = new GraphMemoryStore(backing);
    });

    it('creates relationships and returns them via getRelationships', async () => {
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));

        const rel = await store.createRelationship('A', 'B', 'connected', { weight: 2 });

        const aRels = await store.getRelationships('A');
        expect(aRels.length).toBe(1);
        expect(aRels[0].from).toBe('A');
        expect(aRels[0].to).toBe('B');
        expect(aRels[0].type).toBe('connected');
        const aWeight = aRels[0].metadata && (aRels[0].metadata as Record<string, unknown>)['weight'];
        expect(aWeight).toBe(2);

        // Relationship shape from createRelationship
        expect(rel.id).toBeDefined();
    });

    it('traverse finds connected nodes (BFS)', async () => {
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));
        await backing.upsert(makeMemory('C'));

        await store.createRelationship('A', 'B', 'edge');
        await store.createRelationship('B', 'C', 'edge');

        const nodes = await store.traverse('A');
        const ids = nodes.map((n) => n.id).sort();
        expect(ids).toEqual(['A', 'B', 'C']);
    });

    it('findPath returns the shortest path between nodes', async () => {
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));
        await backing.upsert(makeMemory('C'));

        await store.createRelationship('A', 'B', 'edge');
        await store.createRelationship('B', 'C', 'edge');

        const path = await store.findPath('A', 'C');
        expect(path.map((m) => m.id)).toEqual(['A', 'B', 'C']);
    });

    it('queryGraph respects minWeight (filters low-weight edges)', async () => {
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));
        await backing.upsert(makeMemory('C'));

        // Add a low-weight and a high-weight edge
        await store.createRelationship('A', 'B', 'r1', { weight: 0.2 });
        await store.createRelationship('A', 'C', 'r2', { weight: 2.5 });

        const result = await store.queryGraph({ startNodeId: 'A', minWeight: 1.0 });
        // Only the r2 edge should be present
        expect(result.edges.some((e) => e.type === 'r2')).toBeTruthy();
        expect(result.edges.some((e) => e.type === 'r1')).toBeFalsy();
    });

    it('detectCommunities groups connected components into communities', async () => {
        // cluster 1: A-B-C
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));
        await backing.upsert(makeMemory('C'));
        await store.createRelationship('A', 'B', 'e');
        await store.createRelationship('B', 'C', 'e');

        // cluster 2: D-E
        await backing.upsert(makeMemory('D'));
        await backing.upsert(makeMemory('E'));
        await store.createRelationship('D', 'E', 'e');

        const communities = await store.detectCommunities();
        // Expect two communities: one of size 3 and one of size 2 (order not guaranteed)
        expect(communities.some((c) => c.size === 3)).toBeTruthy();
        expect(communities.some((c) => c.size === 2)).toBeTruthy();
    });

    it('queryGraph with a path pattern includes the full path nodes', async () => {
        await backing.upsert(makeMemory('A'));
        await backing.upsert(makeMemory('B'));
        await backing.upsert(makeMemory('C'));

        await store.createRelationship('A', 'B', 'link');
        await store.createRelationship('B', 'C', 'link');

        const pattern = { type: 'path' as const, nodes: [], edges: [{}, {}] };
        const result = await store.queryGraph({ startNodeId: 'A', pattern });

        const nodeIds = result.nodes.map((n) => n.id).sort();
        expect(nodeIds).toEqual(['A', 'B', 'C']);
    });
});
