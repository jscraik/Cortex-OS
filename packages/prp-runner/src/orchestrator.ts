/**
 * @file packages/prp-runner/src/orchestrator.ts
 * @description TDD-driven PRP Orchestrator - Minimal implementation to pass tests
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status TDD-GREEN-PHASE
 *
 * TDD Notes:
 * - This implementation follows strict Red-Green-Refactor cycle
 * - Every method exists to make a specific test pass
 * - No functionality without corresponding test
 * - LLM integration driven by failing tests in llm-integration.test.ts
 * - 85% coverage enforced
 */

import { LLMBridge, LLMConfig } from './llm-bridge.js';
import { createExecutionContext } from './lib/create-execution-context.js';
import { executeNeuron } from './lib/execute-neuron.js';

// Minimal interfaces driven by tests
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
  requiresLLM?: boolean; // Flag for LLM-powered neurons
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

/**
 * PRPOrchestrator - TDD Implementation
 *
 * This class is built test-first following strict TDD principles:
 * 1. Each method exists because a test demands it
 * 2. Implementation is minimal to make tests pass
 * 3. No speculative features without tests
 */
export class PRPOrchestrator {
  private neurons: Map<string, Neuron> = new Map();
  private llmConfig?: LLMConfig;
  private llmBridge?: LLMBridge;

  constructor() {
    // Minimal constructor - tests require instance creation
  }

  /**
   * Get count of registered neurons
   * Driven by test: "should start with zero neurons registered"
   */
  getNeuronCount(): number {
    return this.neurons.size;
  }

  /**
   * Register a neuron with duplicate checking
   * Driven by tests: "should register a single neuron", "should prevent duplicate neuron IDs"
   */
  registerNeuron(neuron: Neuron): void {
    if (this.neurons.has(neuron.id)) {
      throw new Error(`Neuron with ID ${neuron.id} already registered`);
    }
    this.neurons.set(neuron.id, neuron);
  }

  /**
   * Get neurons filtered by phase
   * Driven by test: "should list registered neurons by phase"
   */
  getNeuronsByPhase(phase: 'strategy' | 'build' | 'evaluation'): Neuron[] {
    return Array.from(this.neurons.values()).filter((neuron) => neuron.phase === phase);
  }

  /**
   * Configure LLM provider
   * Driven by test: "should configure [MLX|Ollama] provider"
   */
  configureLLM(config: LLMConfig): void {
    this.llmConfig = config;
    this.llmBridge = new LLMBridge(config);
  }

  /**
   * Get LLM configuration
   * Driven by test: "should configure [MLX|Ollama] provider"
   */
  getLLMConfig(): LLMConfig | undefined {
    return this.llmConfig;
  }

  /**
   * Create LLM bridge
   * Driven by test: "should create LLM bridge with [provider] configuration"
   */
  createLLMBridge(): LLMBridge {
    if (!this.llmBridge) {
      throw new Error('LLM must be configured before creating bridge');
    }
    return this.llmBridge;
  }

  /**
   * Execute PRP cycle with LLM integration
   * Enhanced to support LLM-powered neurons
   */
  async executePRPCycle(blueprint: Blueprint): Promise<PRPExecutionResult> {
    if (this.neurons.size === 0) {
      throw new Error('No neurons registered');
    }

    // Check if any neurons require LLM and configuration is missing
    const llmNeurons = Array.from(this.neurons.values()).filter((n) => n.requiresLLM);
    if (llmNeurons.length > 0 && !this.llmConfig) {
      throw new Error('LLM configuration required for LLM-powered neurons');
    }

    const context = createExecutionContext(this.llmBridge);
    const outputs: Record<string, unknown> = {};
    const cycleId = `prp-${Date.now()}`;

    for (const neuron of this.neurons.values()) {
      const state: ExecutionState = { id: cycleId, phase: neuron.phase, blueprint, outputs };
      const result = await executeNeuron(neuron, state, context);
      outputs[neuron.id] = result.output;
    }

    return {
      id: cycleId,
      phase: 'strategy',
      blueprint,
      outputs,
      status: 'completed',
    };
  }
}
