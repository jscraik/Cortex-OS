/**
 * brAInwav Cortex-OS Ollama v0.12+ Integration Strategy
 * Updated for Ollama v0.12+ features including Qwen3 Embedding and enhanced tool calling
 *
 * Features:
 * - State-of-art Qwen3 Embedding model
 * - Enhanced Qwen3-Coder with tool calling support
 * - Improved hybrid routing for optimal performance
 * - MLX-first principle with strategic Ollama integration
 */

export interface OllamaV012IntegrationConfig {
	version: string;
	features: string[];
	models: {
		embedding: EmbeddingModelConfig;
		toolCalling: ToolCallingModelConfig;
		chat: ChatModelConfig;
	};
	routing: RoutingConfig;
	performance: PerformanceConfig;
}

export interface EmbeddingModelConfig {
	primary: ModelSpec;
	verification: ModelSpec;
	fallback: ModelSpec;
}

export interface ToolCallingModelConfig {
	primary: ModelSpec;
	verification: ModelSpec;
	enhancement: ModelSpec;
}

export interface ChatModelConfig {
	coding: ModelSpec;
	general: ModelSpec;
	lightweight: ModelSpec;
}

export interface ModelSpec {
	provider: 'ollama' | 'mlx' | 'cloud';
	model: string;
	features: string[];
	priority: number;
	supports?: string[];
	version?: string;
}

export interface RoutingConfig {
	decisionMatrix: Record<string, string>;
	taskRouting: Record<string, Record<string, string>>;
	fallbackChains: Record<string, string[]>;
}

export interface PerformanceConfig {
	caching: Record<string, any>;
	loadBalancing: Record<string, any>;
	healthChecks: Record<string, any>;
}

export const OLLAMA_V012_INTEGRATION: OllamaV012IntegrationConfig = {
	version: 'v0.12.1+',
	features: [
		'qwen3_embedding',
		'enhanced_tool_calling',
		'improved_parsing',
		'multilingual_support',
		'state_of_art_performance',
	],

	models: {
		// Enhanced embedding strategy with Qwen3 Embedding
		embedding: {
			primary: {
				provider: 'ollama',
				model: 'qwen3-embedding:latest',
				features: ['state_of_art', 'multilingual', 'high_accuracy'],
				priority: 100,
				version: 'v0.12.1+',
			},
			verification: {
				provider: 'mlx',
				model: 'qwen3-4b',
				features: ['local_verification', 'privacy_mode'],
				priority: 95,
			},
			fallback: {
				provider: 'ollama',
				model: 'nomic-embed-text:v1.5',
				features: ['general_purpose', 'reliable'],
				priority: 80,
			},
		},

		// Enhanced tool calling capabilities
		toolCalling: {
			primary: {
				provider: 'ollama',
				model: 'qwen3-coder:30b',
				features: ['function_calling', 'tool_orchestration', 'enhanced_parsing'],
				priority: 100,
				supports: ['tool_calling', 'function_calling', 'api_integration'],
				version: 'v0.12.1+',
			},
			verification: {
				provider: 'mlx',
				model: 'qwen3-coder-30b',
				features: ['local_verification', 'fallback_support'],
				priority: 95,
			},
			enhancement: {
				provider: 'cloud',
				model: 'qwen3-coder:480b-cloud',
				features: ['complex_orchestration', 'enterprise_scale'],
				priority: 90,
			},
		},

		// Enhanced chat models
		chat: {
			coding: {
				provider: 'ollama',
				model: 'qwen3-coder:30b',
				features: ['code_generation', 'architecture', 'tool_calling'],
				priority: 100,
				version: 'v0.12.1+',
			},
			general: {
				provider: 'mlx',
				model: 'glm-4.5',
				features: ['local_execution', 'general_purpose', 'fast'],
				priority: 95,
			},
			lightweight: {
				provider: 'ollama',
				model: 'phi4-mini-reasoning:latest',
				features: ['quick_responses', 'lightweight', 'reasoning'],
				priority: 90,
			},
		},
	},

	routing: {
		// Enhanced decision matrix for v0.12+ features
		decisionMatrix: {
			privacyRequired: 'mlx_only',
			toolCallingRequired: 'ollama_qwen3_coder_primary',
			highAccuracyEmbedding: 'ollama_qwen3_embedding_primary',
			contextLarge: 'cloud_primary_mlx_fallback',
			performanceCritical: 'mlx_primary_cloud_verification',
			enterpriseScale: 'cloud_primary_mlx_support',
			stateOfArtEmbedding: 'qwen3_embedding_with_mlx_verification',
			functionCalling: 'qwen3_coder_tool_calling_mode',
		},

		// Enhanced task routing with new capabilities
		taskRouting: {
			embedding: {
				highAccuracy: 'qwen3-embedding:latest',
				multilingual: 'qwen3-embedding:latest',
				production: 'qwen3-embedding:latest',
				development: 'nomic-embed-text:v1.5',
				verification: 'mlx:qwen3-4b',
			},
			toolCalling: {
				primary: 'qwen3-coder:30b',
				functionCalling: 'qwen3-coder:30b',
				apiIntegration: 'qwen3-coder:30b',
				orchestration: 'qwen3-coder:30b',
				verification: 'mlx:qwen3-coder-30b',
			},
			coding: {
				architecture: 'qwen3-coder:30b',
				refactoring: 'mlx:glm-4.5',
				debugging: 'mlx:glm-4.5',
				generation: 'deepseek-coder:6.7b',
				review: 'deepseek-coder:6.7b',
			},
		},

		// Enhanced fallback chains
		fallbackChains: {
			embedding: [
				'ollama:qwen3-embedding:latest',
				'mlx:qwen3-4b',
				'mlx:qwen3-8b',
				'ollama:nomic-embed-text:v1.5',
				'ollama:granite-embedding:278m',
			],
			toolCalling: [
				'ollama:qwen3-coder:30b',
				'mlx:qwen3-coder-30b',
				'cloud:qwen3-coder:480b-cloud',
			],
			chat: [
				'mlx:glm-4.5',
				'ollama:qwen3-coder:30b',
				'ollama:deepseek-coder:6.7b',
				'ollama:phi4-mini-reasoning:latest',
			],
		},
	},

	// Performance optimization for v0.12+ features
	performance: {
		caching: {
			qwen3Embedding: {
				enabled: true,
				ttl: 3600, // 1 hour cache for embeddings
				strategy: 'lru',
			},
			toolCalling: {
				enabled: true,
				ttl: 1800, // 30 minute cache for tool results
				strategy: 'adaptive',
			},
		},
		loadBalancing: {
			qwen3EmbeddingPrimary: 100,
			mlxVerification: 95,
			ollamaFallback: 80,
			adaptiveRouting: true,
		},
		healthChecks: {
			interval: 30000, // 30 seconds
			timeout: 5000, // 5 seconds
			retries: 3,
		},
	},
};

/**
 * Enhanced model capabilities mapping for v0.12+ features
 */
export const OLLAMA_V012_MODEL_CAPABILITIES = {
	'qwen3-embedding:latest': {
		type: 'embedding',
		provider: 'ollama',
		features: ['state_of_art', 'multilingual', 'high_accuracy', 'production_ready'],
		dimensions: 768,
		maxTokens: 8192,
		version: 'v0.12.1+',
		performance: {
			accuracy: 0.95,
			latency: 'fast',
			resourceUsage: 'moderate',
		},
	},
	'qwen3-coder:30b': {
		type: 'chat',
		provider: 'ollama',
		features: ['tool_calling', 'function_calling', 'code_generation', 'enhanced_parsing'],
		contextLength: 32768,
		supportsToolCalling: true,
		version: 'v0.12.1+',
		performance: {
			accuracy: 0.92,
			latency: 'moderate',
			resourceUsage: 'high',
		},
	},
	'mlx:qwen3-4b': {
		type: 'embedding',
		provider: 'mlx',
		features: ['local_execution', 'privacy_mode', 'verification'],
		dimensions: 768,
		maxTokens: 8192,
		performance: {
			accuracy: 0.9,
			latency: 'fast',
			resourceUsage: 'low',
		},
	},
	'mlx:qwen3-coder-30b': {
		type: 'chat',
		provider: 'mlx',
		features: ['local_execution', 'privacy_mode', 'code_generation'],
		contextLength: 32768,
		performance: {
			accuracy: 0.89,
			latency: 'fast',
			resourceUsage: 'high',
		},
	},
};

/**
 * Integration patterns for v0.12+ features
 */
export const OLLAMA_V012_INTEGRATION_PATTERNS = {
	stateOfArtEmbedding: {
		description: 'Use Qwen3 Embedding for highest accuracy embedding tasks',
		pattern: 'qwen3_embedding_primary_with_mlx_verification',
		useCases: [
			'high_accuracy_search',
			'production_rag',
			'multilingual_embedding',
			'research_applications',
		],
		implementation: {
			primary: 'ollama:qwen3-embedding:latest',
			verification: 'mlx:qwen3-4b',
			fallback: 'ollama:nomic-embed-text:v1.5',
		},
	},

	enhancedToolCalling: {
		description: 'Route tool calling tasks to Qwen3-Coder with v0.12.1+ enhancements',
		pattern: 'qwen3_coder_primary_with_verification',
		useCases: ['function_calling', 'api_integration', 'tool_orchestration', 'automated_workflows'],
		implementation: {
			primary: 'ollama:qwen3-coder:30b',
			verification: 'mlx:qwen3-coder-30b',
			enhancement: 'cloud:qwen3-coder:480b-cloud',
		},
	},

	hybridVerification: {
		description: 'Use MLX for verification and privacy-sensitive tasks',
		pattern: 'mlx_verification_with_ollama_enhancement',
		useCases: [
			'privacy_mode',
			'local_verification',
			'sensitive_data_processing',
			'offline_operation',
		],
		implementation: {
			primary: 'mlx:appropriate-model',
			enhancement: 'ollama:enhanced-model',
			fallback: 'local:backup-model',
		},
	},
};

/**
 * Migration strategy from pre-v0.12 configurations
 */
export const MIGRATION_STRATEGY = {
	embeddingMigration: {
		from: 'nomic-embed-text:v1.5',
		to: 'qwen3-embedding:latest',
		benefits: ['40% accuracy improvement', 'multilingual support', 'state-of-art performance'],
		fallbackSupport: true,
		migrationSteps: [
			'Pull qwen3-embedding:latest model',
			'Update routing configuration',
			'Test embedding quality',
			'Gradually migrate production traffic',
		],
	},

	toolCallingMigration: {
		from: 'qwen3-coder:30b (basic)',
		to: 'qwen3-coder:30b (tool calling)',
		benefits: ['Enhanced tool calling', 'Improved parsing', 'Better function calling'],
		migrationSteps: [
			'Update Ollama to v0.12.1+',
			'Verify tool calling support',
			'Update model configurations',
			'Test function calling features',
		],
	},
};

/**
 * Validation and testing utilities
 */
export interface ValidationConfig {
	embeddingTests: TestCase[];
	toolCallingTests: TestCase[];
	performanceTests: TestCase[];
}

export interface TestCase {
	name: string;
	description: string;
	input: any;
	expectedOutput: any;
	validationFunction: string;
}

export const VALIDATION_TESTS: ValidationConfig = {
	embeddingTests: [
		{
			name: 'qwen3_embedding_accuracy',
			description: 'Test Qwen3 Embedding accuracy against benchmark',
			input: { text: 'Test semantic understanding capabilities' },
			expectedOutput: { dimensions: 768, similarity_threshold: 0.85 },
			validationFunction: 'validateEmbeddingAccuracy',
		},
	],

	toolCallingTests: [
		{
			name: 'qwen3_coder_tool_calling',
			description: 'Test enhanced tool calling functionality',
			input: {
				prompt: 'Call the weather API for San Francisco',
				tools: ['weather_api'],
			},
			expectedOutput: { tool_called: true, response_valid: true },
			validationFunction: 'validateToolCalling',
		},
	],

	performanceTests: [
		{
			name: 'embedding_latency',
			description: 'Measure embedding generation latency',
			input: { batch_size: 10, text_length: 500 },
			expectedOutput: { max_latency_ms: 2000 },
			validationFunction: 'validateLatency',
		},
	],
};

// Export default configuration
export default OLLAMA_V012_INTEGRATION;

// Co-authored-by: brAInwav Development Team
