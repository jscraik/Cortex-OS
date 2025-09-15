import { Ollama } from 'ollama';
import { z } from 'zod';
import { AVAILABLE_MLX_MODELS, createMLXAdapter } from './mlx-adapter.js';

const llmConfigSchema = z.object({
	provider: z.enum(['mlx', 'ollama']),
	endpoint: z.string().url().optional(),
	model: z.string().optional(),
	mlxModel: z.string().optional(),
	knifePath: z.string().optional(),
});
function normalizeConfig(config) {
	const normalized = { ...config };
	if (normalized.provider === 'ollama') {
		if (!normalized.endpoint) throw new Error('Ollama endpoint is required');
		normalized.mlxModel = undefined;
		normalized.knifePath = undefined;
	} else {
		if (!normalized.mlxModel)
			throw new Error('MLX model is required for MLX provider');
		// Convert string to enum key if needed
		if (typeof normalized.mlxModel === 'string') {
			if (Object.keys(AVAILABLE_MLX_MODELS).includes(normalized.mlxModel)) {
				// Already correct type
			} else {
				throw new Error(`Invalid MLX model: ${normalized.mlxModel}`);
			}
		}
		// Don't set endpoint to undefined if it's already set
		normalized.model = undefined;
	}
	return normalized;
}
function createOllamaAdapter(cfg) {
	const client = new Ollama({ host: cfg.endpoint });
	return {
		async generate({ prompt, temperature, maxTokens, model }) {
			const res = await client.generate({
				model: model || cfg.model || 'llama3',
				prompt,
				stream: false,
				options: {
					temperature: temperature ?? 0.7,
					num_predict: maxTokens ?? 512,
				},
			});
			return { text: res.response || '' };
		},
	};
}
export function configureLLM(config) {
	const normalized = normalizeConfig(config);
	const cfgRaw = llmConfigSchema.parse(normalized);
	let cfg;
	if (cfgRaw.provider === 'mlx') {
		if (typeof cfgRaw.mlxModel === 'string') {
			if (Object.keys(AVAILABLE_MLX_MODELS).includes(cfgRaw.mlxModel)) {
				cfg = {
					...cfgRaw,
					mlxModel: cfgRaw.mlxModel,
				};
			} else {
				throw new Error(`Invalid MLX model: ${cfgRaw.mlxModel}`);
			}
		} else {
			cfg = { ...cfgRaw, mlxModel: undefined };
		}
	} else {
		// For non-MLX providers, always set mlxModel: undefined
		cfg = { ...cfgRaw, mlxModel: undefined };
	}
	const state = { config: cfg };
	if (cfg.provider === 'ollama') {
		state.ollamaAdapter = createOllamaAdapter(cfg);
	} else if (cfg.mlxModel) {
		state.mlxAdapter = createMLXAdapter(cfg.mlxModel, {
			knifePath: cfg.knifePath,
			maxTokens: 512,
			temperature: 0.7,
		});
	}
	return state;
}
export function getProvider(state) {
	return state.config.provider;
}
export function getModel(state) {
	if (state.config.provider === 'ollama') {
		return state.config.model || 'llama3';
	} else {
		// For MLX, return the model value (not key) for display purposes
		const mlxModelKey = state.config.mlxModel || 'QWEN_SMALL';
		return AVAILABLE_MLX_MODELS[mlxModelKey] || AVAILABLE_MLX_MODELS.QWEN_SMALL;
	}
}
export function getMLXAdapter(state) {
	return state.mlxAdapter;
}
export async function listMLXModels(state) {
	if (state.config.provider !== 'mlx' || !state.mlxAdapter) {
		throw new Error('MLX adapter not available');
	}
	return state.mlxAdapter.listModels();
}
export async function checkProviderHealth(state) {
	if (state.config.provider === 'mlx' && state.mlxAdapter) {
		return state.mlxAdapter.checkHealth();
	}
	if (state.config.provider === 'ollama' && state.ollamaAdapter) {
		try {
			await state.ollamaAdapter.generate({ prompt: '', maxTokens: 1 });
			return { healthy: true, message: 'Ollama healthy' };
		} catch (error) {
			return {
				healthy: false,
				message: `Ollama error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
	return { healthy: false, message: 'Unknown provider' };
}
export async function generate(state, prompt, options = {}) {
	if (state.config.provider === 'ollama') {
		if (!state.ollamaAdapter) throw new Error('Ollama adapter not initialized');
		const result = await state.ollamaAdapter.generate({
			prompt,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			model: state.config.model,
		});
		return result.text;
	}
	if (state.config.provider === 'mlx') {
		return generateWithMLX(state, prompt, options);
	}
	throw new Error(
		`Generation not implemented for provider: ${state.config.provider}`,
	);
}
async function generateWithMLX(state, prompt, options) {
	if (!state.mlxAdapter) throw new Error('MLX adapter not initialized');
	const health = await state.mlxAdapter.checkHealth();
	if (!health.healthy) {
		throw new Error(`MLX model not healthy: ${health.message}`);
	}
	return state.mlxAdapter.generate({
		prompt,
		maxTokens: options.maxTokens ?? 512,
		temperature: options.temperature ?? 0.7,
	});
}
// Type guard for shutdown method on MLXAdapter
function hasShutdown(adapter) {
	return (
		typeof adapter === 'object' &&
		adapter !== null &&
		typeof adapter.shutdown === 'function'
	);
}
export async function shutdown(state) {
	if (state.mlxAdapter && hasShutdown(state.mlxAdapter)) {
		await state.mlxAdapter.shutdown();
	}
}
export class LLMBridge {
	state;
	constructor(config) {
		this.state = configureLLM(config);
	}
	getProvider() {
		return getProvider(this.state);
	}
	getModel() {
		return getModel(this.state);
	}
	async generate(prompt, options) {
		return generate(this.state, prompt, options);
	}
	async listModels() {
		return listMLXModels(this.state);
	}
	async checkHealth() {
		return checkProviderHealth(this.state);
	}
	async shutdown() {
		await shutdown(this.state);
	}
}
//# sourceMappingURL=llm-bridge.js.map
