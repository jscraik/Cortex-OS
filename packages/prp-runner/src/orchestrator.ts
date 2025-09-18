// Type alias for PRP phases
export type PRPPhase = 'strategy' | 'build' | 'evaluation';

/**
 * @file packages/prp-runner/src/orchestrator.ts
 * Functional PRP orchestrator using closure state.
 */

import { createExecutionContext } from './lib/create-execution-context.js';
import { executeNeuron } from './lib/execute-neuron.js';
import { LLMBridge, type LLMConfig } from './llm-bridge.js';
import { ConcurrentExecutor } from './lib/concurrent-executor.js';

export interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
}

export interface ExecutionState {
	id: string;
	phase: PRPPhase;
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
	phase: PRPPhase;
	dependencies: string[];
	tools: string[];
	requiresLLM?: boolean;
	execute(state: ExecutionState, context: ExecutionContext): Promise<NeuronResult>;
}

export interface NeuronResult {
	output: unknown;
	evidence: unknown[];
	nextSteps: string[];
	artifacts: unknown[];
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
	getNeuronsByPhase(phase: PRPPhase): Neuron[];
	configureLLM(config: LLMConfig): void;
	getLLMConfig(): LLMConfig | undefined;
	createLLMBridge(): LLMBridge;
	executePRPCycle(blueprint: Blueprint): Promise<PRPExecutionResult>;
	generateProductRequirementsPrompt(blueprint: Blueprint): Promise<string>;
}

function register(neurons: Map<string, Neuron>, neuron: Neuron): void {
	if (neurons.has(neuron.id)) {
		throw new Error(`Neuron with ID ${neuron.id} already registered`);
	}
	neurons.set(neuron.id, neuron);
}

function getByPhase(neurons: Map<string, Neuron>, phase: PRPPhase): Neuron[] {
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
	const cycleId = `prp-${Date.now()}`;

	// Use concurrent executor for safe parallel execution
	const executor = new ConcurrentExecutor(4); // Limit to 4 concurrent neurons

	// Prepare neurons for concurrent execution
	const executableNeurons = Array.from(neurons.values()).map((neuron) => ({
		id: neuron.id,
		execute: async () => {
			const state: ExecutionState = {
				id: cycleId,
				phase: neuron.phase,
				blueprint,
				outputs: {}, // Start with empty outputs for each neuron
			};
			return await executeNeuron(neuron, state, context);
		},
	}));

	// Execute all neurons concurrently
	const results = await executor.executeConcurrently(executableNeurons);

	// Collect outputs safely
	const outputs: Record<string, unknown> = {};
	let hasFailures = false;

	results.forEach((result, neuronId) => {
		if (result.success) {
			outputs[neuronId] = result.result;
		} else {
			console.error(`Neuron ${neuronId} failed:`, result.error);
			hasFailures = true;
			// Store error information
			outputs[neuronId] = {
				error: result.error?.message,
				failed: true,
			};
		}
	});

	return {
		id: cycleId,
		phase: 'strategy',
		blueprint,
		outputs,
		status: hasFailures ? 'failed' : 'completed',
	};
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
			// Apply defaults for MLX provider
			if (config.provider === 'mlx' && !config.endpoint) {
				config = { ...config, endpoint: 'http://localhost:8000' };
			}
			llmConfig = config;
			llmBridge = new LLMBridge(config);
		},
		getLLMConfig: () => llmConfig,
		createLLMBridge: () => {
			if (!llmBridge) throw new Error('LLM must be configured before creating bridge');
			return llmBridge;
		},
		executePRPCycle: (blueprint) => executeCycle(neurons, llmConfig, llmBridge, blueprint),
		generateProductRequirementsPrompt: async (blueprint: Blueprint) => {
			// Basic validation similar to tests' expectations
			if (
				!blueprint ||
				typeof blueprint.title !== 'string' ||
				typeof blueprint.description !== 'string' ||
				!Array.isArray(blueprint.requirements)
			) {
				throw new Error('Invalid blueprint');
			}

			const strategyNeurons = getByPhase(neurons, 'strategy');
			const strategyIds = strategyNeurons.map((n) => n.id);

			const lines: string[] = [];
			lines.push(`Product Requirements for ${blueprint.title}`);
			lines.push(`Description: ${blueprint.description}`);
			lines.push('Requirements:');
			for (const req of blueprint.requirements) {
				lines.push(`- ${req}`);
			}
			if (strategyIds.length > 0) {
				lines.push(`Contributors: ${strategyIds.join(', ')}`);
			}

			return lines.join('\n');
		},
	};
}
