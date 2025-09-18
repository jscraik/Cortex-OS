/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

// A2A Events for inter-package communication
export {
	GraphStateChangedEventSchema,
	NodeExecutionCompletedEventSchema,
	NodeExecutionFailedEventSchema,
	NodeExecutionStartedEventSchema, createKernelEvent
} from './events/kernel-events.js';
export type {
	GraphStateChangedEvent,
	NodeExecutionCompletedEvent,
	NodeExecutionFailedEvent,
	NodeExecutionStartedEvent
} from './events/kernel-events.js';
// Core kernel exports - REMOVED broken graph-simple integration
// export { CortexKernel, createKernel } from './graph-simple.js';
// History helper
export {
	addToHistory,
	createHistory,
	getExecutionHistory
} from './lib/history.js';
export type { MCPContext, MCPTool } from './mcp/adapter.js';
// MCP integration
export { MCPAdapter, createDefaultMCPTools } from './mcp/adapter.js';
// Workflow nodes
export {
	BuildNode,
	EvaluationNode, StrategyNode, runBuildNode,
	runEvaluationNode,
	runStrategyNode
} from './nodes/index.js';
export {
	PRPStateSchema, createInitialPRPState, validateStateTransition
} from './state.js';
export type {
	CerebrumDecision,
	EnforcementProfile,
	Evidence,
	GateResult,
	HumanApproval,
	PRPState,
	ValidationGate
} from './state.js';
export type {
	BehaviorExtension,
	ExtensionContext,
	ExtensionResult
} from './teaching/behavior-extension.js';
// Teaching layer
export { BehaviorExtensionManager } from './teaching/behavior-extension.js';
export { ExampleCaptureSystem } from './teaching/example-capture.js';
export type {
	CapturedExample,
	TeachingPattern
} from './teaching/example-capture.js';

