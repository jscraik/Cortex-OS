export * from './documentation/index.js';
export * from './enforcement/initial-processor.js';
export * from './gates/base.js';
export * from './gates/g0-ideation.js';
export * from './gates/g1-architecture.js';
export * from './gates/g2-test-plan.js';
export * from './gates/g3-code-review.js';
export * from './gates/g4-verification.js';
export * from './gates/g5-triage.js';
export * from './gates/g6-release-readiness.js';
export * from './gates/g7-release.js';
export * from './runner.js';
export * from './run-manifest/index.js';

/**
 * @file packages/prp-runner/src/index.ts
 * @description Main export for PRP Runner package
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status TDD-COMPLIANT
 */

// A2A Events
export {
	createPrpRunnerEvent,
	type PrProcessingCompletedEvent,
	type PrProcessingStartedEvent,
	type ReviewGeneratedEvent,
	type TaskExecutedEvent,
} from './events/prp-runner-events.js';
export { createExecutionContext } from './lib/create-execution-context.js';
export { executeSubAgent } from './lib/execute-sub-agent.js';

// New architecture components
export * from './lib/index.js';
export type { LLMConfig } from './llm-bridge.js';
export { LLMBridge } from './llm-bridge.js';
// MCP Integration
export { prpRunnerMcpTools } from './mcp/tools.js';
export type {
	Blueprint,
	ExecutionContext,
	ExecutionMetrics,
	ExecutionState,
	PRPExecutionResult,
	PRPOrchestrator,
	SubAgent,
	SubAgentResult,
} from './orchestrator.js';
export { createPRPOrchestrator } from './orchestrator.js';
