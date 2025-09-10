import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcess } from '../lib/run-process.js';
import type { ChatMessage, GenerationConfig, Generator } from './index.js';

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
);

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
		const result = await this.generateWithModel(
			this.model,
			prompt,
			finalConfig,
		);
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
				promptTokens: Math.floor(
					messages.reduce((sum, m) => sum + m.content.length, 0) / 4,
				),
				completionTokens: Math.floor(result.length / 4),
				totalTokens: Math.floor(
					(messages.reduce((sum, m) => sum + m.content.length, 0) +
						result.length) /
						4,
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
			const response = await fetch('http://localhost:11434/api/generate', {
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
				signal: AbortSignal.timeout(this.timeout),
			});

			if (!response.ok) {
				throw new Error(
					`Ollama API error: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();
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
			const response = await fetch('http://localhost:11434/api/chat', {
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
				signal: AbortSignal.timeout(this.timeout),
			});

			if (!response.ok) {
				throw new Error(
					`Ollama API error: ${response.status} ${response.statusText}`,
				);
			}

			const result = await response.json();
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
	): Promise<string> {
		const pythonScript = this.getMLXPythonScript();
		const input = JSON.stringify({
			model: model.model,
			prompt,
			max_tokens: config.maxTokens,
			temperature: config.temperature,
			top_p: config.topP,
		});
		const result = await runProcess<{ text?: string; error?: string }>(
			'python3',
			['-c', pythonScript],
			{ input, timeoutMs: this.timeout },
		);
		if (result.error) throw new Error(`MLX error: ${result.error}`);
		return result.text || '';
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
		useCases: [
			'code generation',
			'debugging',
			'code explanation',
			'refactoring',
		],
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
