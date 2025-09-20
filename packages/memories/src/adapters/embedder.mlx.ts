import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Embedder } from '../ports/Embedder.js';
import { EMBEDDER_ENV, getEnvWithFallback } from '../config/constants.js';
import { ConfigurationError } from '../errors.js';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

const DEFAULT_MLX_MODELS_DIR = path.join(os.homedir(), '.cache', 'huggingface');

// Available MLX embedding models - paths configurable via environment variables
const MLX_MODELS = {
	'qwen3-0.6b': {
		name: 'Qwen3-Embedding-0.6B',
		dimensions: 768,
		path:
			process.env[EMBEDDER_ENV.MLX_MODEL_QWEN3_0_6B_PATH] ||
			path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-0.6B'),
		recommendedFor: ['quick_search', 'development'],
	},
	'qwen3-4b': {
		name: 'Qwen3-Embedding-4B',
		dimensions: 768,
		path:
			process.env[EMBEDDER_ENV.MLX_MODEL_QWEN3_4B_PATH] ||
			path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-4B'),
		recommendedFor: ['production', 'balanced_performance'],
	},
	'qwen3-8b': {
		name: 'Qwen3-Embedding-8B',
		dimensions: 768,
		path:
			process.env[EMBEDDER_ENV.MLX_MODEL_QWEN3_8B_PATH] ||
			path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-8B'),
		recommendedFor: ['high_accuracy', 'research'],
	},
} as const;

type MLXModelName = keyof typeof MLX_MODELS;

const DEFAULT_MLX_MODEL: MLXModelName = 'qwen3-4b';

export class MLXEmbedder implements Embedder {
	private readonly modelName: MLXModelName;
	private readonly modelConfig: (typeof MLX_MODELS)[keyof typeof MLX_MODELS];

	constructor(modelName?: MLXModelName) {
		this.modelName = modelName || DEFAULT_MLX_MODEL;
		this.modelConfig = MLX_MODELS[this.modelName];

		if (!this.modelConfig) {
			throw new ConfigurationError(`Unsupported MLX model: ${this.modelName}`);
		}
	}

	name(): string {
		return this.modelName;
	}

	async embed(texts: string[]): Promise<number[][]> {
		try {
			// Try to use existing MLX service if available
			// MLX_EMBED_BASE_URL is the standardized name, MLX_SERVICE_URL is legacy fallback
			if (process.env.MLX_EMBED_BASE_URL || process.env.MLX_SERVICE_URL) {
				return await this.embedViaService(texts);
			}

			// Fallback to direct Python execution
			return await this.embedViaPython(texts);
		} catch (error) {
			console.warn('MLX embedding failed:', error);
			throw error;
		}
	}

	private async embedViaService(texts: string[]): Promise<number[][]> {
		// Narrow response shape to avoid any
		type EmbeddingResponse = { embeddings?: number[][]; embedding?: number[] };
		// Use standardized MLX embed base URL with fallback handling
		const base = getEnvWithFallback(
			EMBEDDER_ENV.MLX_EMBED_BASE_URL,
			[EMBEDDER_ENV.MLX_SERVICE_URL],
			{ context: 'MLX embedding service URL' }
		);
		if (!base) throw new ConfigurationError('MLX service URL not configured');
		const response = await fetch(`${base.replace(/\/$/, '')}/embed`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// Provide both fields for compatibility with various servers
			body: JSON.stringify({
				texts,
				input: texts,
				model: this.modelName,
			}),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			throw new ConfigurationError(
				`MLX service request failed: HTTP ${response.status} ${response.statusText}`,
			);
		}

		const data: EmbeddingResponse = await response.json();

		// Accept either {embeddings: number[][]} or single {embedding: number[]}
		if (Array.isArray(data.embeddings)) {
			return data.embeddings;
		}
		if (Array.isArray(data.embedding)) {
			return [data.embedding];
		}
		throw new ConfigurationError('MLX service response parsing failed: missing embeddings array');
	}

	private async embedViaPython(texts: string[]): Promise<number[][]> {
		// Use centralized Python runner to handle PYTHONPATH and env merging
		const pythonScriptPath = path.join(currentDirname, 'mlx-embedder.py');

		// Dynamic import from shared python exec utility; typed as any to avoid coupling
		type PyExec = {
			runPython: (
				script: string,
				args: string[],
				opts: Record<string, unknown>,
			) => Promise<unknown>;
		};
		const mod = (await import('../../../../libs/python/exec.js')) as unknown as PyExec;
		const { runPython } = mod;

		const run = () =>
			runPython(pythonScriptPath, [this.modelConfig.path, JSON.stringify(texts)], {
				envOverrides: {
					[EMBEDDER_ENV.MLX_MODELS_DIR]: process.env[EMBEDDER_ENV.MLX_MODELS_DIR] || DEFAULT_MLX_MODELS_DIR,
				},
				python: getEnvWithFallback(
					EMBEDDER_ENV.PYTHON_EXECUTABLE,
					[EMBEDDER_ENV.PYTHON_EXEC_LEGACY, EMBEDDER_ENV.MLX_PYTHON_PATH],
					{ context: 'Python executable path' }
				) || 'python3',
				setModulePath: process.env[EMBEDDER_ENV.PYTHON_MODULE_PATH] || undefined,
			} as unknown as Record<string, unknown>);

		const timer = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('MLX embedding timeout after 30000ms')), 30000),
		);

		const out = await Promise.race([run(), timer]);
		try {
			const result = JSON.parse(String(out || '{}'));
			if (result.error) throw new ConfigurationError(`MLX Python script error: ${String(result.error)}`);
			if (!Array.isArray(result.embeddings)) throw new ConfigurationError('MLX Python response: invalid embeddings format');
			return result.embeddings as number[][];
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			throw new ConfigurationError(`Failed to parse MLX Python response: ${msg}`);
		}
	}
}
