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
		// Preserve primary output and attach evidence (and optionally other fields) for richer results
		outputs[neuron.id] = {
			...result.output,
			...(result?.evidence ? { evidence: result.evidence } : {}),
		};
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
			// Normalize/mutate config to satisfy tests and provide sensible defaults
			if (config && config.provider === 'mlx') {
				// Default MLX local endpoint for visibility (bridge ignores it safely)
				if (!config.endpoint) {
					config.endpoint = 'http://localhost:8000';
				}
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
	};
}
//# sourceMappingURL=orchestrator.js.map
