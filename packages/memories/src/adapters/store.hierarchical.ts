import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface HierarchyMetadata {
  parent?: string;
  children?: string[];
  depth?: number;
  path?: string;
}

export interface HierarchicalQuery extends TextQuery {
  includeChildren?: boolean;
  maxDepth?: number;
  rootOnly?: boolean;
}

export interface HierarchicalVectorQuery extends VectorQuery {
  includeChildren?: boolean;
  maxDepth?: number;
  rootOnly?: boolean;
}

export class HierarchicalMemoryStore implements MemoryStore {
  constructor(private readonly store: MemoryStore) { }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    // Ensure hierarchy metadata exists
    const hierarchy = (memory.metadata?.hierarchy as HierarchyMetadata) || {};

    // If parent is specified, validate it exists and check for circular references
    if (hierarchy.parent) {
      const parentExists = await this.store.get(hierarchy.parent, namespace);
      if (!parentExists) {
        throw new Error(`Parent memory ${hierarchy.parent} does not exist`);
      }

      // Check for circular references
      await this.checkCircularReference(memory.id, hierarchy.parent, namespace);

      // Calculate depth based on parent's depth
      const parentHierarchy = parentExists.metadata?.hierarchy as HierarchyMetadata | undefined;
      hierarchy.depth = (parentHierarchy?.depth || 0) + 1;
    } else {
      hierarchy.depth = 0;
    }

    // Calculate path
    if (hierarchy.parent) {
      const parentMemory = await this.store.get(hierarchy.parent, namespace);
      const parentPath = parentMemory?.metadata?.hierarchy?.path || hierarchy.parent;
      hierarchy.path = `${parentPath}/${memory.id}`;
    } else {
      hierarchy.path = memory.id;
    }

    // Update memory with hierarchy metadata
    const memoryWithHierarchy = {
      ...memory,
      metadata: {
        ...memory.metadata,
        hierarchy,
      },
    };

    // Store the memory
    const stored = await this.store.upsert(memoryWithHierarchy, namespace);

    // Update parent's children reference
    if (hierarchy.parent) {
      await this.updateParentChildren(memory.id, hierarchy.parent, namespace);
    }

    return stored;
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.store.get(id, namespace);
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    // Get memory before deletion to update parent
    const memory = await this.store.get(id, namespace);

    if (memory?.metadata?.hierarchy?.parent) {
      await this.removeFromParentChildren(id, memory.metadata.hierarchy.parent, namespace);
    }

    // Handle orphaning children
    const children = await this.getChildren(id, namespace);
    for (const child of children) {
      const childMemory = await this.store.get(child, namespace);
      if (childMemory) {
        const updatedMetadata = {
          ...childMemory.metadata,
          hierarchy: {
            ...childMemory.metadata?.hierarchy,
            parent: undefined,
            depth: 0,
            path: childMemory.id,
          },
        };
        await this.store.upsert({ ...childMemory, metadata: updatedMetadata }, namespace);
      }
    }

    await this.store.delete(id, namespace);
  }

  async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
    const hq = q as HierarchicalQuery;
    let results = await this.store.searchByText(q, namespace);

    if (hq.rootOnly) {
      results = results.filter((m) => !m.metadata?.hierarchy?.parent);
    }

    if (hq.includeChildren || hq.maxDepth) {
      const expanded = new Set<string>();
      for (const memory of results) {
        expanded.add(memory.id);
        if (hq.includeChildren) {
          await this.collectChildren(memory.id, namespace, expanded, hq.maxDepth);
        }
      }

      const allMemories = await Promise.all(
        Array.from(expanded).map((id) => this.store.get(id, namespace)),
      );
      results = allMemories.filter((m) => m !== null) as Memory[];
    }

    return results;
  }

  async searchByVector(
    q: VectorQuery,
    namespace = 'default',
  ): Promise<(Memory & { score: number })[]> {
    const hvq = q as HierarchicalVectorQuery;
    let results = await this.store.searchByVector(q, namespace);

    if (hvq.rootOnly) {
      results = results.filter((m) => !m.metadata?.hierarchy?.parent);
    }

    if (hvq.includeChildren || hvq.maxDepth) {
      const expanded = new Set<string>();
      for (const memory of results) {
        expanded.add(memory.id);
        if (hvq.includeChildren) {
          await this.collectChildren(memory.id, namespace, expanded, hvq.maxDepth);
        }
      }

      const allMemories = await Promise.all(
        Array.from(expanded).map((id) => this.store.get(id, namespace)),
      );
      const filteredMemories = allMemories.filter((m) => m !== null) as Memory[];

      // Re-score with hierarchy boost
      const queryVector = (hvq.vector ?? (hvq as unknown as { embedding?: number[] }).embedding) ?? [];

      results = filteredMemories.map((m) => ({
        ...m,
        score: this.calculateHierarchyScore(m, queryVector),
      }));
    }

    return results;
  }

  async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
    return this.store.purgeExpired(nowISO, namespace);
  }

  async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
    return this.store.list(namespace, limit, offset);
  }

  // Hierarchy-specific methods
  async getChildren(id: string, namespace = 'default'): Promise<string[]> {
    const memory = await this.store.get(id, namespace);
    return memory?.metadata?.hierarchy?.children || [];
  }

  async getParent(id: string, namespace = 'default'): Promise<string | null> {
    const memory = await this.store.get(id, namespace);
    return memory?.metadata?.hierarchy?.parent || null;
  }

  async getHierarchy(id: string, namespace = 'default'): Promise<Memory[]> {
    const hierarchy: Memory[] = [];
    let current = await this.store.get(id, namespace);

    while (current) {
      hierarchy.unshift(current);
      const parentId = current.metadata?.hierarchy?.parent;
      if (!parentId) break;
      current = await this.store.get(parentId, namespace);
    }

    return hierarchy;
  }

  async getSubtree(id: string, namespace = 'default', maxDepth?: number): Promise<Memory[]> {
    const subtree: Memory[] = [];
    const visited = new Set<string>();

    await this.collectSubtree(id, namespace, subtree, visited, 0, maxDepth);

    return subtree;
  }

  // Private helper methods
  private async checkCircularReference(
    memoryId: string,
    parentId: string,
    namespace: string,
    visited = new Set<string>(),
  ): Promise<void> {
    // Check if the memory being added is in the parent's ancestry
    let currentId = parentId;
    while (currentId) {
      if (currentId === memoryId) {
        throw new Error('Circular reference detected: memory cannot be ancestor of its parent');
      }

      if (visited.has(currentId)) {
        throw new Error('Circular reference detected');
      }

      visited.add(currentId);

      const currentMemory = await this.store.get(currentId, namespace);
      const hierarchy = currentMemory?.metadata?.hierarchy as HierarchyMetadata | undefined;
      currentId = hierarchy?.parent || null;
    }
  }

  private async calculatePath(id: string, namespace: string): Promise<string> {
    const memory = await this.store.get(id, namespace);
    if (!memory?.metadata?.hierarchy?.parent) {
      return id;
    }

    const parentPath = await this.calculatePath(memory.metadata.hierarchy.parent, namespace);
    return `${parentPath}/${id}`;
  }

  private async updateParentChildren(
    childId: string,
    parentId: string,
    namespace: string,
  ): Promise<void> {
    const parent = await this.store.get(parentId, namespace);
    if (!parent) return;

    const hierarchy = (parent.metadata?.hierarchy as HierarchyMetadata) || {};
    const children = new Set(hierarchy.children || []);
    children.add(childId);

    const updatedMetadata = {
      ...parent.metadata,
      hierarchy: {
        ...hierarchy,
        children: Array.from(children),
      },
    };

    await this.store.upsert({ ...parent, metadata: updatedMetadata }, namespace);
  }

  private async removeFromParentChildren(
    childId: string,
    parentId: string,
    namespace: string,
  ): Promise<void> {
    const parent = await this.store.get(parentId, namespace);
    if (!parent) return;

    const hierarchy = (parent.metadata?.hierarchy as HierarchyMetadata) || {};
    const children = new Set(hierarchy.children || []);
    children.delete(childId);

    const updatedMetadata = {
      ...parent.metadata,
      hierarchy: {
        ...hierarchy,
        children: Array.from(children),
      },
    };

    await this.store.upsert({ ...parent, metadata: updatedMetadata }, namespace);
  }

  private async collectChildren(
    id: string,
    namespace: string,
    collection: Set<string>,
    maxDepth?: number,
    currentDepth = 0,
  ): Promise<void> {
    if (maxDepth !== undefined && currentDepth >= maxDepth) {
      return;
    }

    const children = await this.getChildren(id, namespace);
    for (const childId of children) {
      if (!collection.has(childId)) {
        collection.add(childId);
        await this.collectChildren(childId, namespace, collection, maxDepth, currentDepth + 1);
      }
    }
  }

  private calculateHierarchyScore(memory: Memory, queryVector: number[]): number {
    // Boost score based on hierarchy position
    const depth = memory.metadata?.hierarchy?.depth || 0;
    const depthBoost = Math.max(0, 1 - depth * 0.1); // 10% penalty per level

    // Additional boost for root nodes
    const isRoot = !memory.metadata?.hierarchy?.parent;
    const rootBoost = isRoot ? 1.2 : 1.0;

    return (queryVector.length > 0 ? 1 : 0) * depthBoost * rootBoost;
  }

  private async collectSubtree(
    id: string,
    namespace: string,
    result: Memory[],
    visited: Set<string>,
    currentDepth: number,
    maxDepth?: number,
  ): Promise<void> {
    if (visited.has(id) || (maxDepth !== undefined && currentDepth > maxDepth)) {
      return;
    }

    visited.add(id);
    const memory = await this.store.get(id, namespace);
    if (memory) {
      result.push(memory);

      const children = await this.getChildren(id, namespace);
      for (const childId of children) {
        await this.collectSubtree(childId, namespace, result, visited, currentDepth + 1, maxDepth);
      }
    }
  }
}
