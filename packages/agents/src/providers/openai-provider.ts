/**
 * OpenAI provider implementation
 */

import { createPinoLogger } from '@voltagent/logger';
import type {
	GenerateOptions,
	GenerateResult,
	ModelProvider,
} from '../types/model.js';

const logger = createPinoLogger({ name: 'OpenAIProvider' });

export interface OpenAIProviderConfig {
	apiKey: string;
	baseURL?: string;
	model: string;
}

export function createOpenAIProvider(
	config: OpenAIProviderConfig,
): ModelProvider {
	return {
		name: `openai:${config.model}`,

		async generate(
			prompt: string,
			options: GenerateOptions = {},
		): Promise<GenerateResult> {
			try {
				// Import dynamically to avoid dependency issues
				const { openai } = await import('@ai-sdk/openai');

				const client = openai(config.apiKey);

				const result = await client.chat.completions.create({
					model: config.model,
					messages: [{ role: 'user', content: prompt }],
					max_tokens: options.maxTokens,
					temperature: options.temperature,
					top_p: options.topP,
					stop: options.stop,
					tools: options.tools,
					tool_choice: options.toolChoice,
					stream: false,
				});

				const message = result.choices[0]?.message;

				return {
					content: message?.content || '',
					finishReason: result.choices[0]?.finish_reason || 'stop',
					usage: result.usage
						? {
								promptTokens: result.usage.prompt_tokens,
								completionTokens: result.usage.completion_tokens,
								totalTokens: result.usage.total_tokens,
							}
						: undefined,
					toolCalls: message?.tool_calls?.map((tc: any) => ({
						id: tc.id,
						type: 'function',
						function: {
							name: tc.function.name,
							arguments: tc.function.arguments,
						},
					})),
				};
			} catch (error) {
				logger.error('OpenAI generation failed:', error);
				throw new Error(
					`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		},

		async isAvailable(): Promise<boolean> {
			try {
				// Simple health check
				const response = await fetch(
					`${config.baseURL || 'https://api.openai.com'}/v1/models`,
					{
						headers: {
							Authorization: `Bearer ${config.apiKey}`,
							'Content-Type': 'application/json',
						},
					},
				);
				return response.ok;
			} catch (_error) {
				return false;
			}
		},

		async shutdown(): Promise<void> {
			// No cleanup needed
		},
	};
}
