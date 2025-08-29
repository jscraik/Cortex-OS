/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

// Core kernel exports
export { CortexKernel, createKernel } from './graph-simple.js';
export { createInitialPRPState, PRPStateSchema, validateStateTransition } from './state.js';
export type { CerebrumDecision, Evidence, PRPState, ValidationGate } from './state.js';

// History helper
export { addToHistory, createHistory, getExecutionHistory } from './lib/history.js';

// Workflow nodes
export { runStrategyNode, runBuildNode, runEvaluationNode } from './nodes/index.js';

// MCP integration
export { createDefaultMCPTools, MCPAdapter } from './mcp/adapter.js';
export type { MCPContext, MCPTool } from './mcp/adapter.js';

// Teaching layer
export { BehaviorExtensionManager } from './teaching/behavior-extension.js';
export type {
  BehaviorExtension,
  ExtensionContext,
  ExtensionResult,
} from './teaching/behavior-extension.js';
export { ExampleCaptureSystem } from './teaching/example-capture.js';
export type { CapturedExample, TeachingPattern } from './teaching/example-capture.js';
