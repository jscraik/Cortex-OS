import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeFetchJson } from '@cortex-os/utils';
import { runProcess } from '../lib/run-process.js';
import type {
	ChatMessage,
	GenerationConfig,
	Generator,
	TriBandGenerationConfig,
	TriBandGenerationResponse
} from './index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Model specification for generation backends
 */
export interface ModelSpec {
	/** Model identifier or path */
	model: string;
	/** Backend to use for this model */
	backend: 'mlx' | 'ollama';
	/** Display name for the model */
	name?: string;
	/** Model description */
	description?: string;
	/** Recommended use cases */
	useCases?: readonly string[];
}

/**
 * Configuration for model generator
 */
export interface MultiModelGeneratorOptions {
	/** Model specification */
	model: ModelSpec;
	/** Default generation options */
	defaultConfig?: Partial<GenerationConfig>;
	/** Timeout for model requests (ms) */
	timeout?: number;
}

/**
 * Single-model generator
 */
export class MultiModelGenerator implements Generator {
	private readonly model: ModelSpec;
	private readonly defaultConfig: Partial<GenerationConfig>;
	private readonly timeout: number;

	constructor(options: MultiModelGeneratorOptions) {
		this.model = options.model;
		this.defaultConfig = {
			maxTokens: 2048,
			temperature: 0.7,
			topP: 0.9,
			...options.defaultConfig,
		};
		this.timeout = options.timeout || 30000;
	}

	/**
	 * Generate text completion
	 */
	async generate(prompt: string, config?: Partial<GenerationConfig>) {
		const finalConfig = { ...this.defaultConfig, ...config };
		const result = await this.generateWithModel(this.model, prompt, finalConfig);
		return {
			content: result,
			provider: this.model.backend,
			usage: {
				promptTokens: Math.floor(prompt.length / 4), // Rough estimate
				completionTokens: Math.floor(result.length / 4),
				totalTokens: Math.floor((prompt.length + result.length) / 4),
			},
		};
	}

	/**
	 * Generate chat response
	 */
	async chat(messages: ChatMessage[], config?: Partial<GenerationConfig>) {
		const finalConfig = { ...this.defaultConfig, ...config };
		const result = await this.chatWithModel(this.model, messages, finalConfig);
		return {
			content: result,
			provider: this.model.backend,
			usage: {
				promptTokens: Math.floor(messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
				completionTokens: Math.floor(result.length / 4),
				totalTokens: Math.floor(
					(messages.reduce((sum, m) => sum + m.content.length, 0) + result.length) / 4,
				),
			},
		};
	}

	/**
	 * Generate with a specific model
	 */
	private async generateWithModel(
		model: ModelSpec,
		prompt: string,
		config: Partial<GenerationConfig>,
	): Promise<string> {
		if (model.backend === 'ollama') {
			return this.generateWithOllama(model, prompt, config);
		} else if (model.backend === 'mlx') {
			return this.generateWithMLX(model, prompt, config);
		} else {
			throw new Error(`Unsupported backend: ${model.backend}`);
		}
	}

	/**
	 * Chat with a specific model
	 */
	private async chatWithModel(
		model: ModelSpec,
		messages: ChatMessage[],
		config: Partial<GenerationConfig>,
	): Promise<string> {
		if (model.backend === 'ollama') {
			return this.chatWithOllama(model, messages, config);
		} else if (model.backend === 'mlx') {
			return this.chatWithMLX(model, messages, config);
		} else {
			throw new Error(`Unsupported backend: ${model.backend}`);
		}
	}

	/**
	 * Generate with Ollama backend
	 */
	private async generateWithOllama(
		model: ModelSpec,
		prompt: string,
		config: Partial<GenerationConfig>,
	): Promise<string> {
		try {
			const endpoint = new URL('http://localhost:11434/api/generate');
			const result = await safeFetchJson<{ response?: string }>(endpoint.toString(), {
				allowedHosts: [endpoint.hostname],
				allowedProtocols: [endpoint.protocol],
				allowLocalhost: true,
				timeout: this.timeout,
				fetchOptions: {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: model.model,
						prompt,
						stream: false,
						options: {
							temperature: config.temperature,
							top_p: config.topP,
							num_predict: config.maxTokens,
						},
					}),
				},
			});
			return result.response || '';
		} catch (error) {
			throw new Error(`Ollama generation failed: ${error}`);
		}
	}

	/**
	 * Chat with Ollama backend using API
	 */
	private async chatWithOllama(
		model: ModelSpec,
		messages: ChatMessage[],
		config: Partial<GenerationConfig>,
	): Promise<string> {
		try {
			const endpoint = new URL('http://localhost:11434/api/chat');
			const result = await safeFetchJson<{ message?: { content?: string } }>(endpoint.toString(), {
				allowedHosts: [endpoint.hostname],
				allowedProtocols: [endpoint.protocol],
				allowLocalhost: true,
				timeout: this.timeout,
				fetchOptions: {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: model.model,
						messages,
						stream: false,
						options: {
							temperature: config.temperature,
							top_p: config.topP,
							num_predict: config.maxTokens,
						},
					}),
				},
			});
			return result.message?.content || '';
		} catch (error) {
			throw new Error(`Ollama chat failed: ${error}`);
		}
	}

	/**
	 * Generate with MLX backend
	 */
	private async generateWithMLX(
		model: ModelSpec,
		prompt: string,
		config: Partial<GenerationConfig>,
		triBandConfig?: TriBandGenerationConfig,
	): Promise<{ text: string; bandUsage?: any; virtualTokenMode?: string }> {
		const pythonScript = this.getMLXPythonScript();
		const input = JSON.stringify({
			model: model.model,
			prompt,
			max_tokens: config.maxTokens,
			temperature: config.temperature,
			top_p: config.topP,
			// REF‑RAG tri-band context
			bandA: triBandConfig?.bandA,
			bandB: triBandConfig?.bandB ? Array.from(triBandConfig.bandB) : [],
			bandC: triBandConfig?.bandC || [],
			virtualTokenMode: triBandConfig?.virtualTokenMode || 'pass-through',
			enableStructuredOutput: triBandConfig?.enableStructuredOutput || false,
		});
		const result = await runProcess<{ text?: string; error?: string; bandUsage?: any; virtualTokenMode?: string }>(
			'python3',
			['-c', pythonScript],
			{ input, timeoutMs: this.timeout },
		);
		if (result.error) throw new Error(`MLX error: ${result.error}`);
		return {
			text: result.text || '',
			bandUsage: result.bandUsage,
			virtualTokenMode: result.virtualTokenMode,
		};
	}

	/**
	 * Chat with MLX backend
	 */
	private async chatWithMLX(
		model: ModelSpec,
		messages: ChatMessage[],
		config: Partial<GenerationConfig>,
	): Promise<string> {
		// Convert chat messages to a single prompt for MLX
		const prompt = this.formatMessagesAsPrompt(messages);
		return this.generateWithMLX(model, prompt, config);
	}

	/**
	 * Format chat messages as a single prompt string
	 */
	private formatMessagesAsPrompt(messages: ChatMessage[]): string {
		return `${messages
			.map((msg) => {
				if (msg.role === 'system') {
					return `System: ${msg.content}`;
				} else if (msg.role === 'user') {
					return `User: ${msg.content}`;
				} else {
					return `Assistant: ${msg.content}`;
				}
			})
			.join('\n\n')}\n\nAssistant:`;
	}

	/**
	 * Get Python script for MLX generation
	 */
	private getMLXPythonScript(): string {
		const scriptPath = path.join(packageRoot, 'python', 'mlx_generate.py');
		return readFileSync(scriptPath, 'utf8');
	}

	/**
	 * Generate response with tri-band context
	 */
	async generateWithBands(
		query: string,
		config: TriBandGenerationConfig,
	): Promise<TriBandGenerationResponse> {
		const startTime = Date.now();

		// Build enhanced prompt with tri-band context
		const enhancedPrompt = this.buildTriBandPrompt(query, config);

		// Calculate token usage for bands
		const bandUsage = this.calculateBandUsage(config);

		// Generate response using backend that supports tri-band context
		let baseResponse: GenerationResponse;
		let backendBandUsage: any;
		let virtualTokenMode: string = config.virtualTokenMode || 'pass-through';

		if (this.model.backend === 'mlx') {
			// Use MLX with tri-band support
			const mlxResult = await this.generateWithMLX(this.model, enhancedPrompt, config, config);
			baseResponse = {
				content: mlxResult.text,
				provider: this.model.backend,
				usage: this.estimateUsage(enhancedPrompt, mlxResult.text),
			};
			backendBandUsage = mlxResult.bandUsage;
			virtualTokenMode = mlxResult.virtualTokenMode || virtualTokenMode;
		} else {
			// Use other backends with standard generation
			baseResponse = await this.generate(enhancedPrompt, {
				maxTokens: config.maxTokens,
				temperature: config.temperature,
				topP: config.topP,
			});

			// Handle virtual tokens for non-MLX backends
			if (config.bandB && config.virtualTokenMode !== 'ignore') {
				baseResponse = await this.handleVirtualTokens(
					baseResponse,
					config.bandB,
					config.virtualTokenMode || 'pass-through',
				);
			}
		}

		// Post-process structured facts if enabled
		let processedResponse = baseResponse;
		if (config.enableStructuredOutput && config.bandC) {
			processedResponse = await this.processStructuredFacts(
				baseResponse,
				config.bandC,
			);
		}

		const processingTime = Date.now() - startTime;

		// Use backend band usage if available, otherwise calculate locally
		const finalBandUsage = backendBandUsage || bandUsage;

		return {
			...processedResponse,
			bandUsage: finalBandUsage,
			contextMetadata: {
				riskClass: 'medium', // Would be passed from context pack
				totalChunks: (finalBandUsage.bandAChars > 0 ? 1 : 0) + (finalBandUsage.bandCFacts > 0 ? 1 : 0),
				expansionRatio: finalBandUsage.bandAChars > 0 ?
					finalBandUsage.bandAChars / (finalBandUsage.bandAChars + finalBandUsage.bandBVirtualTokens * 4 + finalBandUsage.bandCFacts * 10) : 0.3,
			},
			usage: {
				...processedResponse.usage,
				totalTokens: (processedResponse.usage?.totalTokens || 0) +
					Math.floor(finalBandUsage.bandBVirtualTokens * 0.5), // Estimate virtual token contribution
			},
		};
	}

	/**
	 * Estimate token usage for response
	 */
	private estimateUsage(prompt: string, response: string) {
		return {
			promptTokens: Math.floor(prompt.length / 4),
			completionTokens: Math.floor(response.length / 4),
			totalTokens: Math.floor((prompt.length + response.length) / 4),
		};
	}

	/**
	 * Build enhanced prompt with tri-band context
	 */
	private buildTriBandPrompt(query: string, config: TriBandGenerationConfig): string {
		let prompt = query;

		// Add Band A context (full text)
		if (config.bandA) {
			prompt += `\n\nContext:\n${config.bandA}`;
		}

		// Add Band C context (structured facts)
		if (config.bandC && config.bandC.length > 0) {
			prompt += '\n\nKey Facts:\n';
			config.bandC.forEach(fact => {
				const confidenceStr = fact.confidence > 0.8 ? '' : ` (confidence: ${Math.round(fact.confidence * 100)}%)`;
				prompt += `- ${fact.type}: ${fact.value}${confidenceStr}\n`;
			});
		}

		// Add instructions based on available context
		if (config.bandA || config.bandC) {
			prompt += '\n\nPlease provide a comprehensive answer based on the provided context. ';
			if (config.bandC && config.bandC.length > 0) {
				prompt += 'Pay special attention to the numerical facts and structured data provided. ';
			}
			prompt += 'Cite your sources when appropriate.';
		}

		return prompt;
	}

	/**
	 * Calculate band usage statistics
	 */
	private calculateBandUsage(config: TriBandGenerationConfig) {
		return {
			bandAChars: config.bandA ? config.bandA.length : 0,
			bandBVirtualTokens: config.bandB ? config.bandB.length : 0,
			bandCFacts: config.bandC ? config.bandC.length : 0,
		};
	}

	/**
	 * Handle virtual tokens based on backend capability
	 */
	private async handleVirtualTokens(
		response: GenerationResponse,
		virtualTokens: Float32Array,
		mode: 'decode' | 'pass-through',
	): Promise<GenerationResponse> {
		if (mode === 'pass-through') {
			// For MLX backend, pass virtual tokens directly
			return response;
		}

		if (mode === 'decode') {
			// For backends that can't handle virtual tokens directly,
			// decode them back to text representation
			const decodedContext = this.decodeVirtualTokens(virtualTokens);
			const enhancedPrompt = `Additional Context: ${decodedContext}\n\n${response.content}`;

			return {
				...response,
				content: await this.refineWithDecodedContext(enhancedPrompt),
			};
		}

		return response;
	}

	/**
	 * Decode virtual tokens back to text representation
	 */
	private decodeVirtualTokens(virtualTokens: Float32Array): string {
		// Simplified decoding - in production, this would use the
		// inverse of the compression transformation
		const sampleSize = Math.min(5, virtualTokens.length);
		const sampleTokens = Array.from(virtualTokens.slice(0, sampleSize));
		return `[Compressed context: ${sampleTokens.length} virtual tokens]`;
	}

	/**
	 * Refine response with decoded context
	 */
	private async refineWithDecodedContext(enhancedPrompt: string): Promise<string> {
		// Use existing generation method to refine with decoded context
		const refinement = await this.generate(enhancedPrompt, {
			maxTokens: 500,
			temperature: 0.2, // Lower temperature for refinement
		});
		return refinement.content;
	}

	/**
	 * Process structured facts for enhanced output
	 */
	private async processStructuredFacts(
		response: GenerationResponse,
		facts: Array<{
			type: string;
			value: string | number | boolean;
			context: string;
			confidence: number;
		}>,
	): Promise<GenerationResponse> {
		// Extract numerical facts for verification
		const numericalFacts = facts.filter(fact => fact.type === 'number');

		if (numericalFacts.length > 0) {
			// Check if response includes these facts
			const responseText = response.content.toLowerCase();
			const missingFacts = numericalFacts.filter(fact =>
				!responseText.includes(String(fact.value))
			);

			if (missingFacts.length > 0) {
				// Add a note about missing numerical precision
				const note = `\n\nNote: The following specific numerical data was available: ${missingFacts.map(f => f.value).join(', ')}.`;
				return {
					...response,
					content: response.content + note,
				};
			}
		}

		return response;
	}

	/**
	 * Cleanup resources
	 */
	async close(): Promise<void> {
		// No persistent resources to cleanup
	}
}

/**
 * Factory function for creating a multi-model generator
 */
export function createMultiModelGenerator(
	options: MultiModelGeneratorOptions,
): MultiModelGenerator {
	return new MultiModelGenerator(options);
}

/**
 * Predefined model configurations for common use cases
 */
export const ModelPresets = {
	/** Coding and development tasks */
	coding: {
		model: 'qwen3-coder:30b',
		backend: 'ollama' as const,
		name: 'Qwen3 Coder 30B',
		description: 'Specialized for coding and programming tasks',
		useCases: ['code generation', 'debugging', 'code explanation', 'refactoring'],
	},

	/** Reasoning and analysis */
	reasoning: {
		model: 'phi4-mini-reasoning',
		backend: 'ollama' as const,
		name: 'Phi4 Mini Reasoning',
		description: 'Optimized for logical reasoning and analysis',
		useCases: ['problem solving', 'analysis', 'logical reasoning', 'planning'],
	},

	/** General chat and assistance */
	chat: {
		model: 'qwen3:14b',
		backend: 'ollama' as const,
		name: 'Qwen3 14B',
		description: 'General purpose conversational model',
		useCases: ['general chat', 'Q&A', 'summarization', 'writing assistance'],
	},

	/** Compact and fast responses */
	fast: {
		model: 'qwen3:7b',
		backend: 'ollama' as const,
		name: 'Qwen3 7B',
		description: 'Fast responses with good quality',
		useCases: ['quick responses', 'simple tasks', 'real-time chat'],
	},
} as const;

/**
 * RAG-optimized generator configurations
 */
export const RAGGeneratorPresets = {
	/** Balanced performance for RAG applications */
	balanced: {
		primaryModel: ModelPresets.chat,
		fallbackModels: [ModelPresets.fast],
		defaultOptions: {
			maxTokens: 1024,
			temperature: 0.3,
			topP: 0.9,
		},
	},

	/** Code-focused RAG generation */
	coding: {
		primaryModel: ModelPresets.coding,
		fallbackModels: [ModelPresets.chat, ModelPresets.fast],
		defaultOptions: {
			maxTokens: 2048,
			temperature: 0.1,
			topP: 0.95,
		},
	},

	/** High-quality analysis and reasoning */
	analytical: {
		primaryModel: ModelPresets.reasoning,
		fallbackModels: [ModelPresets.chat],
		defaultOptions: {
			maxTokens: 2048,
			temperature: 0.2,
			topP: 0.9,
		},
	},
} as const;
