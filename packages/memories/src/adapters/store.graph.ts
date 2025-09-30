import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface MemoryNode {
  id: string;
  memory: Memory;
  edges: Relationship[];
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphQuery {
  startNodeId?: string;
  endNodeId?: string;
  relationshipTypes?: string[];
  maxDepth?: number;
  direction?: 'incoming' | 'outgoing' | 'both';
  minWeight?: number;
  pattern?: GraphPattern;
}

export interface GraphPattern {
  type: 'path' | 'star' | 'clique';
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}

export interface GraphResult {
  nodes: MemoryNode[];
  edges: Relationship[];
}

export interface Centrality {
  id: string;
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector?: number;
}

export interface Community {
  id: string;
  nodes: string[];
  size: number;
  density: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphMetadata {
  nodeId: string;
  edges: GraphEdge[];
}

export class GraphMemoryStore implements MemoryStore {
  private readonly relationshipCache = new Map<string, Relationship[]>();
  private readonly traversalCache = new Map<string, MemoryNode[]>();

  constructor(private readonly store: MemoryStore) { }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    // Ensure graph metadata exists
    const graph = this.getGraphFromMemory(memory);

    // If this is an update, preserve existing relationships
    const existing = await this.store.get(memory.id, namespace);
    if (existing) {
      const existingGraph = this.getGraphFromMemory(existing);
      if (existingGraph.edges && existingGraph.edges.length > 0) {
        graph.edges = existingGraph.edges;
      }
    }

    const memoryWithGraph = {
      ...memory,
      metadata: {
        ...memory.metadata,
        graph,
      },
    };

    const result = await this.store.upsert(memoryWithGraph, namespace);

    // Clear related caches
    this.relationshipCache.delete(`${namespace}:${memory.id}`);
    this.clearTraversalCache(namespace);

    return result;
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.store.get(id, namespace);
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    // Get memory before deletion to clean up relationships
    const memory = await this.store.get(id, namespace);

    if (memory) {
      // Remove all relationships involving this memory
      await this.removeRelationshipsForMemory(id, namespace);
    }

    await this.store.delete(id, namespace);

    // Clear caches
    this.relationshipCache.delete(`${namespace}:${id}`);
    this.clearTraversalCache(namespace);
  }

  async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
    return this.store.searchByText(q, namespace);
  }

  async searchByVector(
    q: VectorQuery,
    namespace = 'default',
  ): Promise<(Memory & { score: number })[]> {
    return this.store.searchByVector(q, namespace);
  }

  async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
    return this.store.purgeExpired(nowISO, namespace);
  }

  async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
    return this.store.list(namespace, limit, offset);
  }

  // Graph-specific methods
  async createRelationship(
    fromId: string,
    toId: string,
    type: string,
    metadata?: Record<string, unknown>,
    namespace = 'default',
  ): Promise<Relationship> {
    // Validate relationship type
    if (!type || type.trim() === '') {
      throw new Error('Relationship type cannot be empty');
    }

    // Ensure both memories exist
    const [fromMemory, toMemory] = await Promise.all([
      this.store.get(fromId, namespace),
      this.store.get(toId, namespace),
    ]);

    if (!fromMemory) {
      throw new Error(`Memory ${fromId} does not exist`);
    }
    if (!toMemory) {
      throw new Error(`Memory ${toId} does not exist`);
    }

    // Create relationship
    const relationship: Relationship = {
      id: `rel-${fromId}-${toId}-${type}-${Date.now()}`,
      from: fromId,
      to: toId,
      type,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update memories with relationship reference
    await this.updateMemoryWithRelationship(fromMemory, relationship);
    await this.updateMemoryWithRelationship(toMemory, relationship);

    // Clear caches
    const fromNs = this.getNamespace(fromMemory);
    const toNs = this.getNamespace(toMemory);
    this.relationshipCache.delete(`${fromNs}:${fromId}`);
    this.relationshipCache.delete(`${toNs}:${toId}`);
    this.clearTraversalCache(fromNs);

    return relationship;
  }

  async getRelationships(nodeId: string, namespace = 'default'): Promise<Relationship[]> {
    const cacheKey = `${namespace}:${nodeId}`;

    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const memory = await this.store.get(nodeId, namespace);
    if (!memory) return [];

    const graph = this.getGraphFromMemory(memory);
    if (!graph.edges || graph.edges.length === 0) return [];

    const relationships: Relationship[] = [];
    for (const edge of graph.edges) {
      if (edge.from === nodeId || edge.to === nodeId) {
        relationships.push({
          ...edge,
          id: edge.id || `rel-${edge.from}-${edge.to}-${edge.type}`,
          createdAt: edge.createdAt || new Date().toISOString(),
          updatedAt: edge.updatedAt || new Date().toISOString(),
        });
      }
    }

    // Cache result
    this.relationshipCache.set(cacheKey, relationships);

    return relationships;
  }

  async traverse(
    startId: string,
    namespace = 'default',
    options: {
      direction?: 'incoming' | 'outgoing' | 'both';
      maxDepth?: number;
      relationshipTypes?: string[];
      includeStart?: boolean;
    } = {},
  ): Promise<MemoryNode[]> {
    const cacheKey = `traverse:${namespace}:${startId}:${JSON.stringify(options)}`;

    // Check cache
    const cached = this.traversalCache.get(cacheKey);
    if (cached) return cached;

    const { direction = 'both', maxDepth = 10, relationshipTypes, includeStart = true } = options;

    const visited = new Set<string>();
    const result: MemoryNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await this.processTraverseItem(item, visited, result, namespace, queue, { relationshipTypes, direction, maxDepth });
    }

    const finalResult = includeStart ? result : result.filter((n) => n.id !== startId);
    this.traversalCache.set(cacheKey, finalResult);
    return finalResult;
  }

  private async processTraverseItem(
    item: { id: string; depth: number },
    visited: Set<string>,
    result: MemoryNode[],
    namespace: string,
    queue: { id: string; depth: number }[],
    opts: { relationshipTypes?: string[]; direction?: string; maxDepth?: number },
  ): Promise<void> {
    const { id, depth } = item;
    const { relationshipTypes, direction, maxDepth = 10 } = opts;

    if (visited.has(id) || depth > maxDepth) {
      return;
    }

    visited.add(id);

    const memory = await this.store.get(id, namespace);
    if (!memory) return;

    const node: MemoryNode = { id, memory, edges: [] };
    const relationships = await this.getRelationships(id, namespace);
    node.edges = relationships.filter((rel) => this.relationshipMatches(rel, { relationshipTypes, direction, nodeId: id }));
    result.push(node);

    for (const rel of node.edges) {
      const neighborId = rel.from === id ? rel.to : rel.from;
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, depth: depth + 1 });
      }
    }
  }

  async findPath(fromId: string, toId: string, namespace = 'default'): Promise<Memory[]> {
    // BFS to find shortest path
    const queuePath: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queuePath.length > 0) {
      const entry = queuePath.shift();
      if (!entry) break;
      const { id, path } = entry;

      if (id === toId) {
        // Found path, retrieve memories
        const memories = await Promise.all(path.map((id) => this.store.get(id, namespace)));
        return memories.filter((m): m is Memory => m !== null);
      }

      const relationships = await this.getRelationships(id, namespace);
      for (const rel of relationships) {
        const neighborId = rel.from === id ? rel.to : rel.from;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queuePath.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return []; // No path found
  }

  async queryGraph(query: GraphQuery, namespace = 'default'): Promise<GraphResult> {
    const nodes = new Map<string, MemoryNode>();
    const edges = new Set<Relationship>();

    if (query.startNodeId) {
      await this.processStartNodeForQuery(query, namespace, nodes, edges);
    }

    // Apply pattern matching if specified
    if (query.pattern) {
      await this.applyPatternMatching(nodes, edges, query.pattern, namespace);
    }

    // Filter by minimum weight
    const filteredEdges = Array.from(edges).filter((edge) => {
      const weight = this.getEdgeWeight(edge);
      return weight >= (query.minWeight || 0);
    });

    return {
      nodes: Array.from(nodes.values()),
      edges: filteredEdges,
    };
  }

  private async processStartNodeForQuery(
    query: GraphQuery,
    namespace: string,
    nodes: Map<string, MemoryNode>,
    edges: Set<Relationship>,
  ): Promise<void> {
    // Get the start node
    const startMemory = await this.store.get(query.startNodeId as string, namespace);
    if (!startMemory) return;

    const startNode: MemoryNode = {
      id: query.startNodeId as string,
      memory: startMemory,
      edges: [],
    };
    nodes.set(query.startNodeId as string, startNode);

    // Get relationships from start node
    const relationships = await this.getRelationships(query.startNodeId as string, namespace);

    // Filter relationships based on query criteria
    for (const rel of relationships) {
      if (this.shouldIncludeEdge(rel, query) && this.relationshipMatches(rel, { direction: query.direction, nodeId: query.startNodeId })) {
        edges.add(rel);

        // Add connected node if within maxDepth
        await this.handleConnectedNodeIfWithinDepth(rel, query, namespace, nodes);
      }
    }
  }

  private async handleConnectedNodeIfWithinDepth(rel: Relationship, query: GraphQuery, namespace: string, nodes: Map<string, MemoryNode>): Promise<void> {
    if (query.maxDepth === undefined || query.maxDepth > 0) {
      const connectedId = rel.from === query.startNodeId ? rel.to : rel.from;
      await this.addNodeIfMissing(nodes, connectedId, namespace);
    }
  }

  async detectCommunities(namespace = 'default'): Promise<Community[]> {
    // Simple community detection using connected components
    // In a real implementation, use algorithms like Louvain or Label Propagation

    const allMemories = await this.store.list(namespace);
    const visited = new Set<string>();
    const communities: Community[] = [];

    for (const memory of allMemories) {
      if (visited.has(memory.id)) {
        continue;
      }

      const component = await this.bfsComponent(memory.id, namespace, visited);

      if (component.size > 1) {
        communities.push({
          id: `community-${communities.length}`,
          nodes: Array.from(component),
          size: component.size,
          density: await this.calculateDensity(component, namespace),
        });
      }
    }

    return communities;
  }

  private async bfsComponent(startId: string, namespace: string, visited: Set<string>): Promise<Set<string>> {
    const component = new Set<string>();
    const queue: string[] = [startId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const id = current;

      if (visited.has(id) || component.has(id)) {
        continue;
      }

      component.add(id);
      visited.add(id);

      const neighbors = await this.getNeighbors(id, namespace);
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId) && !component.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    return component;
  }

  private shouldIncludeEdge(edge: Relationship, query: GraphQuery): boolean {
    if (query.relationshipTypes && !query.relationshipTypes.includes(edge.type)) {
      return false;
    }

    const weight = this.getEdgeWeight(edge);
    if (typeof query.minWeight === 'number' && weight < query.minWeight) {
      return false;
    }

    return true;
  }

  private async applyPatternMatching(
    nodes: Map<string, MemoryNode>,
    _edges: Set<Relationship>,
    pattern: GraphPattern,
    namespace: string,
  ): Promise<void> {
    if (pattern.type === 'path') {
      await this.handlePathPattern(nodes, pattern, namespace);
    }
  }

  private async handlePathIfMatches(path: string[], pattern: GraphPattern, nodes: Map<string, MemoryNode>, namespace: string): Promise<void> {
    if (this.pathMatchesPattern(path, pattern)) {
      for (const nodeId of path) {
        await this.addNodeIfMissing(nodes, nodeId, namespace);
      }
    }
  }

  private async handlePathPattern(nodes: Map<string, MemoryNode>, pattern: GraphPattern, namespace: string): Promise<void> {
    for (const nodeId of Array.from(nodes.keys())) {
      const paths = await this.findAllPathsFromNode(nodeId, namespace, pattern.edges.length);

      for (const path of paths) {
        await this.handlePathIfMatches(path, pattern, nodes, namespace);
      }
    }
  }

  private async findAllPathsFromNode(
    startId: string,
    namespace: string,
    maxLength: number,
  ): Promise<string[][]> {
    const paths: string[][] = [];
    const dfs = async (currentId: string, path: string[], depth: number) => {
      if (depth > maxLength) return;

      const newPath = [...path, currentId];
      if (depth > 0) {
        paths.push(newPath);
      }

      const relationships = await this.getRelationships(currentId, namespace);
      for (const rel of relationships) {
        if (rel.from === currentId && !path.includes(rel.to)) {
          await dfs(rel.to, newPath, depth + 1);
        }
      }
    };

    await dfs(startId, [], 0);
    return paths;
  }

  private pathMatchesPattern(path: string[], pattern: GraphPattern): boolean {
    return path.length === pattern.edges.length + 1;
  }

  private async calculateDensity(component: Set<string>, namespace: string): Promise<number> {
    const size = component.size;
    if (size <= 1) return 1.0;

    let edgeCount = 0;
    for (const id of component) {
      const neighbors = await this.getNeighbors(id, namespace);
      for (const neighborId of neighbors) {
        if (component.has(id) && component.has(neighborId)) {
          edgeCount++;
        }
      }
    }

    const maxEdges = (size * (size - 1)) / 2;
    return edgeCount / maxEdges;
  }

  private getEdgeWeight(edge: Relationship): number {
    const w = edge.metadata?.['weight'];
    return typeof w === 'number' ? w : 1.0;
  }

  private getGraphFromMemory(memory: Memory): GraphMetadata {
    return (memory.metadata?.graph as GraphMetadata) ?? { nodeId: memory.id, edges: [] };
  }

  private async updateMemoryWithRelationship(
    memory: Memory,
    relationship: Relationship,
  ): Promise<void> {
    const graph = this.getGraphFromMemory(memory);

    // Add edge if not already present
    const existingEdge = graph.edges.find(
      (e) =>
        e.id === relationship.id || (e.from === relationship.from && e.to === relationship.to && e.type === relationship.type),
    );

    if (!existingEdge) {
      graph.edges.push(relationship);
    }

    const updatedMemory: Memory = {
      ...memory,
      metadata: {
        ...memory.metadata,
        graph,
      },
    };

    const namespace = this.getNamespace(memory);
    await this.store.upsert(updatedMemory, namespace);
  }

  private async removeRelationshipsForMemory(nodeId: string, namespace: string): Promise<void> {
    const relationships = await this.getRelationships(nodeId, namespace);

    for (const rel of relationships) {
      const otherId = rel.from === nodeId ? rel.to : rel.from;
      const otherMemory = await this.store.get(otherId, namespace);

      if (otherMemory) {
        const otherGraph = this.getGraphFromMemory(otherMemory);
        // Remove relationship from other memory
        const updatedEdges = otherGraph.edges.filter(
          (edge) => !(edge.from === rel.from && edge.to === rel.to && edge.type === rel.type),
        );

        const updatedOtherMemory: Memory = {
          ...otherMemory,
          metadata: {
            ...otherMemory.metadata,
            graph: {
              ...otherGraph,
              edges: updatedEdges,
            },
          },
        };

        await this.store.upsert(updatedOtherMemory, namespace);
      }
    }
  }

  private clearTraversalCache(namespace: string): void {
    for (const key of this.traversalCache.keys()) {
      if (key.startsWith(`traverse:${namespace}:`)) {
        this.traversalCache.delete(key);
      }
    }
  }

  private getNamespace(memory?: Memory | null): string {
    if (memory && typeof memory.metadata?.namespace === 'string') return memory.metadata.namespace;
    return 'default';
  }

  private async addNodeIfMissing(nodes: Map<string, MemoryNode>, id: string, namespace: string): Promise<void> {
    if (nodes.has(id)) return;
    const memory = await this.store.get(id, namespace);
    if (memory) {
      nodes.set(id, { id, memory, edges: [] });
    }
  }

  private relationshipMatches(rel: Relationship, opts: { relationshipTypes?: string[]; direction?: string; nodeId?: string; }): boolean {
    const { relationshipTypes, direction, nodeId } = opts;
    if (relationshipTypes && !relationshipTypes.includes(rel.type)) {
      return false;
    }
    if (direction === 'outgoing' && nodeId && rel.from !== nodeId) return false;
    if (direction === 'incoming' && nodeId && rel.to !== nodeId) return false;
    return true;
  }

  private async getNeighbors(id: string, namespace: string): Promise<string[]> {
    const relationships = await this.getRelationships(id, namespace);
    const neighbors: string[] = [];
    for (const rel of relationships) {
      const neighborId = rel.from === id ? rel.to : rel.from;
      neighbors.push(neighborId);
    }
    return neighbors;
  }
}
