/**
 * @file packages/prp-runner/src/index.ts
 * @description Main export for PRP Runner package
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status TDD-COMPLIANT
 */

export { createPRPOrchestrator, PRPOrchestrator } from './orchestrator.js';
export type {
  PRPOrchestrator as PRPOrchestratorType,
  Neuron,
  NeuronResult,
  ExecutionMetrics,
} from './orchestrator.js';

export {
  configureLLM,
  generate,
  getProvider,
  getModel,
  getMLXAdapter,
  listMLXModels,
  checkProviderHealth,
  shutdown,
} from './llm-bridge.js';
export type { LLMConfig, LLMState, LLMGenerateOptions } from './llm-bridge.js';
