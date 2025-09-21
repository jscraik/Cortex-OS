// Type alias for PRP phases
export type PRPPhase = 'strategy' | 'build' | 'evaluation';

/**
 * @file packages/prp-runner/src/orchestrator.ts
 * Functional PRP orchestrator using closure state.
 */

import { loadConfig } from './config/index.js';
import { ConcurrentExecutor } from './lib/concurrent-executor.js';
import { createExecutionContext } from './lib/create-execution-context.js';
import { executeNeuron } from './lib/execute-neuron.js';
import { LLMBridge, type LLMConfig } from './llm-bridge.js';

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

function sanitizeKey(input: string): string {
	return input.replace(/\W/g, '_').toUpperCase();
}

function initGraph(neurons: Map<string, Neuron>): {
	ids: string[];
	indegree: Map<string, number>;
	dependents: Map<string, string[]>;
} {
	const ids = Array.from(neurons.keys());
	const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
	const dependents = new Map<string, string[]>();
	for (const n of neurons.values()) {
		for (const dep of n.dependencies) {
			if (!neurons.has(dep)) throw new Error(`Unknown dependency '${dep}' for neuron '${n.id}'`);
			indegree.set(n.id, (indegree.get(n.id) || 0) + 1);
			dependents.set(dep, [...(dependents.get(dep) || []), n.id]);
		}
	}
	return { ids, indegree, dependents };
}

function nextReady(ids: string[], indegree: Map<string, number>, visited: Set<string>): string[] {
	return ids.filter((id) => !visited.has(id) && (indegree.get(id) || 0) === 0);
}

function buildLevels(neurons: Map<string, Neuron>): string[][] {
	const { ids, indegree, dependents } = initGraph(neurons);
	const levels: string[][] = [];
	const visited = new Set<string>();
	let ready = nextReady(ids, indegree, visited);
	while (ready.length > 0) {
		const level: string[] = [];
		for (const id of ready) {
			if (visited.has(id)) continue;
			visited.add(id);
			level.push(id);
			for (const d of dependents.get(id) || []) {
				indegree.set(d, (indegree.get(d) || 0) - 1);
			}
		}
		if (level.length > 0) levels.push(level);
		ready = nextReady(ids, indegree, visited);
	}
	if (visited.size !== ids.length) throw new Error('Circular dependencies detected');
	return levels;
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

	const executor = new ConcurrentExecutor(4);
	const levels = buildLevels(neurons);
	const outputs: Record<string, unknown> = {};
	let hasFailures = false;

	for (const level of levels) {
		const tasks = level.map((id) => {
			const neuron = neurons.get(id);
			if (!neuron) throw new Error(`Neuron '${id}' not found`);
			return {
				id,
				execute: async () => {
					const state: ExecutionState = {
						id: cycleId,
						phase: neuron.phase,
						blueprint,
						outputs: {},
					};
					return await executeNeuron(neuron, state, context);
				},
			};
		});
		const results = await executor.executeConcurrently(tasks);
		results.forEach((result, neuronId) => {
			if (result.success) {
				outputs[neuronId] = result.result;
			} else {
				console.error(`Neuron ${neuronId} failed:`, result.error);
				hasFailures = true;
				outputs[neuronId] = { error: result.error?.message, failed: true };
			}
		});
	}

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

	function applyPerModelMlxEnv(config: LLMConfig): LLMConfig {
		if (config.provider !== 'mlx' || !config.mlxModel) return config;
		const modelKey = sanitizeKey(String(config.mlxModel));
		const tVar = `PRP_AI_BREAKERS_MLX_${modelKey}_THRESHOLD`;
		const toVar = `PRP_AI_BREAKERS_MLX_${modelKey}_TIMEOUT`;
		const thr = process.env[tVar] ? Number(process.env[tVar]) : undefined;
		const to = process.env[toVar] ? Number(process.env[toVar]) : undefined;
		const has = (v: number | undefined) => v !== undefined && !Number.isNaN(v);
		if (!has(thr) && !has(to)) return config;
		const prevMlx = config.breakers?.mlx ?? {};
		return {
			...config,
			breakers: {
				...(config.breakers ?? {}),
				mlx: {
					...prevMlx,
					...(has(thr) ? { threshold: thr } : {}),
					...(has(to) ? { timeout: to } : {}),
				},
			},
		};
	}

	return {
		getNeuronCount: () => neurons.size,
		registerNeuron: (neuron) => register(neurons, neuron),
		getNeuronsByPhase: (phase) => getByPhase(neurons, phase),
		configureLLM: (config) => {
			// Apply defaults for MLX provider
			if (config.provider === 'mlx' && !config.endpoint) {
				config = { ...config, endpoint: 'http://localhost:8000' };
			}
			// Merge breakers from AppConfig if not supplied explicitly
			try {
				const appCfg = loadConfig();
				if (appCfg.ai?.breakers && !config.breakers) {
					const b = appCfg.ai.breakers as unknown as {
						ollama?: { threshold?: number; timeout?: number };
						mlx?: { threshold?: number; timeout?: number };
					};
					config = { ...config, breakers: b };
				}
			} catch {
				// ignore config load errors in orchestrator context
			}
			// Per-model MLX breaker overrides via env
			config = applyPerModelMlxEnv(config);
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
