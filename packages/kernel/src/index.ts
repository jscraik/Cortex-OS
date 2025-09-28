/**
 * @file index.ts
 * @description Main export for Cortex Kernel package
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

export type {
	GraphStateChangedEvent,
	NodeExecutionCompletedEvent,
	NodeExecutionFailedEvent,
	NodeExecutionStartedEvent,
} from './events/kernel-events.js';
// A2A Events for inter-package communication
export {
	createKernelEvent,
	GraphStateChangedEventSchema,
	NodeExecutionCompletedEventSchema,
	NodeExecutionFailedEventSchema,
	NodeExecutionStartedEventSchema,
} from './events/kernel-events.js';
// Core kernel exports
export { CortexKernel, createKernel } from './graph-simple.js';
// Contract union re-exports for multi-version parsing convenience
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
	ProofArtifact,
	ProofSession,
	ProofSigner,
	ProofStore,
	ProofVerification,
} from './proof/proofSystem.js';
// Proof system
export {
	createInMemoryKeyRegistry,
	createInMemoryProofStore,
	createProofGeneratedEvent,
	createProofIndexedEvent,
	createProofSession,
	createRegistrySigner,
	finalizeProof,
	produceProofFromScheduleResult,
	queryProofs,
	registerClaimSchema,
	summarizeProof,
	verifyProof,
	verifyProofAsync,
	verifyProofAuto,
} from './proof/proofSystem.js';
export type {
	DeterministicTask,
	ReplayTrace as DeterministicReplayTrace,
	ScheduleOptions as DeterministicScheduleOptions,
	ScheduleResult as DeterministicScheduleResult,
} from './scheduler/deterministicScheduler.js';
// Deterministic scheduler (Module A)
export {
	executeWithSeed as deterministicExecuteWithSeed,
	replay as deterministicReplay,
	schedule as deterministicSchedule,
	scheduleWithProof,
} from './scheduler/deterministicScheduler.js';
export type {
	CerebrumDecision,
	EnforcementProfile,
	Evidence,
	GateResult,
	HumanApproval,
	PRPState,
	ValidationGate,
} from './state.js';
export { createInitialPRPState, PRPStateSchema, validateStateTransition } from './state.js';
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

export type {
	BindKernelToolsOptions,
	KernelBashInput,
	KernelBashResult,
	KernelFetchInput,
	KernelFetchResult,
	KernelReadFileInput,
	KernelReadFileResult,
	KernelTool,
	KernelToolBinding,
} from './tools/bind-kernel-tools.js';
export { bindKernelTools } from './tools/bind-kernel-tools.js';
