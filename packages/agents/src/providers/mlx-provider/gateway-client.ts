/**
 * MLX Gateway HTTP Client
 *
 * HTTP client for MLX Model Gateway communication
 */

import { redactSecrets } from '../../lib/secret-store.js';
import type { GenerateOptions, GenerateResult } from '../../lib/types.js';
import { estimateTokens } from '../../lib/utils.js';
import type { MLXState } from './types.js';

interface MLXGatewayProblemDetails {
	/** Problem type URI or code */
	type?: string;
	title?: string;
	detail?: string;
	status?: number;
	[key: string]: unknown; // allow passthrough
}

interface MLXGatewayTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

interface MLXGatewayResult extends GenerateResult {
	text: string;
	provider: string;
	usage: MLXGatewayTokenUsage;
	latencyMs: number;
}

export const executeMLXGeneration = async (
	prompt: string,
	options: GenerateOptions,
	state: MLXState,
): Promise<MLXGatewayResult> => {
	const startTime = Date.now();
	const adjustedOptions = adjustGenerationParams(options, state);
	const url = `${state.config.gatewayUrl?.replace(/\/$/, '')}/chat`;

	const body = {
		model: state.config.modelPath,
		msgs: [{ role: 'user', content: prompt }],
		max_tokens: Math.min(adjustedOptions.maxTokens || 2048, 4096),
		temperature: adjustedOptions.temperature ?? 0.7,
	};

	let res: Response;
	try {
		if (!state.config.gatewayUrl) {
			throw new Error('fetch failed: gateway URL not configured');
		}
		res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			let problem: MLXGatewayProblemDetails | null = null;
			try {
				const text = await res.text();
				problem = JSON.parse(text);
			} catch {
				// ignore parse error
			}
			const status = res.status;
			const title = problem?.title || 'mlx_gateway_error';
			const detail = problem?.detail || (problem ? JSON.stringify(problem) : '');
			const msg = `MLX gateway error: ${status} ${title} ${detail}`.trim();
			const error = new Error(redactSecrets(msg)) as Error & {
				code?: string;
				status?: number;
			};
			error.code = problem?.type || String(status);
			error.status = status;
			throw error;
		}
	} catch (e: unknown) {
		if (
			typeof (e as { message?: string })?.message === 'string' &&
			(e as { message?: string }).message!.includes('MLX gateway error')
		) {
			throw e;
		}
		const err = new Error('fetch failed') as Error & { cause?: unknown };
		err.cause = e;
		throw err;
	}

	const data = await res.json().catch((e) => {
		throw new Error(
			`Failed to parse MLX gateway response: ${redactSecrets(String(e))}`,
		);
	});

	const text: string = data?.content || '';
	const latencyMs = Date.now() - startTime;
	const tokenUsage: MLXGatewayTokenUsage = {
		promptTokens: estimateTokens(prompt),
		completionTokens: estimateTokens(text),
		totalTokens: estimateTokens(prompt + text),
	};

	// Map to the canonical GenerateResult shape used in agents
	return {
		// Legacy/test-friendly fields
		text,
		provider: 'mlx',
		usage: tokenUsage,
		latencyMs,
		// Canonical fields
		content: text,
		tokenUsage,
		metadata: { latencyMs, provider: 'mlx' },
	};
};

const adjustGenerationParams = (
	options: GenerateOptions,
	state: MLXState,
): GenerateOptions => {
	const adjusted = { ...options };

	if (state.thermalStatus.level === 'hot') {
		adjusted.maxTokens = Math.min(adjusted.maxTokens || 2048, 1024);
		adjusted.temperature = Math.max(adjusted.temperature || 0.7, 0.3);
	} else if (state.thermalStatus.level === 'critical') {
		adjusted.maxTokens = Math.min(adjusted.maxTokens || 2048, 512);
		adjusted.temperature = 0.1;
	}

	if (state.memoryStatus.pressure === 'warning') {
		adjusted.maxTokens = Math.min(adjusted.maxTokens || 2048, 1536);
	} else if (state.memoryStatus.pressure === 'critical') {
		adjusted.maxTokens = Math.min(adjusted.maxTokens || 2048, 1024);
	}

	return adjusted;
};
