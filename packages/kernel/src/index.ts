/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

// Core kernel exports
export { createKernel, runPRPWorkflow } from './graph-simple.js';
export type { PRPState, Evidence, ValidationGate, CerebrumDecision } from './state.js';
export { PRPStateSchema, validateStateTransition, createInitialPRPState } from './state.js';

// History helper
export { createHistory, addToHistory, getExecutionHistory } from './lib/history.js';

// Workflow nodes
export { runStrategyNode, runBuildNode, runEvaluationNode } from './nodes/index.js';

// MCP integration
export { MCPAdapter, createDefaultMCPTools } from './mcp/adapter.js';
export type { MCPTool, MCPContext } from './mcp/adapter.js';

// Teaching layer
export { ExampleCaptureSystem } from './teaching/example-capture.js';
export type { CapturedExample, TeachingPattern } from './teaching/example-capture.js';
export { BehaviorExtensionManager } from './teaching/behavior-extension.js';
export type {
  BehaviorExtension,
  ExtensionContext,
  ExtensionResult,
} from './teaching/behavior-extension.js';
