/**
 * @file packages/prp-runner/src/index.ts
 * @description Main export for PRP Runner package
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status TDD-COMPLIANT
 */


export { createPRPOrchestrator } from './orchestrator.js';
export { LLMBridge } from './llm-bridge.js';
export { createExecutionContext } from './lib/create-execution-context.js';
export { executeNeuron } from './lib/execute-neuron.js';
export type {
  Neuron,
  NeuronResult,
  ExecutionMetrics,
  Blueprint,
  ExecutionState,
  ExecutionContext,
  PRPExecutionResult,
  PRPOrchestrator,
} from './orchestrator.js';
export type { LLMConfig } from './llm-bridge.js';
