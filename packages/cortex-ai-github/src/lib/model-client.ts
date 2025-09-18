/**
 * Model client utilities - functional approach
 * Broken down from large class methods
 */

import type {
	GitHubModel,
	GitHubModelsConfig,
	ModelCompletionRequest,
	ModelCompletionResponse,
	ModelMessage,
} from '../types/github-models.js';
import { fetchWithTimeout } from './fetch-with-timeout.js';

export interface ModelResponse {
	content: string;
	tokensUsed: number;
	finishReason: string;
}

export const buildModelRequest = (
	model: GitHubModel,
	messages: ModelMessage[],
	config: GitHubModelsConfig,
): ModelCompletionRequest => {
	return {
		model,
		messages,
		max_tokens: config.maxTokens,
		temperature: config.temperature,
	};
};

export const sendModelRequest = async (
	request: ModelCompletionRequest,
	config: GitHubModelsConfig,
): Promise<Response> => {
	const response = await fetchWithTimeout(
		`${config.baseUrl}/chat/completions`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request),
		},
		config.requestTimeoutMs ?? 10000,
	);

	if (!response.ok) {
		throw new Error(`GitHub Models API error: ${response.status} ${response.statusText}`);
	}

	return response;
};

export const parseModelResponse = (completion: ModelCompletionResponse): ModelResponse => {
	return {
		content: completion.choices[0]?.message?.content ?? '',
		tokensUsed: completion.usage.total_tokens,
		finishReason: completion.choices[0]?.finish_reason ?? 'unknown',
	};
};

export const updateRateLimitFromHeaders = (
	headers: Headers,
): { remaining: number; resetAt: Date } => {
	const remaining = headers.get('x-ratelimit-remaining');
	const resetTime = headers.get('x-ratelimit-reset');

	return {
		remaining: remaining ? parseInt(remaining, 10) : 1000,
		resetAt: resetTime ? new Date(parseInt(resetTime, 10) * 1000) : new Date(),
	};
};
