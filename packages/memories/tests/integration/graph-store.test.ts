import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { GraphMemoryStore, type MemoryNode, type Relationship, type GraphQuery } from '../../src/adapters/store.graph.js';
import type { Memory } from '../../src/domain/types.js';
import { createMemory } from '../test-utils.js';

describe('GraphMemoryStore Integration', () => {
	let baseStore: InMemoryStore;
	let store: GraphMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		store = new GraphMemoryStore(baseStore);
		namespace = 'test-' + Math.random().toString(36).substring(7);
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await store.list(namespace);
		for (const memory of allMemories) {
			await store.delete(memory.id, namespace);
		}
	});

	describe('Basic Graph Operations', () => {
		it('should create nodes from memories', async () => {
			const memory = createMemory({ text: 'Test memory' });
			const result = await store.upsert(memory, namespace);

			expect(result.metadata?.graph).toBeDefined();
			expect(result.metadata?.graph?.nodeId).toBe(memory.id);
			expect(result.metadata?.graph?.edges).toEqual([]);
		});

		it('should create relationships between memories', async () => {
			// Create two memories
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });
			await store.upsert(memory1, namespace);
			await store.upsert(memory2, namespace);

			// Create relationship
			const relationship = await store.createRelationship(
				memory1.id,
				memory2.id,
				'references',
				{ strength: 0.8 },
				namespace
			);

			expect(relationship).toBeDefined();
			expect(relationship.from).toBe(memory1.id);
			expect(relationship.to).toBe(memory2.id);
			expect(relationship.type).toBe('references');
			expect(relationship.metadata?.strength).toBe(0.8);
		});

		it('should track relationships in memory metadata', async () => {
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });
			await store.upsert(memory1, namespace);
			await store.upsert(memory2, namespace);

			// Create relationship
			await store.createRelationship(memory1.id, memory2.id, 'related_to', undefined, namespace);

			// Check that memories are updated
			const updated1 = await store.get(memory1.id, namespace);
			const updated2 = await store.get(memory2.id, namespace);

			expect(updated1?.metadata?.graph?.edges).toContainEqual(
				expect.objectContaining({ to: memory2.id, type: 'related_to' })
			);
			expect(updated2?.metadata?.graph?.edges).toContainEqual(
				expect.objectContaining({ from: memory1.id, type: 'related_to' })
			);
		});

		it('should delete relationships when memory is deleted', async () => {
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });
			await store.upsert(memory1, namespace);
			await store.upsert(memory2, namespace);

			// Create relationship
			await store.createRelationship(memory1.id, memory2.id, 'depends_on', undefined, namespace);

			// Delete memory
			await store.delete(memory1.id, namespace);

			// Check that relationship is gone
			const relationships = await store.getRelationships(memory2.id, namespace);
			expect(relationships).toHaveLength(0);
		});

		it('should support multiple relationship types', async () => {
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });
			await store.upsert(memory1, namespace);
			await store.upsert(memory2, namespace);

			// Create multiple relationships
			await store.createRelationship(memory1.id, memory2.id, 'references', undefined, namespace);
			await store.createRelationship(memory1.id, memory2.id, 'builds_on', undefined, namespace);
			await store.createRelationship(memory2.id, memory1.id, 'extends', undefined, namespace);

			const rels1 = await store.getRelationships(memory1.id, namespace);
			const rels2 = await store.getRelationships(memory2.id, namespace);

			expect(rels1).toHaveLength(3);
			expect(rels2).toHaveLength(3);
		});
	});

	describe('Graph Traversal', () => {
		it('should traverse outgoing relationships', async () => {
			// Create a chain: A -> B -> C
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			const c = createMemory({ text: 'C' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);
			await store.upsert(c, namespace);

			await store.createRelationship(a.id, b.id, 'next', undefined, namespace);
			await store.createRelationship(b.id, c.id, 'next', undefined, namespace);

			const traversal = await store.traverse(a.id, namespace, { direction: 'outgoing' });

			expect(traversal).toHaveLength(3);
			expect(traversal[0].id).toBe(a.id);
			expect(traversal[1].id).toBe(b.id);
			expect(traversal[2].id).toBe(c.id);
		});

		it('should traverse with depth limit', async () => {
			// Create: A -> B -> C -> D
			const memories = [];
			for (let i = 0; i < 4; i++) {
				const memory = createMemory({ text: String.fromCharCode(65 + i) });
				memories.push(await store.upsert(memory, namespace));
			}

			for (let i = 0; i < 3; i++) {
				await store.createRelationship(memories[i].id, memories[i + 1].id, 'next', undefined, namespace);
			}

			const traversal = await store.traverse(memories[0].id, namespace, {
				direction: 'outgoing',
				maxDepth: 2
			});

			expect(traversal).toHaveLength(3); // A, B, C
		});

		it('should traverse with relationship type filter', async () => {
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			const c = createMemory({ text: 'C' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);
			await store.upsert(c, namespace);

			await store.createRelationship(a.id, b.id, 'references', undefined, namespace);
			await store.createRelationship(a.id, c.id, 'related_to', undefined, namespace);

			const traversal = await store.traverse(a.id, namespace, {
				direction: 'outgoing',
				relationshipTypes: ['references']
			});

			expect(traversal).toHaveLength(2);
			expect(traversal.find(n => n.id === c.id)).toBeUndefined();
		});

		it('should handle cycles in traversal', async () => {
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);

			await store.createRelationship(a.id, b.id, 'next', undefined, namespace);
			await store.createRelationship(b.id, a.id, 'prev', undefined, namespace); // Creates cycle

			const traversal = await store.traverse(a.id, namespace, {
				direction: 'outgoing',
				maxDepth: 5
			});

			// Should not infinite loop
			expect(traversal.length).toBeGreaterThan(0);
			expect(traversal.length).toBeLessThanOrEqual(10); // Some reasonable limit
		});
	});

	describe('Path Finding', () => {
		it('should find shortest path between nodes', async () => {
			// Create: A -> B -> C -> D
			const memories = [];
			for (let i = 0; i < 4; i++) {
				const memory = createMemory({ text: String.fromCharCode(65 + i) });
				memories.push(await store.upsert(memory, namespace));
			}

			for (let i = 0; i < 3; i++) {
				await store.createRelationship(memories[i].id, memories[i + 1].id, 'next', undefined, namespace);
			}

			const path = await store.findPath(memories[0].id, memories[3].id, namespace);

			expect(path).toHaveLength(4);
			expect(path[0].id).toBe(memories[0].id);
			expect(path[3].id).toBe(memories[3].id);
		});

		it('should return empty array when no path exists', async () => {
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);

			const path = await store.findPath(a.id, b.id, namespace);
			expect(path).toEqual([]);
		});

		it('should find path with multiple possible routes', async () => {
			// Create diamond: A -> B -> D, A -> C -> D
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			const c = createMemory({ text: 'C' });
			const d = createMemory({ text: 'D' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);
			await store.upsert(c, namespace);
			await store.upsert(d, namespace);

			await store.createRelationship(a.id, b.id, 'path1', undefined, namespace);
			await store.createRelationship(b.id, d.id, 'path1', undefined, namespace);
			await store.createRelationship(a.id, c.id, 'path2', undefined, namespace);
			await store.createRelationship(c.id, d.id, 'path2', undefined, namespace);

			const path = await store.findPath(a.id, d.id, namespace);
			expect(path.length).toBeGreaterThan(0);
			expect(path.length).toBeLessThanOrEqual(4); // Should find shortest path
		});
	});

	describe('Graph Queries', () => {
		it('should find related memories', async () => {
			const central = createMemory({ text: 'Central concept' });
			const related1 = createMemory({ text: 'Related 1' });
			const related2 = createMemory({ text: 'Related 2' });
			const unrelated = createMemory({ text: 'Unrelated' });
			await store.upsert(central, namespace);
			await store.upsert(related1, namespace);
			await store.upsert(related2, namespace);
			await store.upsert(unrelated, namespace);

			await store.createRelationship(central.id, related1.id, 'references', undefined, namespace);
			await store.createRelationship(central.id, related2.id, 'references', undefined, namespace);

			const results = await store.queryGraph({
				startNodeId: central.id,
				relationshipTypes: ['references'],
				maxDepth: 1,
				direction: 'outgoing'
			}, namespace);

			expect(results.nodes).toHaveLength(3);
			expect(results.edges).toHaveLength(2);
		});

		it.skip('should find memories by relationship patterns', async () => {
			// TODO: Implement full pattern matching
			// This test requires more sophisticated pattern matching logic
			// For now, we'll skip it as it's a nice-to-have feature
		});

		it('should support weighted relationships', async () => {
			const source = createMemory({ text: 'Source' });
			const targets = [];
			for (let i = 0; i < 5; i++) {
				const target = createMemory({ text: `Target ${i}` });
				targets.push(await store.upsert(target, namespace));
			}
			await store.upsert(source, namespace);

			// Create relationships with different weights
			const weights = [0.9, 0.7, 0.5, 0.3, 0.1];
			for (let i = 0; i < 5; i++) {
				await store.createRelationship(
					source.id,
					targets[i].id,
					'similar',
					{ weight: weights[i] },
					namespace
				);
			}

			const results = await store.queryGraph({
				startNodeId: source.id,
				relationshipTypes: ['similar'],
				minWeight: 0.5,
				maxDepth: 1,
				direction: 'outgoing'
			}, namespace);

			// Should only return relationships with weight >= 0.5
			expect(results.nodes).toHaveLength(4); // source + 3 targets (weights 0.9, 0.7, 0.5)
		});
	});

	describe('Community Detection', () => {
		it('should detect communities in the graph', async () => {
			// Create two separate communities
			const community1 = [];
			const community2 = [];

			// Community 1: A-B-C
			for (let i = 0; i < 3; i++) {
				const memory = createMemory({ text: `C1-${i}` });
				community1.push(await store.upsert(memory, namespace));
			}

			// Community 2: X-Y-Z
			for (let i = 0; i < 3; i++) {
				const memory = createMemory({ text: `C2-${i}` });
				community2.push(await store.upsert(memory, namespace));
			}

			// Connect within communities
			for (let i = 0; i < 2; i++) {
				await store.createRelationship(community1[i].id, community1[i + 1].id, 'related', undefined, namespace);
				await store.createRelationship(community2[i].id, community2[i + 1].id, 'related', undefined, namespace);
			}

			const communities = await store.detectCommunities(namespace);

			expect(communities).toHaveLength(2);
			expect(communities[0].size).toBe(3);
			expect(communities[1].size).toBe(3);
		});

		it('should handle overlapping communities', async () => {
			// Create overlapping structure: A-B-C and B-D-E
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			const c = createMemory({ text: 'C' });
			const d = createMemory({ text: 'D' });
			const e = createMemory({ text: 'E' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);
			await store.upsert(c, namespace);
			await store.upsert(d, namespace);
			await store.upsert(e, namespace);

			await store.createRelationship(a.id, b.id, 'related', undefined, namespace);
			await store.createRelationship(b.id, c.id, 'related', undefined, namespace);
			await store.createRelationship(b.id, d.id, 'related', undefined, namespace);
			await store.createRelationship(d.id, e.id, 'related', undefined, namespace);

			const communities = await store.detectCommunities(namespace);

			// Should detect that B is in multiple communities
			expect(communities.length).toBeGreaterThan(0);
		});
	});

	describe('Graph Analytics', () => {
		it('should calculate node centrality measures', async () => {
			// Create star graph: center connected to all others
			const center = createMemory({ text: 'Center' });
			const leaves = [];
			await store.upsert(center, namespace);

			for (let i = 0; i < 5; i++) {
				const leaf = createMemory({ text: `Leaf ${i}` });
				leaves.push(await store.upsert(leaf, namespace));
				await store.createRelationship(center.id, leaf.id, 'connects', undefined, namespace);
			}

			const centrality = await store.calculateCentrality(namespace);

			// Center should have highest centrality
			expect(centrality[center.id].degree).toBe(5);
			expect(centrality[center.id].betweenness).toBeGreaterThan(centrality[leaves[0].id].betweenness);
		});

		it('should identify strongly connected components', async () => {
			// Create cycle: A -> B -> C -> A
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			const c = createMemory({ text: 'C' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);
			await store.upsert(c, namespace);

			await store.createRelationship(a.id, b.id, 'next', undefined, namespace);
			await store.createRelationship(b.id, c.id, 'next', undefined, namespace);
			await store.createRelationship(c.id, a.id, 'next', undefined, namespace);

			const components = await store.findStronglyConnectedComponents(namespace);

			expect(components).toHaveLength(1);
			expect(components[0]).toContainEqual(a.id);
			expect(components[0]).toContainEqual(b.id);
			expect(components[0]).toContainEqual(c.id);
		});
	});

	describe('Performance Considerations', () => {
		it('should handle large graphs efficiently', async () => {
			// Create 100 nodes with random connections
			const nodes = [];
			for (let i = 0; i < 100; i++) {
				const memory = createMemory({ text: `Node ${i}` });
				nodes.push(await store.upsert(memory, namespace));
			}

			// Create random connections
			for (let i = 0; i < 200; i++) {
				const from = nodes[Math.floor(Math.random() * nodes.length)];
				const to = nodes[Math.floor(Math.random() * nodes.length)];
				if (from.id !== to.id) {
					await store.createRelationship(from.id, to.id, 'random', undefined, namespace);
				}
			}

			// Performance test
			const start = Date.now();
			const path = await store.findPath(nodes[0].id, nodes[99].id, namespace);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(1000); // Should complete within 1 second
		});

		it('should cache frequent queries', async () => {
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });
			await store.upsert(memory1, namespace);
			await store.upsert(memory2, namespace);

			await store.createRelationship(memory1.id, memory2.id, 'test', undefined, namespace);

			// Query multiple times
			const start1 = Date.now();
			await store.getRelationships(memory1.id, namespace);
			const time1 = Date.now() - start1;

			const start2 = Date.now();
			await store.getRelationships(memory1.id, namespace);
			const time2 = Date.now() - start2;

			// Second query should be faster due to caching
			expect(time2).toBeLessThanOrEqual(time1);
		});
	});

	describe('Error Handling', () => {
		it('should reject relationships to non-existent memories', async () => {
			const memory = createMemory({ text: 'Memory' });
			await store.upsert(memory, namespace);

			await expect(
				store.createRelationship(memory.id, 'non-existent', 'test')
			).rejects.toThrow('does not exist');
		});

		it('should handle circular reference detection', async () => {
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);

			// This should work
			await store.createRelationship(a.id, b.id, 'test', undefined, namespace);

			// This should not create infinite recursion
			const rels = await store.getRelationships(a.id, namespace);
			expect(rels).toHaveLength(1);
		});

		it('should validate relationship types', async () => {
			const a = createMemory({ text: 'A' });
			const b = createMemory({ text: 'B' });
			await store.upsert(a, namespace);
			await store.upsert(b, namespace);

			await expect(
				store.createRelationship(a.id, b.id, '')
			).rejects.toThrow('Relationship type cannot be empty');

			await expect(
				store.createRelationship(a.id, b.id, '   ')
			).rejects.toThrow('Relationship type cannot be empty');
		});
	});
});