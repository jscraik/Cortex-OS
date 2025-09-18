/**
 * @file langgraph/graph.js
 * @description Kernel LangGraphJS graph skeleton (JS variant for tests that import .js sources).
 */

export function createKernelGraph() {
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
