/**
 * @file packages/prp-runner/src/orchestrator.ts
 * @description Factory-based PRP orchestrator using closure state
 * @maintainer @jamiescottcraik
 * @version 1.1.0
 */

import {
  configureLLM as configureLLMBridge,
  generate as llmGenerate,
  getProvider,
  getModel,
  getMLXAdapter,
  listMLXModels,
  checkProviderHealth,
  shutdown as shutdownLLM,
  type LLMConfig,
  type LLMState,
  type LLMGenerateOptions,
} from './llm-bridge.js';

// Minimal interfaces driven by tests
export interface Neuron {
  id: string;
  role: string;
  phase: 'strategy' | 'build' | 'evaluation';
  dependencies: string[];
  tools: string[];
  requiresLLM?: boolean; // Flag for LLM-powered neurons
  execute(state: any, context: any): Promise<NeuronResult>;
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

/**
 * createPRPOrchestrator - returns orchestrator API with closure-based state
 */
export const createPRPOrchestrator = () => {
  const neurons: Map<string, Neuron> = new Map();
  let llmState: LLMState | undefined;
  let llmBridge:
    | {
        getProvider: () => string;
        getModel: () => string;
        getMLXAdapter: () => any;
        listMLXModels: () => Promise<any>;
        checkProviderHealth: () => Promise<{ healthy: boolean; message: string }>;
        generate: (prompt: string, options?: LLMGenerateOptions) => Promise<string>;
        shutdown: () => Promise<void>;
      }
    | undefined;

  const buildLLMBridge = (state: LLMState) => ({
    getProvider: () => getProvider(state),
    getModel: () => getModel(state),
    getMLXAdapter: () => getMLXAdapter(state),
    listMLXModels: () => listMLXModels(state),
    checkProviderHealth: () => checkProviderHealth(state),
    generate: (prompt: string, options: LLMGenerateOptions = {}) =>
      llmGenerate(state, prompt, options),
    shutdown: () => shutdownLLM(state),
  });

  return {
    /** Get count of registered neurons */
    getNeuronCount(): number {
      return neurons.size;
    },

    /** Register a neuron with duplicate checking */
    registerNeuron(neuron: Neuron): void {
      if (neurons.has(neuron.id)) {
        throw new Error(`Neuron with ID ${neuron.id} already registered`);
      }
      neurons.set(neuron.id, neuron);
    },

    /** Get neurons filtered by phase */
    getNeuronsByPhase(phase: 'strategy' | 'build' | 'evaluation'): Neuron[] {
      return Array.from(neurons.values()).filter((neuron) => neuron.phase === phase);
    },

    /** Configure LLM provider */
    configureLLM(config: LLMConfig): void {
      llmState = configureLLMBridge(config);
      llmBridge = buildLLMBridge(llmState);
    },

    /** Get LLM configuration */
    getLLMConfig(): LLMConfig | undefined {
      return llmState?.config;
    },

    /** Create LLM bridge */
    createLLMBridge() {
      if (!llmBridge) {
        throw new Error('LLM must be configured before creating bridge');
      }
      return llmBridge;
    },

    /** Execute PRP cycle with optional LLM integration */
    async executePRPCycle(blueprint: any): Promise<any> {
      if (neurons.size === 0) {
        throw new Error('No neurons registered');
      }

      const llmNeurons = Array.from(neurons.values()).filter((n) => n.requiresLLM);
      if (llmNeurons.length > 0 && !llmState) {
        throw new Error('LLM configuration required for LLM-powered neurons');
      }

      const context: any = {
        workingDirectory: process.cwd(),
        projectRoot: process.cwd(),
        outputDirectory: './dist',
        tempDirectory: './tmp',
        environmentVariables: process.env,
        timeout: 30000,
        llmBridge,
      };

      const outputs: any = {};

      for (const neuron of neurons.values()) {
        const state = { id: `prp-${Date.now()}`, phase: 'strategy', blueprint, outputs };
        const result = await neuron.execute(state, context);
        outputs[neuron.id] = result.output;
      }

      return {
        id: `prp-${Date.now()}`,
        phase: 'strategy',
        blueprint,
        outputs,
        status: 'completed',
      };
    },
  };
};

export type PRPOrchestrator = ReturnType<typeof createPRPOrchestrator>;
// Backward compatibility export
export { createPRPOrchestrator as PRPOrchestrator };
