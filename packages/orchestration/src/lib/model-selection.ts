/**
 * Model selection utilities for MLX → Ollama → Frontier hierarchy
 */

export interface ModelSpec {
	provider: string;
	model: string;
	available?: boolean;
}

/**
 * Health check for MLX service availability.
 * Connects to the actual ML inference service.
 */
async function checkMLXHealth(url = 'http://localhost:8001'): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

		const response = await fetch(`${url}/health`, {
			method: 'GET',
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});

		clearTimeout(timeoutId);
		return response.ok && response.status === 200;
	} catch {
		// Service is not available (connection failed, timeout, etc.)
		return false;
	}
}

/**
 * Attempt to select an MLX model for the given task.
 * Returns the model name if available, null otherwise.
 */
export async function selectMLXModel(task: string): Promise<string | null> {
	// Check if MLX service is actually running and healthy
	try {
		// For different tasks, prefer different MLX models
		const mlxModels: Record<string, string> = {
			chat: 'mlx-community/Phi-3.5-mini-instruct-4bit',
			code: 'mlx-community/CodeLlama-7B-Instruct-4bit',
			analysis: 'mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx',
			embed: 'mlx-community/bge-small-en-v1.5-f16',
		};

		const selectedModel = mlxModels[task] || mlxModels.chat;

		// Actually check if MLX service is running
		const isMLXAvailable = await checkMLXHealth();

		return isMLXAvailable ? selectedModel : null;
	} catch {
		return null;
	}
}

/**
 * Health check for Ollama service availability.
 * Connects to the actual Ollama API service.
 */
async function checkOllamaHealth(url = 'http://localhost:11434'): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

		const response = await fetch(`${url}/api/tags`, {
			method: 'GET',
			signal: controller.signal,
			headers: { Accept: 'application/json' },
		});

		clearTimeout(timeoutId);
		return response.ok && response.status === 200;
	} catch {
		// Service is not available (connection failed, timeout, etc.)
		return false;
	}
}

/**
 * Attempt to select an Ollama model for the given task.
 * Returns the model name if available, null otherwise.
 */
export async function selectOllamaModel(task: string): Promise<string | null> {
	try {
		// Task-specific Ollama model preferences
		const ollamaModels: Record<string, string> = {
			chat: 'llama3.2:3b',
			code: 'codellama:7b',
			analysis: 'llama3.2:8b',
			embed: 'nomic-embed-text',
		};

		const selectedModel = ollamaModels[task] || ollamaModels.chat;

		// Actually check if Ollama service is running and healthy
		const isOllamaAvailable = await checkOllamaHealth();

		return isOllamaAvailable ? selectedModel : null;
	} catch {
		return null;
	}
}

/**
 * Select a frontier model API as final fallback.
 * This should always return a model (doesn't return null).
 */
export function selectFrontierModel(task: string): ModelSpec {
	// Task-specific frontier model preferences
	const frontierModels: Record<string, ModelSpec> = {
		chat: { provider: 'openai', model: 'gpt-4o-mini' },
		code: { provider: 'openai', model: 'gpt-4o' },
		analysis: { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
		embed: { provider: 'openai', model: 'text-embedding-3-small' },
	};

	return frontierModels[task] || frontierModels.chat;
}
