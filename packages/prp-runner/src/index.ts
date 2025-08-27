/**
 * @file packages/prp-runner/src/index.ts
 * @description Main export for PRP Runner package
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status TDD-COMPLIANT
 */

export { PRPOrchestrator } from './orchestrator.js';
export { LLMBridge } from './llm-bridge.js';
export type { Neuron, NeuronResult, ExecutionMetrics } from './orchestrator.js';
export type { LLMConfig } from './llm-bridge.js';
