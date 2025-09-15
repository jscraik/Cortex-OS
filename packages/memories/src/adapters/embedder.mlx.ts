import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Embedder } from '../ports/Embedder.js';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

const DEFAULT_MLX_MODELS_DIR = path.join(os.homedir(), '.cache', 'huggingface');

// Available MLX embedding models - paths configurable via environment variables
const MLX_MODELS = {
	'qwen3-0.6b': {
		name: 'Qwen3-Embedding-0.6B',
		dimensions: 768,
		path:
			process.env.MLX_MODEL_QWEN3_0_6B_PATH ||
			path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-0.6B'),
		recommendedFor: ['quick_search', 'development'],
	},
	'qwen3-4b': {
		name: 'Qwen3-Embedding-4B',
		dimensions: 768,
		path:
			process.env.MLX_MODEL_QWEN3_4B_PATH ||
			path.join(DEFAULT_MLX_MODELS_DIR, 'models--Qwen--Qwen3-Embedding-4B'),
		recommendedFor: ['production', 'balanced_performance'],
	},
	'qwen3-8b': {
		name: 'Qwen3-Embedding-8B',
		dimensions: 768,
		path:
			process.env.MLX_MODEL_QWEN3_8B_PATH ||
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
			throw new Error(`Unsupported MLX model: ${this.modelName}`);
		}
	}

	name(): string {
		return this.modelName;
	}

	async embed(texts: string[]): Promise<number[][]> {
		try {
			// Try to use existing MLX service if available
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
		const base = process.env.MLX_EMBED_BASE_URL || process.env.MLX_SERVICE_URL;
		if (!base) throw new Error('MLX service URL not configured');
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
			throw new Error(
				`MLX service error: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Accept either {embeddings: number[][]} or single {embedding: number[]}
		if (Array.isArray((data as any).embeddings)) {
			return (data as any).embeddings as number[][];
		}
		if (Array.isArray((data as any).embedding)) {
			return [(data as any).embedding as number[]];
		}
		throw new Error('Invalid response format from MLX service');
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
		const mod = (await import(
			'../../../../libs/python/exec.js'
		)) as unknown as PyExec;
		const { runPython } = mod;

		const run = () =>
			runPython(
				pythonScriptPath,
				[this.modelConfig.path, JSON.stringify(texts)],
				{
					envOverrides: {
						MLX_MODELS_DIR:
							process.env.MLX_MODELS_DIR || DEFAULT_MLX_MODELS_DIR,
					},
					python: process.env.PYTHON_EXEC || 'python3',
					setModulePath: process.env.PYTHONPATH || undefined,
				} as unknown as Record<string, unknown>,
			);

		const timer = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error('MLX embedding timeout after 30000ms')),
				30000,
			),
		);

		const out = await Promise.race([run(), timer]);
		try {
			const result = JSON.parse(String(out || '{}'));
			if (result.error) throw new Error(String(result.error));
			if (!Array.isArray(result.embeddings))
				throw new Error('Invalid embeddings format from MLX');
			return result.embeddings as number[][];
		} catch (err) {
			throw new Error(`Failed to parse MLX response: ${err}`);
		}
	}
}
