import { env } from 'node:process';
import { createLogger } from '@cortex-os/mvp-core';
import { isPrivateHostname, safeFetchJson } from '@cortex-os/utils';
import { z } from 'zod';

const logger = createLogger('model-provider');

const promptSchema = z.string();

function deriveOptions(endpoint: string) {
	const url = new URL(endpoint);
	const hostname = url.hostname.toLowerCase();
	return {
		allowedHosts: [hostname],
		allowedProtocols: [url.protocol],
		allowLocalhost: isPrivateHostname(hostname),
	};
}

async function postJson<T>(
	endpoint: string,
	payload: Record<string, unknown>,
	context: string,
): Promise<T> {
	try {
		return await safeFetchJson<T>(endpoint, {
			...deriveOptions(endpoint),
			fetchOptions: {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`[brAInwav] ${context} failed: ${message}`);
	}
}

export async function requestMLX(
	prompt: string,
	url = 'http://localhost:8001/inference',
): Promise<unknown> {
	const validPrompt = promptSchema.parse(prompt);
	return postJson(url, { prompt: validPrompt }, 'MLX request');
}

export async function requestOllama(
	prompt: string,
	url = 'http://localhost:11434/api/generate',
): Promise<unknown> {
	const validPrompt = promptSchema.parse(prompt);
	return postJson(url, { prompt: validPrompt }, 'Ollama request');
}

export async function requestModel(
	prompt: string,
	options?: { mlxUrl?: string; ollamaUrl?: string },
): Promise<unknown> {
	try {
		return await requestMLX(prompt, options?.mlxUrl);
	} catch (error) {
		logger.error({ error }, 'MLX request failed');
		if (env.ENABLE_OLLAMA !== 'true') {
			throw error;
		}
		logger.warn('Falling back to Ollama');
		return requestOllama(prompt, options?.ollamaUrl);
	}
}
