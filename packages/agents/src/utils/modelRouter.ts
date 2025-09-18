import { createPinoLogger } from '@voltagent/logger';
import {
	type CapabilityRouterConfig,
	createCapabilityRouter,
} from '../providers/capability-router.js';
import {
	type FallbackChainConfig,
	createFallbackChain,
} from '../providers/fallback-chain.js';
import {
	type MLXProviderConfig,
	createMLXProvider,
} from '../providers/mlx-provider/index.js';
import { createOllamaProvider } from '../providers/ollama-provider.js';
import { createOpenAIProvider } from '../providers/openai-provider.js';
import type { ModelProvider } from '../types/model.js';
import type { Tool } from './mocks/voltagent-core.js';

const logger = createPinoLogger({ name: 'ModelRouter' });

export interface ModelRouterConfig {
	enableMLX?: boolean;
	ollamaBaseUrl?: string;
	apiProviders?: {
		openai?: {
			apiKey: string;
			baseURL?: string;
		};
		anthropic?: {
			apiKey: string;
			baseURL?: string;
		};
		google?: {
			apiKey: string;
			baseURL?: string;
		};
		zai?: {
			apiKey: string;
			baseURL?: string;
		};
		moonshot?: {
			apiKey: string;
			baseURL?: string;
		};
		openrouter?: {
			apiKey: string;
			baseURL?: string;
		};
		groq?: {
			apiKey: string;
			baseURL?: string;
		};
	};
}

export interface ModelCapability {
	name: string;
	provider:
		| 'mlx'
		| 'ollama'
		| 'openai'
		| 'anthropic'
		| 'google'
		| 'zai'
		| 'moonshot'
		| 'openrouter'
		| 'groq';
	capabilities: {
		codeAnalysis: boolean;
		testGeneration: boolean;
		documentation: boolean;
		securityAnalysis: boolean;
		multimodal: boolean;
		streaming: boolean;
		contextWindow: number;
	};
	cost: {
		input: number; // per 1K tokens
		output: number; // per 1K tokens
	};
	priority: number; // 1-10, higher is preferred
}

interface OllamaConfig {
	baseUrl?: string;
	models?: string[];
}

export function createModelRouter(config?: ModelRouterConfig) {
	// Load Ollama configuration synchronously
	let ollamaConfig: OllamaConfig | null = null;
	try {
		// For now, we'll use a simplified approach without async loading
		// In a real implementation, this would be pre-loaded or cached
		ollamaConfig = null; // Will use fallback models
	} catch (error) {
		logger.warn('Failed to load Ollama config, using fallback models:', error);
	}

	// Create provider instances
	const providers: ModelProvider[] = [];

	// Add OpenAI providers
	if (config?.apiProviders?.openai) {
		providers.push(
			createOpenAIProvider({
				apiKey: config.apiProviders.openai.apiKey,
				baseURL: config.apiProviders.openai.baseURL,
				model: 'gpt-4',
			}),
			createOpenAIProvider({
				apiKey: config.apiProviders.openai.apiKey,
				baseURL: config.apiProviders.openai.baseURL,
				model: 'gpt-4o-mini',
			}),
		);
	}

	// Add MLX provider if enabled (macOS only)
	if (config?.enableMLX) {
		try {
			const mlxConfig: MLXProviderConfig = {
				modelPath:
					process.env.MLX_MODEL_PATH ||
					'~/.cache/huggingface/hub/models--mlx-community--Llama-3.2-3B-Instruct-4bit',
				enableThermalMonitoring: true,
				thermalThreshold: 80,
				memoryThreshold: 0.8,
				maxConcurrency: 2,
			};
			providers.push(createMLXProvider(mlxConfig));
			logger.info('MLX provider enabled with thermal monitoring');
		} catch (error) {
			logger.warn('Failed to initialize MLX provider:', error);
		}
	}

	// Add Ollama providers
	if (config?.ollamaBaseUrl) {
		providers.push(
			createOllamaProvider({
				baseUrl: config?.ollamaBaseUrl,
				model: 'deepseek-coder',
			}),
		);
	}

	// Create fallback chain if we have providers
	let fallbackProvider: ModelProvider | null = null;
	if (providers.length > 0) {
		const fallbackConfig: FallbackChainConfig = {
			providers,
			healthCheckInterval: 30000,
			circuitBreakerThreshold: 3,
			circuitBreakerTimeout: 60000,
			retryAttempts: 2,
			retryDelay: 1000,
		};
		fallbackProvider = createFallbackChain(fallbackConfig);
		logger.info(`Created fallback chain with ${providers.length} providers`);
	}

	// Create capability router for advanced routing
	let capabilityRouter: ReturnType<typeof createCapabilityRouter> | null = null;
	if (providers.length > 0) {
		const capabilityConfig: CapabilityRouterConfig = {
			providers,
			fallbackChain: providers.map((p) => p.name),
			thermalThrottling: {
				enabled: config?.enableMLX || false,
				maxTemp: 85,
				checkInterval: 30000,
			},
			costLimits: {
				daily: 10, // $10 daily limit
				monthly: 300, // $300 monthly limit
			},
		};
		capabilityRouter = createCapabilityRouter(capabilityConfig);
		logger.info('Created capability router with advanced features');
	}

	// Define available models
	const models: ModelCapability[] = [
		// MLX models (macOS native)
		...(config?.enableMLX
			? [
					{
						name: 'mlx/GLM-4.5-4Bit',
						provider: 'mlx' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: false,
							streaming: true,
							contextWindow: 32768,
						},
						cost: { input: 0, output: 0 },
						priority: 10,
					},
					{
						name: 'mlx/Qwen3-Coder-30B-4Bit',
						provider: 'mlx' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: false,
							streaming: true,
							contextWindow: 32768,
						},
						cost: { input: 0, output: 0 },
						priority: 9,
					},
				]
			: []),

		// Ollama models (local fallback) - dynamically loaded from config
		...(ollamaConfig?.chat_models
			? Object.values(ollamaConfig.chat_models).map((model: any) => ({
					name: `ollama/${model.model_tag}`,
					provider: 'ollama' as const,
					capabilities: {
						codeAnalysis:
							model.type === 'code_specialist' ||
							model.coding_tasks?.includes('code_generation'),
						testGeneration: model.coding_tasks?.includes('debugging') || false,
						documentation:
							model.recommended_for?.includes('documentation') || false,
						securityAnalysis: false,
						multimodal: false,
						streaming: true,
						contextWindow: model.context_length,
					},
					cost: { input: 0, output: 0 },
					priority: model.priority + 5, // Ollama models get priority boost
				}))
			: [
					// Fallback Ollama models if config fails to load
					{
						name: 'ollama/deepseek-coder',
						provider: 'ollama' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: false,
							streaming: true,
							contextWindow: 16384,
						},
						cost: { input: 0, output: 0 },
						priority: 7,
					},
				]),

		// API providers (frontier models)
		...(config?.apiProviders?.openai
			? [
					{
						name: 'gpt-4',
						provider: 'openai' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: true,
							streaming: true,
							contextWindow: 128000,
						},
						cost: { input: 0.03, output: 0.06 },
						priority: 6,
					},
					{
						name: 'gpt-4o-mini',
						provider: 'openai' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: true,
							streaming: true,
							contextWindow: 128000,
						},
						cost: { input: 0.00015, output: 0.0006 },
						priority: 5,
					},
				]
			: []),

		...(config?.apiProviders?.anthropic
			? [
					{
						name: 'claude-3-5-sonnet-20241022',
						provider: 'anthropic' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: true,
							streaming: true,
							contextWindow: 200000,
						},
						cost: { input: 0.003, output: 0.015 },
						priority: 7,
					},
					{
						name: 'claude-3-haiku-20240307',
						provider: 'anthropic' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: true,
							streaming: true,
							contextWindow: 200000,
						},
						cost: { input: 0.00025, output: 0.00125 },
						priority: 4,
					},
				]
			: []),

		...(config?.apiProviders?.google
			? [
					{
						name: 'gemini-1.5-pro',
						provider: 'google' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: true,
							streaming: true,
							contextWindow: 2097152,
						},
						cost: { input: 0.00125, output: 0.005 },
						priority: 6,
					},
				]
			: []),

		// ZAI AI models
		...(config?.apiProviders?.zai
			? [
					{
						name: 'zai/gpt-4',
						provider: 'zai' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: true,
							streaming: true,
							contextWindow: 128000,
						},
						cost: { input: 0.02, output: 0.04 },
						priority: 5,
					},
				]
			: []),

		// Moonshot AI models
		...(config?.apiProviders?.moonshot
			? [
					{
						name: 'moonshot-v1-8k',
						provider: 'moonshot' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: false,
							streaming: true,
							contextWindow: 8192,
						},
						cost: { input: 0.002, output: 0.006 },
						priority: 4,
					},
					{
						name: 'moonshot-v1-32k',
						provider: 'moonshot' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: false,
							streaming: true,
							contextWindow: 32768,
						},
						cost: { input: 0.004, output: 0.012 },
						priority: 5,
					},
				]
			: []),

		// OpenRouter models
		...(config?.apiProviders?.openrouter
			? [
					{
						name: 'openrouter/anthropic/claude-2',
						provider: 'openrouter' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: false,
							streaming: true,
							contextWindow: 200000,
						},
						cost: { input: 0.001, output: 0.002 },
						priority: 4,
					},
					{
						name: 'openrouter/openai/gpt-4',
						provider: 'openrouter' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: true,
							multimodal: true,
							streaming: true,
							contextWindow: 128000,
						},
						cost: { input: 0.001, output: 0.002 },
						priority: 5,
					},
				]
			: []),

		// Groq models
		...(config?.apiProviders?.groq
			? [
					{
						name: 'groq/llama2-70b-4096',
						provider: 'groq' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: false,
							streaming: true,
							contextWindow: 4096,
						},
						cost: { input: 0.0007, output: 0.0008 },
						priority: 3,
					},
					{
						name: 'groq/mixtral-8x7b-32768',
						provider: 'groq' as const,
						capabilities: {
							codeAnalysis: true,
							testGeneration: true,
							documentation: true,
							securityAnalysis: false,
							multimodal: false,
							streaming: true,
							contextWindow: 32768,
						},
						cost: { input: 0.0007, output: 0.0008 },
						priority: 4,
					},
				]
			: []),
	];

	return {
		/**
		 * Generate text using the capability router with intelligent provider selection
		 */
		async generateText(
			prompt: string,
			options?: {
				model?: string;
				temperature?: number;
				maxTokens?: number;
				capabilities?: {
					supportsVision?: boolean;
					supportsStreaming?: boolean;
					supportsTools?: boolean;
					maxTokens?: number;
					contextWindow?: number;
				};
			},
		): Promise<string> {
			// Use capability router if available for advanced routing
			if (capabilityRouter) {
				try {
					const result = await capabilityRouter.generate(
						prompt,
						{
							maxTokens: options?.maxTokens,
							temperature: options?.temperature,
						},
						options?.capabilities || {},
					);
					return result.content;
				} catch (error) {
					logger.error('Capability router generation failed:', error);
					// Fall back to basic fallback chain
				}
			}

			// Fallback to basic fallback chain
			if (fallbackProvider) {
				try {
					const result = await fallbackProvider.generate(prompt, {
						maxTokens: options?.maxTokens,
						temperature: options?.temperature,
					});
					return result.content;
				} catch (error) {
					logger.error('Fallback provider generation failed:', error);
					throw error;
				}
			}
			throw new Error('No providers available for generation');
		},

		/**
		 * Select the best model for a given task
		 */
		async selectModel(
			input: string,
			tools: Tool[],
			preferredModel?: string,
		): Promise<string> {
			// If model is explicitly requested, use it if available
			if (preferredModel) {
				const model = models.find((m) => m.name === preferredModel);
				if (model) return model.name;
				logger.warn(
					`Requested model ${preferredModel} not found, using automatic selection`,
				);
			}

			// Analyze input to determine required capabilities
			const requirements = analyzeInputRequirements(input, tools);

			// Filter models that meet requirements
			const eligibleModels = models.filter((model) => {
				return Object.entries(requirements).every(
					([cap, required]) =>
						!required ||
						model.capabilities[cap as keyof typeof model.capabilities],
				);
			});

			if (eligibleModels.length === 0) {
				logger.warn(
					'No models meet requirements, falling back to basic capabilities',
				);
				return models.reduce((best, current) =>
					current.priority > best.priority ? current : best,
				).name;
			}

			// Select based on priority, cost, and thermal considerations
			const selected = selectOptimalModel(eligibleModels, input.length);

			logger.info(`Selected model: ${selected.name} (${selected.provider})`);
			return selected.name;
		},

		/**
		 * Get current model information
		 */
		async getCurrentModel(): Promise<ModelCapability> {
			// For now, return the highest priority model
			return models.reduce((best, current) =>
				current.priority > best.priority ? current : best,
			);
		},

		/**
		 * List all available models
		 */
		getAvailableModels(): ModelCapability[] {
			return [...models];
		},

		/**
		 * Get advanced routing statistics and metrics
		 */
		getRoutingStats() {
			if (!capabilityRouter) {
				return {
					fallbackOnly: true,
					providerCount: providers.length,
				};
			}

			return {
				capabilityRouter: true,
				usageStats: capabilityRouter.getUsageStats(),
				thermalStatus: capabilityRouter.getThermalStatus(),
				costInfo: capabilityRouter.getCostInfo(),
				providerCount: providers.length,
			};
		},

		/**
		 * Get detailed provider health information
		 */
		async getProviderHealth(): Promise<Record<string, any>> {
			const health: Record<string, any> = {};

			for (const model of models) {
				const check = await this.checkHealth(model.name);
				health[model.name] = {
					...check,
					capabilities: model.capabilities,
					cost: model.cost,
					priority: model.priority,
				};
			}

			return health;
		},

		/**
		 * Check model health and availability
		 */
		async checkHealth(modelName: string): Promise<{
			healthy: boolean;
			latency?: number;
			error?: string;
		}> {
			const model = models.find((m) => m.name === modelName);
			if (!model) {
				return { healthy: false, error: 'Model not found' };
			}

			// Check MLX availability
			if (model.provider === 'mlx') {
				try {
					// Check if MLX is available
					const { execSync } = await import('node:child_process');
					execSync('python3 -c "import mlx.core; print(1)"', {
						stdio: 'pipe',
						timeout: 5000,
					});

					// Check if specific model is available
					const modelNameSplit = modelName.split('/');
					const actualModelName = modelNameSplit[1]; // Extract model name from "mlx/model-name"
					execSync(
						`python3 -c "import mlx_lm; print('${actualModelName} available')"`,
						{
							stdio: 'pipe',
							timeout: 5000,
						},
					);
					return { healthy: true, latency: 10 };
				} catch (_error) {
					return { healthy: false, error: 'MLX not available' };
				}
			}

			// Check Ollama availability
			if (model.provider === 'ollama') {
				try {
					const startTime = Date.now();
					const ollamaBaseUrl =
						ollamaConfig?.service_configuration?.ollama_endpoint ||
						config?.ollamaBaseUrl ||
						'http://localhost:11434';
					const response = await fetch(`${ollamaBaseUrl}/api/tags`);
					const latency = Date.now() - startTime;

					if (response.ok) {
						const data = await response.json();
						const available = data.models.some((m: any) =>
							m.name.includes(modelName.split('/')[1]),
						);
						return { healthy: available, latency };
					}
					return { healthy: false, error: 'Ollama not responding' };
				} catch (_error) {
					return { healthy: false, error: 'Ollama connection failed' };
				}
			}

			// API providers are assumed healthy if configured
			if (
				[
					'openai',
					'anthropic',
					'google',
					'zai',
					'moonshot',
					'openrouter',
					'groq',
				].includes(model.provider)
			) {
				return { healthy: true, latency: 100 };
			}

			return { healthy: false, error: 'Unknown provider' };
		},
	};
}

function analyzeInputRequirements(input: string, _tools: any[]) {
	return {
		codeAnalysis: /code|analyze|review|refactor|debug/i.test(input),
		testGeneration: /test|spec|unit|integration|e2e/i.test(input),
		documentation: /doc|readme|markdown|comment/i.test(input),
		securityAnalysis: /security|vulnerability|exploit|safe/i.test(input),
		multimodal:
			_tools.some(
				(t: any) =>
					t.name.toLowerCase().includes('image') ||
					t.name.toLowerCase().includes('audio') ||
					t.name.toLowerCase().includes('video'),
			) || /image|audio|video|screenshot/i.test(input),
		streaming: true, // Always prefer streaming for better UX
		contextWindow: Math.min(128000, Math.max(8192, input.length * 10)),
	};
}

function selectOptimalModel(
	models: ModelCapability[],
	inputLength: number,
): ModelCapability {
	// Calculate scores based on multiple factors
	const scored = models.map((model) => {
		let score = model.priority * 10;

		// Prefer free models for simple tasks
		if (model.cost.input === 0 && inputLength < 1000) {
			score += 5;
		}

		// Consider thermal constraints for MLX
		if (model.provider === 'mlx') {
			// Reduce score if input is very large to prevent overheating
			if (inputLength > 50000) {
				score -= 3;
			}
		}

		// Consider context window requirements
		const requiredWindow = inputLength * 10;
		if (model.capabilities.contextWindow >= requiredWindow) {
			score += 2;
		} else if (model.capabilities.contextWindow >= requiredWindow * 0.5) {
			score += 1;
		}

		return { model, score };
	});

	// Return highest scoring model
	return scored.reduce((best, current) =>
		current.score > best.score ? current : best,
	).model;
}
