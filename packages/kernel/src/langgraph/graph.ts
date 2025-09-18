/**
 * @file langgraph/graph.ts
 * @description Kernel LangGraphJS graph skeleton and factory.
 * This is the Phase 1 – Graph Schema Skeleton: returns an empty graph-like object.
 * Later phases will replace this with a real LangGraph `StateGraph` and nodes.
 */

// NOTE: We intentionally avoid importing from `@langchain/langgraph` in this initial
// skeleton to keep the build surface minimal and avoid version pin churn during TDD.
// In Phase 1 step 2, we will wire real state + checkpointing using the official API.

export interface KernelGraphSkeleton {
	nodes: Array<{ id: string; type?: string }>;
	edges: Array<{ from: string; to: string; condition?: string }>;
	metadata?: Record<string, unknown>;
}

/**
 * Factory returning a minimal graph-like structure. This satisfies early tests and
 * provides a stable seam for incremental LangGraph adoption.
 */
export function createKernelGraph(): KernelGraphSkeleton {
	return {
		nodes: [],
		edges: [],
		metadata: {
			version: 0,
			engine: 'langgraphjs-skeleton',
			status: 'placeholder',
		},
	};
}
