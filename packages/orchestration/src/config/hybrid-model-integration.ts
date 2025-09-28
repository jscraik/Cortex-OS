/**
 * brAInwav Cortex-OS Orchestration Package Hybrid Model Integration
 * Implements MLX-first routing with Ollama Cloud conjunction for the 7 required models
 */

import type { HybridMode, ModelCapability } from '../types.js';

export interface OrchestrationModelConfig {
	name: string;
	provider: 'mlx' | 'ollama' | 'ollama-cloud';
	priority: number;
	capabilities: ModelCapability[];
	path?: string;
	memory_gb: number;
	context_length: number;
	recommended_for: string[];
	coding_tasks?: string[];
	supports_vision?: boolean;
	quantization?: string;
	tier?: string;
	conjunction?: string[];
	verification?: string;
	fallback?: string[];
}

/**
 * Model factory functions to comply with ≤40 line function limit
 * Each function creates a specific model configuration
 */

/**
 * Create GLM-4.5 primary model configuration
 */
export const createGLMModel = (): OrchestrationModelConfig => ({
	name: 'GLM-4.5-mlx-4Bit',
	provider: 'mlx',
	priority: 100, // Highest priority - MLX first principle
	capabilities: ['chat', 'coding'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--brAInwav--GLM-4.5-mlx-4Bit',
	memory_gb: 8.0,
	context_length: 32768,
	recommended_for: ['coding', 'refactoring', 'debugging', 'documentation', 'general_purpose'],
	coding_tasks: ['general', 'refactoring', 'debugging', 'documentation'],
	quantization: '4bit',
	conjunction: ['qwen3-coder:30b'], // Available Ollama model for verification
	verification: 'qwen2.5-vl', // Vision model for UI-related debugging
});

/**
 * Create Qwen2.5-VL vision model configuration
 */
export const createVisionModel = (): OrchestrationModelConfig => ({
	name: 'mlx-community/Qwen2.5-VL-3B-Instruct-6bit',
	provider: 'mlx',
	priority: 95,
	capabilities: ['chat', 'vision'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit',
	memory_gb: 6.0,
	context_length: 32768,
	supports_vision: true,
	recommended_for: ['multimodal', 'vision_tasks', 'image_analysis'],
	coding_tasks: ['ui_analysis', 'diagram_interpretation', 'visual_debugging'],
	quantization: '6bit',
	fallback: ['glm-4.5'],
});

/**
 * Create Gemma-2-2B balanced performance model configuration
 */
export const createBalancedModel = (): OrchestrationModelConfig => ({
	name: 'mlx-community/gemma-2-2b-it-4bit',
	provider: 'mlx',
	priority: 90,
	capabilities: ['chat'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--gemma-2-2b-it-4bit',
	memory_gb: 4.0,
	context_length: 8192,
	recommended_for: ['efficient_inference', 'google_ecosystem', 'balanced_performance'],
	coding_tasks: ['general', 'code_review', 'documentation'],
	quantization: '4bit',
	fallback: ['glm-4.5'],
});

/**
 * Create SmolLM-135M lightweight model configuration
 */
export const createLightweightModel = (): OrchestrationModelConfig => ({
	name: 'mlx-community/SmolLM-135M-Instruct-4bit',
	provider: 'mlx',
	priority: 85,
	capabilities: ['chat'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/models--mlx-community--SmolLM-135M-Instruct-4bit',
	memory_gb: 1.0,
	context_length: 2048,
	recommended_for: ['ultra_light', 'testing', 'edge_devices'],
	coding_tasks: ['simple_fixes', 'basic_completion', 'testing'],
	quantization: '4bit',
	fallback: ['gemma-2-2b', 'glm-4.5'],
});

/**
 * Create Qwen3-Coder-30B large context model configuration
 */
export const createLargeContextModel = (): OrchestrationModelConfig => ({
	name: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
	provider: 'mlx',
	priority: 80,
	capabilities: ['chat', 'coding'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit',
	memory_gb: 32.0,
	context_length: 32768,
	recommended_for: ['architecture', 'complex_refactoring', 'large_context', 'system_design'],
	coding_tasks: ['architecture', 'complex_refactoring', 'large_codebase', 'system_design'],
	quantization: '4bit',
	conjunction: ['qwen3-coder:480b-cloud'], // Cloud conjunction for massive context
	fallback: ['glm-4.5'],
});

/**
 * Create Qwen3-Embedding-4B model configuration
 */
export const createEmbeddingModel = (): OrchestrationModelConfig => ({
	name: 'Qwen3-Embedding-4B',
	provider: 'mlx',
	priority: 100,
	capabilities: ['embedding'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/models--Qwen--Qwen3-Embedding-4B',
	memory_gb: 4.0,
	context_length: 8192,
	recommended_for: ['production', 'balanced_performance'],
	conjunction: ['nomic-embed-text:v1.5'], // Available Ollama embedding model
	verification: 'qwen3-embedding-0.6b',
});

/**
 * Create Qwen3-Reranker-4B model configuration
 */
export const createRerankingModel = (): OrchestrationModelConfig => ({
	name: 'Qwen3-Reranker-4B',
	provider: 'mlx',
	priority: 100,
	capabilities: ['reranking'],
	path: '/Volumes/ExternalSSD/ai-cache/huggingface/models--Qwen--Qwen3-Reranker-4B',
	memory_gb: 4.0,
	context_length: 8192,
	recommended_for: ['production_reranking', 'search_optimization'],
	fallback: ['nomic-embed-text:v1.5'], // Available Ollama fallback
});

/**
 * Compose all models into the main configuration object
 * Uses factory functions to ensure ≤40 line compliance
 */
export const ORCHESTRATION_MODELS: Record<string, OrchestrationModelConfig> = {
	'glm-4.5': createGLMModel(),
	'qwen2.5-vl': createVisionModel(),
	'gemma-2-2b': createBalancedModel(),
	'smollm-135m': createLightweightModel(),
	'qwen3-coder-30b': createLargeContextModel(),
	'qwen3-embedding-4b': createEmbeddingModel(),
	'qwen3-reranker-4b': createRerankingModel(),
};

/**
 * Hybrid routing configuration for orchestration
 */
export const ORCHESTRATION_HYBRID_CONFIG = {
	mlx_first_priority: 100,
	privacy_mode_enabled: false,
	hybrid_mode: 'performance' as HybridMode,

	task_routing: {
		// Primary tasks use GLM-4.5
		quick_fix: 'glm-4.5',
		code_generation: 'glm-4.5',
		refactoring: 'glm-4.5',
		debugging: 'glm-4.5',
		documentation: 'glm-4.5',

		// Large context and architecture tasks use Qwen3-Coder-30B
		architecture: 'qwen3-coder-30b',
		complex_refactoring: 'qwen3-coder-30b',
		large_context: 'qwen3-coder-30b',
		system_design: 'qwen3-coder-30b',

		// Vision tasks use Qwen2.5-VL
		vision_tasks: 'qwen2.5-vl',
		ui_analysis: 'qwen2.5-vl',
		diagram_interpretation: 'qwen2.5-vl',

		// Lightweight tasks use smaller models
		simple_fixes: 'smollm-135m',
		testing: 'smollm-135m',
		utility_tasks: 'smollm-135m',

		// Balanced tasks use Gemma-2-2B
		general_purpose: 'gemma-2-2b',
		code_review: 'gemma-2-2b',
		fast_responses: 'gemma-2-2b',

		// Always available tier
		always_available: 'gemma-2-2b',

		// Default
		default: 'glm-4.5',
	},

	embedding_routing: {
		primary: 'qwen3-embedding-4b',
		verification: 'qwen3-embedding-0.6b', // Available alternative
		fallback: 'nomic-embed-text:v1.5', // Available Ollama fallback
	},

	reranking_routing: {
		primary: 'qwen3-reranker-4b',
		fallback: 'nomic-embed-text:v1.5', // Available Ollama fallback
	},

	conjunction_patterns: {
		// When to use cloud models in conjunction
		complex_analysis: {
			mlx_primary: 'glm-4.5',
			cloud_verification: 'qwen3-coder:480b-cloud',
			context_threshold: 50000,
		},
		enterprise_tasks: {
			mlx_primary: 'glm-4.5',
			cloud_enhanced: 'qwen3-coder:480b-cloud',
			complexity_threshold: 'enterprise',
		},
		repository_analysis: {
			mlx_primary: 'glm-4.5',
			cloud_specialized: 'qwen3-coder:480b-cloud',
			context_threshold: 100000,
		},
	},

	performance_tiers: {
		ultra_fast: {
			models: ['smollm-135m', 'gemma-2-2b'],
			max_latency_ms: 500,
			memory_limit_gb: 4,
		},
		balanced: {
			models: ['gemma-2-2b', 'qwen2.5-vl'],
			max_latency_ms: 2000,
			memory_limit_gb: 8,
		},
		high_performance: {
			models: ['glm-4.5', 'qwen3-coder-30b'],
			max_latency_ms: 5000,
			memory_limit_gb: 32,
		},
	},

	branding: {
		log_prefix: 'brAInwav Cortex-OS Orchestration:',
		attribution: 'Co-authored-by: brAInwav Development Team',
	},
};

/**
 * Model validation result type
 */
export interface ModelValidationResult {
	valid: boolean;
	missing: string[];
}

/**
 * Model selection options type
 */
export interface ModelSelectionOptions {
	contextLength?: number;
	complexity?: string;
	capability?: ModelCapability;
}

/**
 * Orchestration router interface for dependency injection and testing
 */
export interface IOrchestrationHybridRouter {
	selectModel(task: string, options?: ModelSelectionOptions): OrchestrationModelConfig | null;
	getEmbeddingModel(): OrchestrationModelConfig;
	getRerankingModel(): OrchestrationModelConfig;
	getVisionModel(): OrchestrationModelConfig;
	getAlwaysOnModel(): OrchestrationModelConfig;
	setPrivacyMode(enabled: boolean): void;
	setHybridMode(mode: HybridMode): void;
	getAllModels(): OrchestrationModelConfig[];
	validateModels(): ModelValidationResult;
}
export class OrchestrationHybridRouter implements IOrchestrationHybridRouter {
	private models: Map<string, OrchestrationModelConfig> = new Map();

	constructor() {
		// Load the 7 required models
		Object.entries(ORCHESTRATION_MODELS).forEach(([key, config]) => {
			this.models.set(key, config);
		});

		console.log('brAInwav Cortex-OS Orchestration: Initialized with 7 required models');
	}

	/**
	 * Select model based on task and context
	 */
	selectModel(task: string, _options: ModelSelectionOptions = {}): OrchestrationModelConfig | null {
		const routing = ORCHESTRATION_HYBRID_CONFIG.task_routing;
		const modelKey = routing[task as keyof typeof routing] || routing.default;
		const model = this.models.get(modelKey);

		if (!model) {
			return this.handleModelNotFound(modelKey, task);
		}

		return model;
	}

	/**
	 * Handle case when model is not found
	 */
	private handleModelNotFound(modelKey: string, task: string): OrchestrationModelConfig | null {
		console.warn(`brAInwav Cortex-OS: Model ${modelKey} not found for task ${task}`);
		return this.models.get('glm-4.5') || null; // Fallback to primary
	}

	/**
	 * Get embedding model
	 */
	getEmbeddingModel(): OrchestrationModelConfig {
		const model = this.models.get('qwen3-embedding-4b');
		if (!model) {
			throw new Error('brAInwav Cortex-OS: Embedding model (qwen3-embedding-4b) not found');
		}
		return model;
	}

	/**
	 * Get reranking model
	 */
	getRerankingModel(): OrchestrationModelConfig {
		const model = this.models.get('qwen3-reranker-4b');
		if (!model) {
			throw new Error('brAInwav Cortex-OS: Reranking model (qwen3-reranker-4b) not found');
		}
		return model;
	}

	/**
	 * Get vision model
	 */
	getVisionModel(): OrchestrationModelConfig {
		const model = this.models.get('qwen2.5-vl');
		if (!model) {
			throw new Error('brAInwav Cortex-OS: Vision model (qwen2.5-vl) not found');
		}
		return model;
	}

	/**
	 * Get always-on model for quick responses
	 */
	getAlwaysOnModel(): OrchestrationModelConfig {
		const model = this.models.get('gemma-2-2b');
		if (!model) {
			throw new Error('brAInwav Cortex-OS: Always-on model (gemma-2-2b) not found');
		}
		return model;
	}

	/**
	 * Enable/disable privacy mode
	 */
	setPrivacyMode(enabled: boolean): void {
		this.privacyMode = enabled;
		console.log(`brAInwav Cortex-OS: Privacy mode ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Set hybrid mode
	 */
	setHybridMode(mode: HybridMode): void {
		this.hybridMode = mode;
		console.log(`brAInwav Cortex-OS: Hybrid mode set to ${mode}`);
	}

	/**
	 * Get all available models
	 */
	getAllModels(): OrchestrationModelConfig[] {
		return Array.from(this.models.values());
	}

	/**
	 * Validate that all 7 required models are available
	 */
	validateModels(): ModelValidationResult {
		const requiredModels = Object.keys(ORCHESTRATION_MODELS);
		const missing: string[] = [];

		requiredModels.forEach((modelKey) => {
			if (!this.models.has(modelKey)) {
				missing.push(modelKey);
			}
		});

		const valid = missing.length === 0;

		if (valid) {
			console.log('brAInwav Cortex-OS: All 7 required orchestration models validated successfully');
		} else {
			console.error('brAInwav Cortex-OS: Missing required models:', missing);
		}

		return { valid, missing };
	}
}

/**
 * Functional utilities for model management
 */

/**
 * Create a new orchestration router instance
 */
export const createOrchestrationRouter = (): IOrchestrationHybridRouter => {
	return new OrchestrationHybridRouter();
};

/**
 * Get model by task using functional approach
 */
export const selectModelForTask = (
	task: string,
	models: Map<string, OrchestrationModelConfig>,
	_options: ModelSelectionOptions = {},
): OrchestrationModelConfig | null => {
	const routing = ORCHESTRATION_HYBRID_CONFIG.task_routing;
	const modelKey = routing[task as keyof typeof routing] || routing.default;
	const model = models.get(modelKey);

	if (!model) {
		console.warn(`brAInwav Cortex-OS: Model ${modelKey} not found for task ${task}`);
		return models.get('glm-4.5') || null;
	}

	return model;
};

/**
 * Check if privacy mode constraints should be applied
 */
export const shouldApplyPrivacyConstraints = (
	privacyMode: boolean,
	contextLength?: number,
	complexity?: string,
): boolean => {
	if (privacyMode) return true;

	// Apply privacy constraints for very large contexts or enterprise complexity
	const largeContext = contextLength && contextLength > 100000;
	const enterpriseComplexity = complexity === 'enterprise';

	return largeContext || enterpriseComplexity;
};

/**
 * Validate model availability
 */
export const validateRequiredModels = (
	models: Map<string, OrchestrationModelConfig>,
): ModelValidationResult => {
	const requiredModels = Object.keys(ORCHESTRATION_MODELS);
	const missing: string[] = [];

	requiredModels.forEach((modelKey) => {
		if (!models.has(modelKey)) {
			missing.push(modelKey);
		}
	});

	const valid = missing.length === 0;
	return { valid, missing };
};

/**
 * Export singleton instance for backward compatibility
 */
export const orchestrationRouter: IOrchestrationHybridRouter = createOrchestrationRouter();
