/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
// Core kernel exports
export { CortexKernel, createKernel } from './graph-simple.js';
// LangGraph adoption seam (Phase 1)
export { createKernelGraph } from './langgraph/graph.js';
// History helper
export {
	addToHistory,
	createHistory,
	getExecutionHistory,
} from './lib/history.js';
// MCP integration
export { createDefaultMCPTools, MCPAdapter } from './mcp/adapter.js';
// Workflow nodes
export {
	runBuildNode,
	runEvaluationNode,
	runStrategyNode,
} from './nodes/index.js';
export {
	createInitialPRPState,
	PRPStateSchema,
	validateStateTransition,
} from './state.js';
// Teaching layer
export { BehaviorExtensionManager } from './teaching/behavior-extension.js';
export { ExampleCaptureSystem } from './teaching/example-capture.js';
//# sourceMappingURL=index.js.map
