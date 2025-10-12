import { z } from 'zod';
import type { ASBRAIIntegration } from '../asbr-ai-integration.js';
import { checkMlxAvailability } from '../lib/infra/mlx.js';

const OLLAMA_TAGS_ENDPOINT = new URL('http://127.0.0.1:11434/api/tags');

// Model provider types
export type ModelProvider =
	| 'mlx'
	| 'ollama'
	| 'openai'
	| 'anthropic'
	| 'google'
	| 'zai'
	| 'moonshot'
	| 'openrouter'
	| 'groq';

// Model capability types
export type ModelCapability =
	| 'code-analysis'
	| 'test-generation'
	| 'documentation'
	| 'security-analysis'
	| 'multimodal'
	| 'streaming'
	| 'large-context';

// Model configuration schema
export const ModelConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	provider: z.enum([
		'mlx',
		'ollama',
		'openai',
		'anthropic',
		'google',
		'zai',
		'moonshot',
		'openrouter',
		'groq',
	]),
	priority: z.number().min(0).max(10),
	capabilities: z.array(
		z.enum([
			'code-analysis',
			'test-generation',
			'documentation',
			'security-analysis',
			'multimodal',
			'streaming',
			'large-context',
		]),
	),
	maxTokens: z.number().positive(),
	cost: z.object({
		input: z.number().min(0),
		output: z.number().min(0),
	}),
	endpoint: z.string().url().optional(),
	apiKey: z.string().optional(),
	enabled: z.boolean().default(true),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// MLX Model configurations
export const AVAILABLE_MLX_MODELS = {
	'GLM-4.5-4Bit': 'mlx/GLM-4.5-4Bit',
	'Qwen3-Coder-30B-4Bit': 'mlx/Qwen3-Coder-30B-4Bit',
} as const;

// Default model configurations
export const DEFAULT_MODELS: ModelConfig[] = [
	// MLX Models (Priority 8-10, Zero Cost)
	{
		id: 'glm-4.5-mlx',
		name: 'GLM-4.5 (MLX)',
		provider: 'mlx',
		priority: 10,
		capabilities: ['code-analysis', 'test-generation', 'documentation', 'large-context'],
		maxTokens: 128000,
		cost: { input: 0, output: 0 },
		enabled: true,
	},
	{
		id: 'qwen3-mlx',
		name: 'Qwen3-Coder (MLX)',
		provider: 'mlx',
		priority: 9,
		capabilities: ['code-analysis', 'test-generation', 'documentation', 'large-context'],
		maxTokens: 32768,
		cost: { input: 0, output: 0 },
		enabled: true,
	},

	// Ollama Models (Priority 6-7, Zero Cost)
	{
		id: 'llama3.1-ollama',
		name: 'Llama 3.1 (Ollama)',
		provider: 'ollama',
		priority: 7,
		capabilities: ['code-analysis', 'test-generation', 'documentation'],
		maxTokens: 131072,
		cost: { input: 0, output: 0 },
		endpoint: 'http://localhost:11434',
		enabled: true,
	},

	// Frontier Models (Priority 1-5, Paid)
	{
		id: 'gpt-4o-mini',
		name: 'GPT-4o Mini',
		provider: 'openai',
		priority: 5,
		capabilities: ['code-analysis', 'test-generation', 'documentation', 'large-context'],
		maxTokens: 128000,
		cost: { input: 0.00015, output: 0.0006 },
		enabled: true,
	},
	{
		id: 'claude-3-5-sonnet',
		name: 'Claude 3.5 Sonnet',
		provider: 'anthropic',
		priority: 4,
		capabilities: ['code-analysis', 'test-generation', 'documentation', 'large-context'],
		maxTokens: 200000,
		cost: { input: 0.000003, output: 0.000015 },
		enabled: true,
	},
];

// Task type to model mapping
export const TASK_MODEL_MAPPING: Record<string, string[]> = {
	'code-analysis': ['glm-4.5-mlx', 'qwen3-mlx', 'llama3.1-ollama', 'gpt-4o-mini'],
	'test-generation': ['glm-4.5-mlx', 'qwen3-mlx', 'llama3.1-ollama', 'claude-3-5-sonnet'],
	documentation: ['glm-4.5-mlx', 'llama3.1-ollama', 'gpt-4o-mini', 'claude-3-5-sonnet'],
	'security-analysis': ['gpt-4o-mini', 'claude-3-5-sonnet'],
	multimodal: ['gpt-4o-mini', 'claude-3-5-sonnet'],
};

export class ModelSelector {
	private models: ModelConfig[];
	private thermalManagementEnabled: boolean = true;
	private _mlxAvailable: boolean = false;
	private _ollamaAvailable: boolean = false;
	private readonly aiIntegration: ASBRAIIntegration;

	constructor(aiIntegration: ASBRAIIntegration, models?: ModelConfig[]) {
		this.aiIntegration = aiIntegration;
		this.models = models || DEFAULT_MODELS;
		this.checkProviderAvailability();
	}

	/**
	 * Check availability of MLX and Ollama providers
	 */
	private async checkProviderAvailability(): Promise<void> {
		try {
			const mlx = await checkMlxAvailability();
			this._mlxAvailable = mlx.available;
		} catch {
			this._mlxAvailable = false;
		}
                try {
                        // nosemgrep: semgrep.owasp-top-10-2021-a10-server-side-request-forgery - endpoint fixed to localhost Ollama API
                        const response = await fetch(OLLAMA_TAGS_ENDPOINT);
			this._ollamaAvailable = response.ok;
		} catch {
			this._ollamaAvailable = false;
		}
	}

	/**
	 * Select the optimal model based on task requirements and constraints
	 */
	selectOptimalModel(
		taskType: string,
		inputTokens?: number,
		requiredCapabilities: ModelCapability[] = [],
		preferredModel?: string,
	): ModelConfig | null {
		// If specific model requested and available, use it
		if (preferredModel) {
			const model = this.models.find((m) => m.id === preferredModel);
			if (model?.enabled) {
				return model;
			}
		}

		// Filter models based on availability and requirements
		const candidates = this.models.filter((model) => {
			// Check if model is enabled
			if (!model.enabled) return false;

			// Check provider availability
			if (model.provider === 'mlx' && !this.mlxAvailable) return false;
			if (model.provider === 'ollama' && !this.ollamaAvailable) return false;

			// Check capabilities
			if (requiredCapabilities.length > 0) {
				const hasAllCapabilities = requiredCapabilities.every((cap) =>
					model.capabilities.includes(cap),
				);
				if (!hasAllCapabilities) return false;
			}

			// Check token limits
			if (inputTokens && inputTokens > model.maxTokens) return false;

			// Thermal management: reduce MLX priority for large inputs
			if (
				this.thermalManagementEnabled &&
				model.provider === 'mlx' &&
				inputTokens &&
				inputTokens > 50000
			) {
				return false; // Skip MLX for very large inputs to prevent overheating
			}

			return true;
		});

		// Sort by priority (highest first)
		candidates.sort((a, b) => b.priority - a.priority);

		// Apply task-specific model preferences
		const taskModels = TASK_MODEL_MAPPING[taskType];
		if (taskModels) {
			candidates.sort((a, b) => {
				const aPreferred = taskModels.indexOf(a.id);
				const bPreferred = taskModels.indexOf(b.id);
				if (aPreferred !== -1 && bPreferred === -1) return -1;
				if (aPreferred === -1 && bPreferred !== -1) return 1;
				return 0;
			});
		}

		return candidates[0] || null;
	}

	/**
	 * Get available models for a specific task type
	 */
	getAvailableModels(taskType: string): ModelConfig[] {
		const requiredCapabilities = this.getCapabilitiesForTask(taskType);
		return this.models
			.filter((model) => {
				if (!model.enabled) return false;
				if (model.provider === 'mlx' && !this.mlxAvailable) return false;
				if (model.provider === 'ollama' && !this.ollamaAvailable) return false;

				return requiredCapabilities.every((cap) => model.capabilities.includes(cap));
			})
			.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Detect task type from input
	 */
	detectTaskType(input: string): string {
		// Order matters: check multimodal cues before generic code terms like "analyze"
		const orderedPatterns: Array<[string, RegExp]> = [
			['multimodal', /image|picture|diagram|screenshot|visual/i],
			['code-analysis', /code|review|refactor|debug|optimize/i],
			['test-generation', /test|spec|unit|integration|e2e|pytest/i],
			['documentation', /doc|readme|markdown|comment|explain/i],
			['security-analysis', /security|vulnerability|exploit|safe|audit/i],
		];

		for (const [taskType, pattern] of orderedPatterns) {
			if (pattern.test(input)) return taskType;
		}
		return 'general';
	}

	/**
	 * Get required capabilities for a task type
	 */
	private getCapabilitiesForTask(taskType: string): ModelCapability[] {
		const capabilityMap: Record<string, ModelCapability[]> = {
			'code-analysis': ['code-analysis'],
			'test-generation': ['test-generation'],
			documentation: ['documentation'],
			'security-analysis': ['security-analysis'],
			multimodal: ['multimodal'],
			general: [],
		};

		return capabilityMap[taskType] || [];
	}

	/**
	 * Enable or disable thermal management
	 */
	setThermalManagement(enabled: boolean): void {
		this.thermalManagementEnabled = enabled;
	}

	/**
	 * Check if AI integration is properly configured
	 */
	isAIIntegrationReady(): boolean {
		return this.aiIntegration !== undefined && this.aiIntegration !== null;
	}

	/**
	 * Update model configurations
	 */
	updateModels(models: ModelConfig[]): void {
		this.models = models;
	}

	/**
	 * Get provider availability status
	 */
	getProviderStatus(): Record<string, boolean> {
		return {
			mlx: this.mlxAvailable,
			ollama: this.ollamaAvailable,
		};
	}

	// Expose provider availability as getters for testability
	public get mlxAvailable(): boolean {
		return this._mlxAvailable;
	}

	public get ollamaAvailable(): boolean {
		return this._ollamaAvailable;
	}
}
