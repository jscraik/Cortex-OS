/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

// Core kernel exports
export { CortexKernel, createKernel } from './graph-simple.js';
// History helper
export {
	addToHistory,
	createHistory,
	getExecutionHistory,
} from './lib/history.js';
export type { MCPContext, MCPTool } from './mcp/adapter.js';
// MCP integration
export { createDefaultMCPTools, MCPAdapter } from './mcp/adapter.js';

// Workflow nodes
export {
	BuildNode,
	EvaluationNode, 
	runBuildNode,
	runEvaluationNode,
	runStrategyNode,
	StrategyNode,
} from './nodes/index.js';
export type {
	CerebrumDecision,
	EnforcementProfile,
	Evidence,
	GateResult,
	HumanApproval,
	PRPState,
	ValidationGate,
} from './state.js';
export {
	createInitialPRPState,
	PRPStateSchema,
	validateStateTransition,
} from './state.js';
export type {
	BehaviorExtension,
	ExtensionContext,
	ExtensionResult,
} from './teaching/behavior-extension.js';
// Teaching layer
export { BehaviorExtensionManager } from './teaching/behavior-extension.js';
export type {
	CapturedExample,
	TeachingPattern,
} from './teaching/example-capture.js';
export { ExampleCaptureSystem } from './teaching/example-capture.js';
