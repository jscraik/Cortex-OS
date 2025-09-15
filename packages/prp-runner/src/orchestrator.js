/**
 * @file packages/prp-runner/src/orchestrator.ts
 * Functional PRP orchestrator using closure state.
 */
import { createExecutionContext } from './lib/create-execution-context.js';
import { executeNeuron } from './lib/execute-neuron.js';
import { LLMBridge } from './llm-bridge.js';

function register(neurons, neuron) {
	if (neurons.has(neuron.id)) {
		throw new Error(`Neuron with ID ${neuron.id} already registered`);
	}
	neurons.set(neuron.id, neuron);
}
function getByPhase(neurons, phase) {
	return Array.from(neurons.values()).filter((n) => n.phase === phase);
}
async function executeCycle(neurons, llmConfig, llmBridge, blueprint) {
	if (neurons.size === 0) throw new Error('No neurons registered');
	const llmNeurons = Array.from(neurons.values()).filter((n) => n.requiresLLM);
	if (llmNeurons.length > 0 && !llmConfig) {
		throw new Error('LLM configuration required for LLM-powered neurons');
	}
	const context = createExecutionContext(llmBridge);
	const outputs = {};
	const cycleId = `prp-${Date.now()}`;
	for (const neuron of neurons.values()) {
		const state = {
			id: cycleId,
			phase: neuron.phase,
			blueprint,
			outputs,
		};
		const result = await executeNeuron(neuron, state, context);
		outputs[neuron.id] = result;
	}
	return {
		id: cycleId,
		phase: 'strategy',
		blueprint,
		outputs,
		status: 'completed',
	};
}
export function createPRPOrchestrator() {
	const neurons = new Map();
	let llmConfig;
	let llmBridge;
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
			if (!llmBridge)
				throw new Error('LLM must be configured before creating bridge');
			return llmBridge;
		},
		executePRPCycle: (blueprint) =>
			executeCycle(neurons, llmConfig, llmBridge, blueprint),
		generateProductRequirementsPrompt: async (blueprint) => {
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
			const lines = [];
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
//# sourceMappingURL=orchestrator.js.map
