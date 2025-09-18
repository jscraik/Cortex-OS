/**
 * Ollama provider implementation
 */

import { createPinoLogger } from '@voltagent/logger';
import type {
	GenerateOptions,
	GenerateResult,
	ModelProvider,
} from '../types/model.js';

const logger = createPinoLogger({ name: 'OllamaProvider' });

export interface OllamaProviderConfig {
	baseUrl?: string;
	model: string;
}

export function createOllamaProvider(
	config: OllamaProviderConfig,
): ModelProvider {
	const baseUrl = config.baseUrl || 'http://localhost:11434';

	return {
		name: `ollama:${config.model}`,

		async generate(
			prompt: string,
			options: GenerateOptions = {},
		): Promise<GenerateResult> {
			try {
				const response = await fetch(`${baseUrl}/api/generate`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: config.model,
						prompt,
						stream: false,
						options: {
							temperature: options.temperature,
							top_p: options.topP,
							stop: options.stop,
							num_predict: options.maxTokens,
						},
					}),
				});

				if (!response.ok) {
					throw new Error(
						`Ollama API error: ${response.status} ${response.statusText}`,
					);
				}

				const data = await response.json();

				return {
					content: data.response,
					finishReason: data.done ? 'stop' : 'length',
					usage: {
						promptTokens: data.prompt_eval_count || 0,
						completionTokens: data.eval_count || 0,
						totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
					},
				};
			} catch (error) {
				logger.error('Ollama generation failed:', error);
				throw new Error(
					`Ollama API error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},

		async isAvailable(): Promise<boolean> {
			try {
				const response = await fetch(`${baseUrl}/api/tags`);
				if (!response.ok) return false;

				const data = await response.json();
				return data.models.some((m: any) => m.name.includes(config.model));
			} catch (_error) {
				return false;
			}
		},

		async shutdown(): Promise<void> {
			// No cleanup needed
		},
	};
}
