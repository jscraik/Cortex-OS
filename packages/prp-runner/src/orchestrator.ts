/**
 * @file packages/prp-runner/src/orchestrator.ts
 * Functional PRP orchestrator using closure state.
 */

import { LLMBridge, type LLMConfig } from './llm-bridge.js';
import { createExecutionContext } from './lib/create-execution-context.js';
import { executeNeuron } from './lib/execute-neuron.js';

export interface Blueprint {
  title: string;
  description: string;
  requirements: string[];
}

export interface ExecutionState {
  id: string;
  phase: 'strategy' | 'build' | 'evaluation';
  blueprint: Blueprint;
  outputs: Record<string, unknown>;
}

export interface ExecutionContext {
  workingDirectory: string;
  projectRoot: string;
  outputDirectory: string;
  tempDirectory: string;
  environmentVariables: NodeJS.ProcessEnv;
  timeout: number;
  llmBridge?: LLMBridge;
}

export interface PRPExecutionResult extends ExecutionState {
  status: 'completed' | 'failed';
}

export interface Neuron {
  id: string;
  role: string;
  phase: 'strategy' | 'build' | 'evaluation';
  dependencies: string[];
  tools: string[];
  requiresLLM?: boolean;
  execute(state: ExecutionState, context: ExecutionContext): Promise<NeuronResult>;
}

export interface NeuronResult {
  output: any;
  evidence: any[];
  nextSteps: string[];
  artifacts: any[];
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  startTime: string;
  endTime: string;
  duration: number;
  toolsUsed: string[];
  filesCreated: number;
  filesModified: number;
  commandsExecuted: number;
}

export interface PRPOrchestrator {
  getNeuronCount(): number;
  registerNeuron(neuron: Neuron): void;
  getNeuronsByPhase(phase: 'strategy' | 'build' | 'evaluation'): Neuron[];
  configureLLM(config: LLMConfig): void;
  getLLMConfig(): LLMConfig | undefined;
  createLLMBridge(): LLMBridge;
  executePRPCycle(blueprint: Blueprint): Promise<PRPExecutionResult>;
}

function register(neurons: Map<string, Neuron>, neuron: Neuron): void {
  if (neurons.has(neuron.id)) {
    throw new Error(`Neuron with ID ${neuron.id} already registered`);
  }
  neurons.set(neuron.id, neuron);
}

function getByPhase(
  neurons: Map<string, Neuron>,
  phase: 'strategy' | 'build' | 'evaluation',
): Neuron[] {
  return Array.from(neurons.values()).filter((n) => n.phase === phase);
}

async function executeCycle(
  neurons: Map<string, Neuron>,
  llmConfig: LLMConfig | undefined,
  llmBridge: LLMBridge | undefined,
  blueprint: Blueprint,
): Promise<PRPExecutionResult> {
  if (neurons.size === 0) throw new Error('No neurons registered');
  const llmNeurons = Array.from(neurons.values()).filter((n) => n.requiresLLM);
  if (llmNeurons.length > 0 && !llmConfig) {
    throw new Error('LLM configuration required for LLM-powered neurons');
  }
  const context = createExecutionContext(llmBridge);
  const outputs: Record<string, unknown> = {};
  const cycleId = `prp-${Date.now()}`;
  for (const neuron of neurons.values()) {
    const state: ExecutionState = { id: cycleId, phase: neuron.phase, blueprint, outputs };
    const result = await executeNeuron(neuron, state, context);
    outputs[neuron.id] = result.output;
  }
  return { id: cycleId, phase: 'strategy', blueprint, outputs, status: 'completed' };
}

export function createPRPOrchestrator(): PRPOrchestrator {
  const neurons = new Map<string, Neuron>();
  let llmConfig: LLMConfig | undefined;
  let llmBridge: LLMBridge | undefined;

  return {
    getNeuronCount: () => neurons.size,
    registerNeuron: (neuron) => register(neurons, neuron),
    getNeuronsByPhase: (phase) => getByPhase(neurons, phase),
    configureLLM: (config) => {
      llmConfig = config;
      llmBridge = new LLMBridge(config);
    },
    getLLMConfig: () => llmConfig,
    createLLMBridge: () => {
      if (!llmBridge) throw new Error('LLM must be configured before creating bridge');
      return llmBridge;
    },
    executePRPCycle: (blueprint) => executeCycle(neurons, llmConfig, llmBridge, blueprint),
  };
}

