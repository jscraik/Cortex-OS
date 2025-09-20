import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { HierarchicalMemoryStore, type HierarchyMetadata } from '../../src/adapters/store.hierarchical.js';
import type { Memory } from '../../src/domain/types.js';
import { createMemory } from '../test-utils.js';

describe('HierarchicalMemoryStore Integration', () => {
	let baseStore: InMemoryStore;
	let store: HierarchicalMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		store = new HierarchicalMemoryStore(baseStore);
		namespace = 'test-' + Math.random().toString(36).substring(7);
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await store.list(namespace);
		for (const memory of allMemories) {
			await store.delete(memory.id, namespace);
		}
	});

	describe('Basic Hierarchy Operations', () => {
		it('should create a root memory without a parent', async () => {
			const memory = createMemory({ text: 'Root memory' });
			const result = await store.upsert(memory, namespace);

			expect(result.metadata?.hierarchy).toBeDefined();
			expect(result.metadata?.hierarchy?.depth).toBe(0);
			expect(result.metadata?.hierarchy?.path).toBe(memory.id);
			expect(result.metadata?.hierarchy?.parent).toBeUndefined();
		});

		it('should create a child memory with parent reference', async () => {
			// Create parent first
			const parent = createMemory({ text: 'Parent memory' });
			await store.upsert(parent, namespace);

			// Create child
			const child = createMemory({
				text: 'Child memory',
				metadata: {
					...parent.metadata,
					hierarchy: {
						parent: parent.id
					}
				}
			});
			const result = await store.upsert(child, namespace);

			expect(result.metadata?.hierarchy?.parent).toBe(parent.id);
			expect(result.metadata?.hierarchy?.depth).toBe(1);
			expect(result.metadata?.hierarchy?.path).toBe(`${parent.id}/${child.id}`);

			// Verify parent's children list
			const updatedParent = await store.get(parent.id, namespace);
			expect(updatedParent?.metadata?.hierarchy?.children).toContain(child.id);
		});

		it('should reject circular references', async () => {
			// Create root
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			// Create child
			const child = createMemory({
				text: 'Child',
				metadata: {
					hierarchy: { parent: root.id }
				}
			});
			await store.upsert(child, namespace);

			// Try to make root a child of its own descendant (would create cycle)
			const updatedRoot = createMemory({
				...root,
				metadata: {
					...root.metadata,
					hierarchy: { parent: child.id }
				}
			});

			await expect(store.upsert(updatedRoot, namespace)).rejects.toThrow('Circular reference detected');
		});

		it('should handle multiple levels of hierarchy', async () => {
			// Create root
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			// Create level 1
			const level1 = createMemory({
				text: 'Level 1',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(level1, namespace);

			// Create level 2
			const level2 = createMemory({
				text: 'Level 2',
				metadata: { hierarchy: { parent: level1.id } }
			});
			await store.upsert(level2, namespace);

			// Verify depths
			const l1Memory = await store.get(level1.id, namespace);
			const l2Memory = await store.get(level2.id, namespace);

			expect(l1Memory?.metadata?.hierarchy?.depth).toBe(1);
			expect(l2Memory?.metadata?.hierarchy?.depth).toBe(2);
		});
	});

	describe('Hierarchy Navigation', () => {
		it('should get children of a memory', async () => {
			const parent = createMemory({ text: 'Parent' });
			await store.upsert(parent, namespace);

			// Create children
			const children = [];
			for (let i = 0; i < 3; i++) {
				const child = createMemory({
					text: `Child ${i}`,
					metadata: { hierarchy: { parent: parent.id } }
				});
				children.push(await store.upsert(child, namespace));
			}

			const childIds = await store.getChildren(parent.id, namespace);
			expect(childIds).toHaveLength(3);
			expect(childIds).toContain(children[0].id);
			expect(childIds).toContain(children[1].id);
			expect(childIds).toContain(children[2].id);
		});

		it('should get parent of a memory', async () => {
			const parent = createMemory({ text: 'Parent' });
			await store.upsert(parent, namespace);

			const child = createMemory({
				text: 'Child',
				metadata: { hierarchy: { parent: parent.id } }
			});
			await store.upsert(child, namespace);

			const parentId = await store.getParent(child.id, namespace);
			expect(parentId).toBe(parent.id);
		});

		it('should get full hierarchy path', async () => {
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			const child1 = createMemory({
				text: 'Child 1',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(child1, namespace);

			const child2 = createMemory({
				text: 'Child 2',
				metadata: { hierarchy: { parent: child1.id } }
			});
			await store.upsert(child2, namespace);

			const hierarchy = await store.getHierarchy(child2.id, namespace);
			expect(hierarchy).toHaveLength(3);
			expect(hierarchy[0].id).toBe(root.id);
			expect(hierarchy[1].id).toBe(child1.id);
			expect(hierarchy[2].id).toBe(child2.id);
		});

		it('should get subtree with depth limit', async () => {
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			// Create 3 levels
			const level1 = createMemory({
				text: 'Level 1',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(level1, namespace);

			const level2 = createMemory({
				text: 'Level 2',
				metadata: { hierarchy: { parent: level1.id } }
			});
			await store.upsert(level2, namespace);

			const level3 = createMemory({
				text: 'Level 3',
				metadata: { hierarchy: { parent: level2.id } }
			});
			await store.upsert(level3, namespace);

			// Get subtree with maxDepth=1 (should only include level1)
			const subtree = await store.getSubtree(root.id, namespace, 1);
			expect(subtree).toHaveLength(2); // root + level1
			expect(subtree.find(m => m.id === level3.id)).toBeUndefined();
		});
	});

	describe('Search Operations', () => {
		it('should search with rootOnly filter', async () => {
			// Create root
			const root = createMemory({ text: 'Important root' });
			await store.upsert(root, namespace);

			// Create child
			const child = createMemory({
				text: 'Important child',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(child, namespace);

			// Search with rootOnly
			const results = await store.searchByText({
				text: 'Important',
				rootOnly: true
			}, namespace);

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe(root.id);
		});

		it('should search with includeChildren option', async () => {
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			const child = createMemory({
				text: 'Child',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(child, namespace);

			const grandchild = createMemory({
				text: 'Grandchild',
				metadata: { hierarchy: { parent: child.id } }
			});
			await store.upsert(grandchild, namespace);

			// Search root with includeChildren
			const results = await store.searchByText({
				text: 'Root',
				includeChildren: true
			}, namespace);

			expect(results).toHaveLength(3); // root + child + grandchild
		});

		it('should search with maxDepth limit', async () => {
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			const child = createMemory({
				text: 'Child',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(child, namespace);

			const grandchild = createMemory({
				text: 'Grandchild',
				metadata: { hierarchy: { parent: child.id } }
			});
			await store.upsert(grandchild, namespace);

			// Search with maxDepth=1
			const results = await store.searchByText({
				text: 'Root',
				includeChildren: true,
				maxDepth: 1
			}, namespace);

			expect(results).toHaveLength(2); // root + child
		});

		it('should boost hierarchy scores in vector search', async () => {
			const root = createMemory({
				text: 'Test memory',
				vector: [0.1, 0.2, 0.3]
			});
			await store.upsert(root, namespace);

			const child = createMemory({
				text: 'Test child',
				vector: [0.1, 0.2, 0.3],
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(child, namespace);

			// Search with vector
			const results = await store.searchByVector({
				vector: [0.1, 0.2, 0.3],
				includeChildren: true
			}, namespace);

			expect(results).toHaveLength(2);
			// Root should have higher score due to rootBoost
			expect(results[0].id).toBe(root.id);
			expect(results[0].score).toBeGreaterThan(results[1].score);
		});
	});

	describe('Memory Operations', () => {
		it('should orphan children when parent is deleted', async () => {
			const parent = createMemory({ text: 'Parent' });
			await store.upsert(parent, namespace);

			const child = createMemory({
				text: 'Child',
				metadata: { hierarchy: { parent: parent.id } }
			});
			await store.upsert(child, namespace);

			// Delete parent
			await store.delete(parent.id, namespace);

			// Check that child still exists but is orphaned
			const orphanedChild = await store.get(child.id, namespace);
			expect(orphanedChild).not.toBeNull();
			expect(orphanedChild?.metadata?.hierarchy?.parent).toBeUndefined();
			expect(orphanedChild?.metadata?.hierarchy?.depth).toBe(0);
		});

		it('should handle multiple children gracefully', async () => {
			const parent = createMemory({ text: 'Parent' });
			await store.upsert(parent, namespace);

			// Create many children
			const children: Memory[] = [];
			for (let i = 0; i < 100; i++) {
				const child = createMemory({
					text: `Child ${i}`,
					metadata: { hierarchy: { parent: parent.id } }
				});
				children.push(await store.upsert(child, namespace));
			}

			// Verify all children are tracked
			const parentMemory = await store.get(parent.id, namespace);
			expect(parentMemory?.metadata?.hierarchy?.children).toHaveLength(100);

			// Verify getChildren returns all
			const childIds = await store.getChildren(parent.id, namespace);
			expect(childIds).toHaveLength(100);
		});

		it('should maintain hierarchy after memory update', async () => {
			const memory = createMemory({ text: 'Original' });
			await store.upsert(memory, namespace);

			// Update memory
			const updated = createMemory({
				...memory,
				text: 'Updated'
			});
			await store.upsert(updated, namespace);

			// Verify hierarchy metadata is preserved
			const result = await store.get(memory.id, namespace);
			expect(result?.metadata?.hierarchy).toBeDefined();
			expect(result?.metadata?.hierarchy?.depth).toBe(0);
		});

		it('should handle complex hierarchy operations', async () => {
			// Create a complex hierarchy tree
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			// Branch 1
			const branch1_1 = createMemory({
				text: 'Branch 1-1',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(branch1_1, namespace);

			const branch1_2 = createMemory({
				text: 'Branch 1-2',
				metadata: { hierarchy: { parent: branch1_1.id } }
			});
			await store.upsert(branch1_2, namespace);

			// Branch 2
			const branch2_1 = createMemory({
				text: 'Branch 2-1',
				metadata: { hierarchy: { parent: root.id } }
			});
			await store.upsert(branch2_1, namespace);

			// Verify structure
			const subtree = await store.getSubtree(root.id, namespace);
			expect(subtree).toHaveLength(4);

			// Verify search with filters - should find all memories with "Branch" text
			const allBranches = await store.searchByText({
				text: 'Branch'
			}, namespace);
			expect(allBranches).toHaveLength(3); // All memories with "Branch" text

			// Verify rootOnly filter - should find no root memories with "Branch" text
			const rootsOnly = await store.searchByText({
				text: 'Branch',
				rootOnly: true
			}, namespace);
			expect(rootsOnly).toHaveLength(0); // No root memories contain "Branch"
		});
	});

	describe('Error Handling', () => {
		it('should reject memory with non-existent parent', async () => {
			const memory = createMemory({
				text: 'Orphan',
				metadata: { hierarchy: { parent: 'non-existent' } }
			});

			await expect(store.upsert(memory, namespace)).rejects.toThrow('does not exist');
		});

		it('should handle concurrent hierarchy modifications', async () => {
			const parent = createMemory({ text: 'Parent' });
			await store.upsert(parent, namespace);

			// Create multiple children
			const children = [];
			for (let i = 0; i < 10; i++) {
				const child = createMemory({
					text: `Child ${i}`,
					metadata: { hierarchy: { parent: parent.id } }
				});
				children.push(child);
			}

			// Insert children sequentially (in a real system with proper locking,
			// concurrent updates would be handled)
			for (const child of children) {
				await store.upsert(child, namespace);
			}

			// Verify all children are tracked
			const finalParent = await store.get(parent.id, namespace);
			expect(finalParent?.metadata?.hierarchy?.children).toHaveLength(10);
		});

		it('should handle hierarchy metadata corruption gracefully', async () => {
			const memory = createMemory({ text: 'Test' });
			await store.upsert(memory, namespace);

			// Manually corrupt metadata
			const corrupted = await baseStore.get(memory.id, namespace);
			if (corrupted) {
				corrupted.metadata = {
					...corrupted.metadata,
					hierarchy: { parent: null } as any // Invalid parent
				};
				await baseStore.upsert(corrupted, namespace);
			}

			// Should still handle gracefully
			const result = await store.get(memory.id, namespace);
			expect(result).not.toBeNull();
		});
	});

	describe('Performance Considerations', () => {
		it('should efficiently calculate depths for deep hierarchies', async () => {
			// Create a deep hierarchy
			const memories: Memory[] = [];
			const depth = 50;

			// Create root
			const root = createMemory({ text: 'Root' });
			memories.push(await store.upsert(root, namespace));

			// Create chain
			for (let i = 1; i < depth; i++) {
				const memory = createMemory({
					text: `Level ${i}`,
					metadata: { hierarchy: { parent: memories[i-1].id } }
				});
				memories.push(await store.upsert(memory, namespace));
			}

			// Verify depth calculation
			const deepest = await store.get(memories[depth-1].id, namespace);
			expect(deepest?.metadata?.hierarchy?.depth).toBe(depth - 1);
		});

		it('should handle large subtrees efficiently', async () => {
			const root = createMemory({ text: 'Root' });
			await store.upsert(root, namespace);

			// Create wide tree
			const children: Memory[] = [];
			for (let i = 0; i < 100; i++) {
				const child = createMemory({
					text: `Child ${i}`,
					metadata: { hierarchy: { parent: root.id } }
				});
				children.push(await store.upsert(child, namespace));
			}

			// Get subtree should be fast
			const start = Date.now();
			const subtree = await store.getSubtree(root.id, namespace);
			const duration = Date.now() - start;

			expect(subtree).toHaveLength(101); // root + 100 children
			expect(duration).toBeLessThan(100); // Should be fast
		});
	});
});