export type Graph = Record<string, string[]>;

/**
 * Validate that a directed graph is acyclic. Throws an Error with a helpful
 * message that includes a discovered cycle if found.
 */
export function validateDAG(graph: Graph): void {
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const path: string[] = [];

	const dfs = (node: string): void => {
		if (visited.has(node)) return;
		if (visiting.has(node)) {
			// found a back-edge; extract cycle from path
			const cycleStart = path.indexOf(node);
			const cyclePath = [...path.slice(cycleStart), node];
			throw new Error(`Detected cycle in workflow: ${cyclePath.join(' -> ')}`);
		}
		visiting.add(node);
		path.push(node);
		for (const next of graph[node] ?? []) dfs(next);
		path.pop();
		visiting.delete(node);
		visited.add(node);
	};

	Object.keys(graph).forEach(dfs);
}

/**
 * Kahn's algorithm for topological sort. Throws if a cycle is detected.
 */
export function topoSort(graph: Graph): string[] {
	// compute indegree
	const indegree: Record<string, number> = {};
	const nodes = new Set<string>();
	for (const [u, outs] of Object.entries(graph)) {
		nodes.add(u);
		for (const v of outs) nodes.add(v);
	}
	for (const n of nodes) indegree[n] = 0;
	for (const [, outs] of Object.entries(graph))
		for (const v of outs) indegree[v]++;

	// queue of nodes with zero indegree
	const queue: string[] = [
		...Object.keys(indegree).filter((n) => indegree[n] === 0),
	];
	const order: string[] = [];
	let i = 0;
	while (i < queue.length) {
		const u = queue[i++];
		order.push(u);
		for (const v of graph[u] ?? []) {
			indegree[v]--;
			if (indegree[v] === 0) queue.push(v);
		}
	}

	if (order.length !== nodes.size) {
		// fall back to DFS validator for a clearer error message
		validateDAG(graph);
		throw new Error('Graph contains a cycle');
	}
	return order;
}
