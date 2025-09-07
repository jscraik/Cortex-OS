/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
export { CortexKernel, createKernel } from "./graph-simple.js";
export { addToHistory, createHistory, getExecutionHistory, } from "./lib/history.js";
export type { MCPContext, MCPTool } from "./mcp/adapter.js";
export { createDefaultMCPTools, MCPAdapter } from "./mcp/adapter.js";
export { runBuildNode, runEvaluationNode, runStrategyNode, } from "./nodes/index.js";
export type { CerebrumDecision, Evidence, PRPState, ValidationGate, GateResult, HumanApproval, EnforcementProfile, } from "./state.js";
export { createInitialPRPState, PRPStateSchema, validateStateTransition, } from "./state.js";
export type { BehaviorExtension, ExtensionContext, ExtensionResult, } from "./teaching/behavior-extension.js";
export { BehaviorExtensionManager } from "./teaching/behavior-extension.js";
export type { CapturedExample, TeachingPattern, } from "./teaching/example-capture.js";
export { ExampleCaptureSystem } from "./teaching/example-capture.js";
//# sourceMappingURL=index.d.ts.map