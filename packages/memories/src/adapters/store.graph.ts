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
	metadata?: Record<string, any>;
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
	nodes: Record<string, any>[];
	edges: Record<string, any>[];
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

export class GraphMemoryStore implements MemoryStore {
	private relationshipCache = new Map<string, Relationship[]>();
	private traversalCache = new Map<string, MemoryNode[]>();

	constructor(private readonly store: MemoryStore) {}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		// Ensure graph metadata exists
		const graph = (memory.metadata?.graph as any) || { nodeId: memory.id, edges: [] };

		// If this is an update, preserve existing relationships
		const existing = await this.store.get(memory.id, namespace);
		if (existing?.metadata?.graph?.edges) {
			graph.edges = existing.metadata.graph.edges;
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
		metadata?: Record<string, any>,
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
		this.relationshipCache.delete(`${fromMemory.metadata?.namespace || 'default'}:${fromId}`);
		this.relationshipCache.delete(`${toMemory.metadata?.namespace || 'default'}:${toId}`);
		this.clearTraversalCache(fromMemory.metadata?.namespace || 'default');

		return relationship;
	}

	async getRelationships(nodeId: string, namespace = 'default'): Promise<Relationship[]> {
		const cacheKey = `${namespace}:${nodeId}`;

		// Check cache first
		if (this.relationshipCache.has(cacheKey)) {
			return this.relationshipCache.get(cacheKey)!;
		}

		const memory = await this.store.get(nodeId, namespace);
		if (!memory?.metadata?.graph?.edges) {
			return [];
		}

		// Extract relationships from graph edges
		const relationships: Relationship[] = [];
		for (const edge of memory.metadata.graph.edges) {
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
		if (this.traversalCache.has(cacheKey)) {
			return this.traversalCache.get(cacheKey)!;
		}

		const { direction = 'both', maxDepth = 10, relationshipTypes, includeStart = true } = options;

		const visited = new Set<string>();
		const result: MemoryNode[] = [];
		const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

		while (queue.length > 0) {
			const { id, depth } = queue.shift()!;

			if (visited.has(id) || depth > maxDepth) {
				continue;
			}

			visited.add(id);

			const memory = await this.store.get(id, namespace);
			if (!memory) {
				continue;
			}

			// Create node
			const node: MemoryNode = {
				id,
				memory,
				edges: [],
			};

			// Get relationships
			const relationships = await this.getRelationships(id, namespace);
			node.edges = relationships.filter((rel) => {
				if (relationshipTypes && !relationshipTypes.includes(rel.type)) {
					return false;
				}

				if (direction === 'outgoing' && rel.from !== id) {
					return false;
				}
				if (direction === 'incoming' && rel.to !== id) {
					return false;
				}

				return true;
			});

			result.push(node);

			// Add neighbors to queue (only if edge matches criteria)
			for (const rel of node.edges) {
				const neighborId = rel.from === id ? rel.to : rel.from;
				if (!visited.has(neighborId)) {
					// For query traversal, we need to check if this edge would match the query
					// Since we don't have the query context here, we'll add all neighbors
					// and let queryGraph handle the filtering
					queue.push({ id: neighborId, depth: depth + 1 });
				}
			}
		}

		// Filter result if not including start
		const finalResult = includeStart ? result : result.filter((n) => n.id !== startId);

		// Cache result
		this.traversalCache.set(cacheKey, finalResult);

		return finalResult;
	}

	async findPath(fromId: string, toId: string, namespace = 'default'): Promise<Memory[]> {
		// BFS to find shortest path
		const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
		const visited = new Set<string>([fromId]);

		while (queue.length > 0) {
			const { id, path } = queue.shift()!;

			if (id === toId) {
				// Found path, retrieve memories
				const memories = await Promise.all(path.map((id) => this.store.get(id, namespace)));
				return memories.filter((m) => m !== null) as Memory[];
			}

			const relationships = await this.getRelationships(id, namespace);
			for (const rel of relationships) {
				const neighborId = rel.from === id ? rel.to : rel.from;

				if (!visited.has(neighborId)) {
					visited.add(neighborId);
					queue.push({ id: neighborId, path: [...path, neighborId] });
				}
			}
		}

		return []; // No path found
	}

	async queryGraph(query: GraphQuery, namespace = 'default'): Promise<GraphResult> {
		const nodes = new Map<string, MemoryNode>();
		const edges = new Set<Relationship>();

		if (query.startNodeId) {
			// Get the start node
			const startMemory = await this.store.get(query.startNodeId, namespace);
			if (startMemory) {
				const startNode: MemoryNode = {
					id: query.startNodeId,
					memory: startMemory,
					edges: [],
				};
				nodes.set(query.startNodeId, startNode);

				// Get relationships from start node
				const relationships = await this.getRelationships(query.startNodeId, namespace);

				// Filter relationships based on query criteria
				for (const rel of relationships) {
					if (
						this.shouldIncludeEdge(rel, query) &&
						this.matchesDirection(rel, query.startNodeId, query.direction)
					) {
						edges.add(rel);

						// Add connected node if within maxDepth
						if (query.maxDepth === undefined || query.maxDepth > 0) {
							const connectedId = rel.from === query.startNodeId ? rel.to : rel.from;
							const connectedMemory = await this.store.get(connectedId, namespace);
							if (connectedMemory && !nodes.has(connectedId)) {
								const connectedNode: MemoryNode = {
									id: connectedId,
									memory: connectedMemory,
									edges: [],
								};
								nodes.set(connectedId, connectedNode);
							}
						}
					}
				}
			}
		}

		// Apply pattern matching if specified
		if (query.pattern) {
			await this.applyPatternMatching(nodes, edges, query.pattern, namespace);
		}

		// Filter by minimum weight
		const filteredEdges = Array.from(edges).filter((edge) => {
			const weight = edge.metadata?.weight || 1.0;
			return weight >= (query.minWeight || 0);
		});

		return {
			nodes: Array.from(nodes.values()),
			edges: filteredEdges,
		};
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

			// BFS to find connected component
			const component = new Set<string>();
			const queue = [memory.id];

			while (queue.length > 0) {
				const id = queue.shift()!;
				if (visited.has(id) || component.has(id)) {
					continue;
				}

				component.add(id);
				visited.add(id);

				const relationships = await this.getRelationships(id, namespace);
				for (const rel of relationships) {
					const neighborId = rel.from === id ? rel.to : rel.from;
					if (!visited.has(neighborId) && !component.has(neighborId)) {
						queue.push(neighborId);
					}
				}
			}

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

	async calculateCentrality(namespace = 'default'): Promise<Record<string, Centrality>> {
		const allMemories = await this.store.list(namespace);
		const centrality: Record<string, Centrality> = {};

		// Calculate degree centrality
		for (const memory of allMemories) {
			const relationships = await this.getRelationships(memory.id, namespace);
			centrality[memory.id] = {
				id: memory.id,
				degree: relationships.length,
				betweenness: 0,
				closeness: 0,
			};
		}

		// Calculate betweenness centrality (simplified)
		for (const source of allMemories) {
			for (const target of allMemories) {
				if (source.id === target.id) continue;

				const path = await this.findPath(source.id, target.id, namespace);
				if (path.length > 0) {
					// Increment betweenness for nodes on shortest path
					for (let i = 1; i < path.length - 1; i++) {
						centrality[path[i].id].betweenness++;
					}
				}
			}
		}

		return centrality;
	}

	async findStronglyConnectedComponents(namespace = 'default'): Promise<string[][]> {
		// Kosaraju's algorithm for strongly connected components
		const allMemories = await this.store.list(namespace);
		const visited = new Set<string>();
		const order: string[] = [];
		const components: string[][] = [];

		// First DFS to get finishing times
		const dfs1 = async (id: string) => {
			visited.add(id);
			const relationships = await this.getRelationships(id, namespace);

			for (const rel of relationships) {
				if (rel.from === id && !visited.has(rel.to)) {
					await dfs1(rel.to);
				}
			}

			order.push(id);
		};

		for (const memory of allMemories) {
			if (!visited.has(memory.id)) {
				await dfs1(memory.id);
			}
		}

		// Second DFS on reversed graph
		visited.clear();
		const dfs2 = async (id: string, component: Set<string>) => {
			visited.add(id);
			component.add(id);

			const relationships = await this.getRelationships(id, namespace);
			for (const rel of relationships) {
				if (rel.to === id && !visited.has(rel.from)) {
					await dfs2(rel.from, component);
				}
			}
		};

		for (let i = order.length - 1; i >= 0; i--) {
			const id = order[i];
			if (!visited.has(id)) {
				const component = new Set<string>();
				await dfs2(id, component);
				if (component.size > 1) {
					components.push(Array.from(component));
				}
			}
		}

		return components;
	}

	// Private helper methods
	private async updateMemoryWithRelationship(
		memory: Memory,
		relationship: Relationship,
	): Promise<void> {
		const graph = (memory.metadata?.graph as any) || { nodeId: memory.id, edges: [] };

		// Add edge if not already present
		const existingEdge = graph.edges.find(
			(e: any) =>
				e.id === relationship.id ||
				(e.from === relationship.from && e.to === relationship.to && e.type === relationship.type),
		);

		if (!existingEdge) {
			graph.edges.push(relationship);
		}

		const updatedMemory = {
			...memory,
			metadata: {
				...memory.metadata,
				graph,
			},
		};

		const namespace = memory.metadata?.namespace || 'default';
		await this.store.upsert(updatedMemory, namespace);
	}

	private async removeRelationshipsForMemory(nodeId: string, namespace: string): Promise<void> {
		const relationships = await this.getRelationships(nodeId, namespace);

		for (const rel of relationships) {
			const otherId = rel.from === nodeId ? rel.to : rel.from;
			const otherMemory = await this.store.get(otherId, namespace);

			if (otherMemory?.metadata?.graph?.edges) {
				// Remove relationship from other memory
				const updatedEdges = otherMemory.metadata.graph.edges.filter(
					(edge: any) => !(edge.from === rel.from && edge.to === rel.to && edge.type === rel.type),
				);

				await this.store.upsert(
					{
						...otherMemory,
						metadata: {
							...otherMemory.metadata,
							graph: {
								...otherMemory.metadata.graph,
								edges: updatedEdges,
							},
						},
					},
					namespace,
				);
			}
		}
	}

	private shouldIncludeEdge(edge: Relationship, query: GraphQuery): boolean {
		if (query.relationshipTypes && !query.relationshipTypes.includes(edge.type)) {
			return false;
		}

		const weight = edge.metadata?.weight || 1.0;
		if (query.minWeight && weight < query.minWeight) {
			return false;
		}

		return true;
	}

	private matchesDirection(edge: Relationship, nodeId: string, direction?: string): boolean {
		const dir = direction || 'both';
		if (dir === 'outgoing' && edge.from !== nodeId) {
			return false;
		}
		if (dir === 'incoming' && edge.to !== nodeId) {
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
		// Simple pattern matching implementation
		// In a real implementation, use graph pattern matching algorithms

		if (pattern.type === 'path') {
			// Find paths matching the pattern
			for (const [nodeId, _node] of nodes) {
				const paths = await this.findAllPathsFromNode(nodeId, namespace, pattern.edges.length);

				for (const path of paths) {
					// Check if path matches pattern
					if (this.pathMatchesPattern(path, pattern)) {
						// Add all nodes and edges in the matching path
						for (const nodeId of path) {
							const memory = await this.store.get(nodeId, namespace);
							if (memory && !nodes.has(nodeId)) {
								nodes.set(nodeId, {
									id: nodeId,
									memory,
									edges: [],
								});
							}
						}
					}
				}
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
		// Simplified pattern matching
		// In a real implementation, this would be more sophisticated
		return path.length === pattern.edges.length + 1;
	}

	private async calculateDensity(component: Set<string>, namespace: string): Promise<number> {
		const size = component.size;
		if (size <= 1) return 1.0;

		let edgeCount = 0;
		for (const id of component) {
			const relationships = await this.getRelationships(id, namespace);
			for (const rel of relationships) {
				if (component.has(rel.from) && component.has(rel.to)) {
					edgeCount++;
				}
			}
		}

		const maxEdges = (size * (size - 1)) / 2;
		return edgeCount / maxEdges;
	}

	private clearTraversalCache(namespace: string): void {
		// Clear all traversal caches for this namespace
		for (const key of this.traversalCache.keys()) {
			if (key.startsWith(`traverse:${namespace}:`)) {
				this.traversalCache.delete(key);
			}
		}
	}
}
