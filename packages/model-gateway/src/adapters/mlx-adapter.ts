/**
 * @file_path packages/model-gateway/src/adapters/mlx-adapter.ts
 * MLX adapter for model gateway - interfaces with Python MLX embedding generator
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { estimateTokenCount } from '../lib/estimate-token-count.js';

/**
 * Execute Python script with arguments and environment
 */
function runPython(
	scriptPath: string,
	args: string[],
	options: {
		python?: string;
		setModulePath?: string;
		envOverrides?: Record<string, string>;
	},
): Promise<string> {
	return new Promise((resolve, reject) => {
		const pythonBin = options.python || 'python3';
		const env = { ...process.env, ...options.envOverrides };
		if (options.setModulePath) {
			env.PYTHONPATH = options.setModulePath;
		}

		const child = spawn(pythonBin, [scriptPath, ...args], { env });
		let output = '';
		let error = '';

		child.stdout?.on('data', (data) => {
			output += data.toString();
		});

		child.stderr?.on('data', (data) => {
			error += data.toString();
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve(output.trim());
			} else {
				reject(new Error(`Python script failed with code ${code}: ${error}`));
			}
		});

		child.on('error', (err) => {
			reject(new Error(`Failed to start Python process: ${err.message}`));
		});
	});
}

// Types for MLX model configurations (discriminated union)
type MLXModelType = 'embedding' | 'reranking' | 'chat';
interface MLXModelConfigBase {
	path: string;
	hf_path: string;
	type: MLXModelType;
	memory_gb: number;
	context_length?: number;
	max_tokens?: number;
	capabilities?: string[];
}
interface EmbeddingModelConfig extends MLXModelConfigBase {
	type: 'embedding';
	dimensions: number;
}
interface RerankModelConfig extends MLXModelConfigBase {
	type: 'reranking';
}
interface ChatModelConfig extends MLXModelConfigBase {
	type: 'chat';
}
type MLXModelConfig = EmbeddingModelConfig | RerankModelConfig | ChatModelConfig;

// Chat message types (avoid inline union types in signatures)
type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

// Configuration paths - can be overridden via environment
const HUGGINGFACE_CACHE =
	process.env.HF_HOME || process.env.TRANSFORMERS_CACHE || '/Volumes/ExternalSSD/huggingface_cache';
const MODEL_BASE_PATH = process.env.MLX_MODEL_BASE_PATH || HUGGINGFACE_CACHE;

// MLX model configurations with configurable paths
const MLX_MODELS: Record<string, MLXModelConfig> = {
	// Embedding models from HuggingFace cache
	'qwen3-embedding-0.6b-mlx': {
		path: `${MODEL_BASE_PATH}/models--Qwen--Qwen3-Embedding-0.6B`,
		hf_path: 'Qwen/Qwen3-Embedding-0.6B',
		type: 'embedding',
		memory_gb: 1.0,
		dimensions: 1536,
		context_length: 8192,
	},
	'qwen3-embedding-4b-mlx': {
		path: `${MODEL_BASE_PATH}/models--Qwen--Qwen3-Embedding-4B`,
		hf_path: 'Qwen/Qwen3-Embedding-4B',
		type: 'embedding',
		memory_gb: 4.0,
		dimensions: 1536,
		context_length: 8192,
	},
	'qwen3-embedding-8b-mlx': {
		path: `${MODEL_BASE_PATH}/models--Qwen--Qwen3-Embedding-8B`,
		hf_path: 'Qwen/Qwen3-Embedding-8B',
		type: 'embedding',
		memory_gb: 8.0,
		dimensions: 1536,
		context_length: 8192,
	},
	// Reranker models
	'qwen3-reranker-4b-mlx': {
		path: `${MODEL_BASE_PATH}/models--Qwen--Qwen3-Reranker-4B`,
		hf_path: 'Qwen/Qwen3-Reranker-4B',
		type: 'reranking',
		memory_gb: 4.0,
		context_length: 8192,
	},
	// Chat/completion models from HuggingFace MLX cache
	'qwen3-coder-30b-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit`,
		hf_path: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
		type: 'chat',
		memory_gb: 16.0,
		max_tokens: 4096,
		context_length: 32768,
		capabilities: ['code'],
	},
	'qwen2.5-vl-3b-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit`,
		hf_path: 'mlx-community/Qwen2.5-VL-3B-Instruct-6bit',
		type: 'chat',
		memory_gb: 3.0,
		max_tokens: 4096,
		context_length: 32768,
		capabilities: ['vision'],
	},
	'qwen2.5-0.5b-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--Qwen2.5-0.5B-Instruct-4bit`,
		hf_path: 'mlx-community/Qwen2.5-0.5B-Instruct-4bit',
		type: 'chat',
		memory_gb: 0.5,
		max_tokens: 4096,
		context_length: 32768,
	},
	'mixtral-8x7b-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--Mixtral-8x7B-v0.1-hf-4bit-mlx`,
		hf_path: 'mlx-community/Mixtral-8x7B-v0.1-hf-4bit-mlx',
		type: 'chat',
		memory_gb: 24.0,
		max_tokens: 4096,
		context_length: 32768,
	},
	'gemma2-2b-mlx': {
		path: `${MODEL_BASE_PATH}/models--mlx-community--gemma-2-2b-it-4bit`,
		hf_path: 'mlx-community/gemma-2-2b-it-4bit',
		type: 'chat',
		memory_gb: 2.0,
		max_tokens: 4096,
		context_length: 8192,
	},
	'glm-4.5-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--GLM-4.5-4bit`,
		hf_path: 'mlx-community/GLM-4.5-4bit',
		type: 'chat',
		memory_gb: 12.0,
		max_tokens: 4096,
		context_length: 32768,
	},
	'phi3-mini-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--mlx-community--Phi-3-mini-4k-instruct-4bit`,
		hf_path: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
		type: 'chat',
		memory_gb: 2.0,
		max_tokens: 4096,
		context_length: 4096,
	},
	'gpt-oss-20b-mlx': {
		path: `${MODEL_BASE_PATH}/hub/models--lmstudio-community--gpt-oss-20b-MLX-8bit`,
		hf_path: 'lmstudio-community/gpt-oss-20b-MLX-8bit',
		type: 'chat',
		memory_gb: 12.0,
		max_tokens: 4096,
		context_length: 8192,
		capabilities: ['reasoning', 'storytelling'],
	},
} as const;

export type MLXModelName = keyof typeof MLX_MODELS;

// Request/response schemas
export const MLXEmbeddingResponseSchema = z.object({
	embedding: z.array(z.number()),
	model: z.string(),
	dimensions: z.number(),
	usage: z
		.object({
			tokens: z.number(),
			cost: z.number().optional(),
		})
		.optional(),
});

export type MLXEmbeddingRequest = {
	text: string;
	model?: string;
};

export type MLXEmbeddingResponse = {
	embedding: number[];
	model: string;
	dimensions: number;
	usage?: {
		tokens: number;
		cost?: number;
	};
};

export type MLXChatRequest = {
	messages: {
		role: 'system' | 'user' | 'assistant';
		content: string;
	}[];
	model?: string;
	max_tokens?: number;
	temperature?: number;
};

export type MLXChatResponse = {
	content: string;
	model: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
};

export interface MLXAdapterApi {
	generateEmbedding(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse>;
	generateEmbeddings(texts: string[], model?: string): Promise<MLXEmbeddingResponse[]>;
	generateChat(request: {
		messages: ChatMessage[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string }>;
	rerank(query: string, documents: string[], model?: string): Promise<{ scores: number[] }>;
	isAvailable(): Promise<boolean>;
}

/**
 * Factory to create an MLX adapter
 */
export function createMLXAdapter(): MLXAdapterApi {
	const pythonPath = process.env.PYTHON_PATH || process.env.PYTHON_EXEC || 'python3';
	const embeddingScriptPath = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		'../../../../apps/cortex-py/src/mlx/embedding_generator.py',
	);
	const unifiedScriptPath = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		'../../../../apps/cortex-py/src/mlx/mlx_unified.py',
	);

	const executePythonScript = (args: string[], useUnified = false): Promise<string> => {
		// brAInwav: Real MLX integration - no mocks allowed per specification
		const script = useUnified ? unifiedScriptPath : embeddingScriptPath;
		return runPython(script, args, {
			python: pythonPath,
			setModulePath: path.resolve(process.cwd(), 'apps/cortex-py/src'),
			envOverrides: {
				// brAInwav: Use ExternalSSD paths from .env.local
				HF_HOME: process.env.HF_HOME || '/Volumes/ExternalSSD/huggingface_cache',
				TRANSFORMERS_CACHE:
					process.env.TRANSFORMERS_CACHE ||
					'/Volumes/ExternalSSD/ai-cache/huggingface/transformers',
				MLX_CACHE_DIR: process.env.MLX_CACHE_DIR || '/Volumes/ExternalSSD/ai-cache',
				MLX_MODEL_PATH: process.env.MLX_MODEL_PATH || '/Volumes/ExternalSSD/ai-models',
				MLX_EMBED_BASE_URL: process.env.MLX_EMBED_BASE_URL || 'http://127.0.0.1:8000',
			},
		});
	};

	const generateEmbedding = async (request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> => {
		const modelName = request.model || 'qwen3-embedding-4b-mlx';
		const modelConfig = MLX_MODELS[modelName];
		if (!modelConfig) {
			throw new Error(`Unsupported MLX model: ${modelName}`);
		}
		if (modelConfig.type !== 'embedding') {
			throw new Error(`Model ${modelName} is not an embedding model`);
		}

		try {
			const result = await executePythonScript([request.text, '--model', modelName, '--json-only']);
			const data = JSON.parse(result);

			return {
				embedding: data[0], // Python script returns array of arrays, take first
				model: modelName,
				dimensions: modelConfig.dimensions,
				usage: {
					tokens: estimateTokenCount(request.text),
					cost: 0, // Local inference has no API cost
				},
			};
		} catch (error) {
			console.error('brAInwav MLX embedding generation failed:', error);
			throw new Error(
				`brAInwav MLX embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	};

	const generateEmbeddings = async (
		texts: string[],
		model?: string,
	): Promise<MLXEmbeddingResponse[]> => {
		const modelName = model || 'qwen3-embedding-4b-mlx';

		try {
			const result = await executePythonScript([...texts, '--model', modelName, '--json-only']);

			const data = JSON.parse(result);

			if (!Array.isArray(data)) {
				throw new Error('Expected array of embeddings from MLX script');
			}

			const modelConfig = MLX_MODELS[modelName];
			if (!modelConfig || modelConfig.type !== 'embedding') {
				throw new Error(`Model ${modelName} is not an embedding model`);
			}
			const totalTokens = texts.reduce((sum, text) => sum + estimateTokenCount(text), 0);

			return data.map((embedding: number[]) =>
				MLXEmbeddingResponseSchema.parse({
					embedding,
					model: modelName,
					dimensions: modelConfig.dimensions,
					usage: {
						tokens: Math.floor(totalTokens / texts.length), // Approximate per-text tokens
						cost: 0,
					},
				}),
			);
		} catch (error) {
			console.error('MLX batch embedding generation failed:', error);
			throw new Error(
				`MLX batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	};

	const rerank = async (
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[] }> => {
		const modelName = model || 'qwen3-reranker-4b-mlx';
		const args = [
			query,
			JSON.stringify(documents),
			'--model',
			modelName,
			'--rerank-mode',
			'--json-only',
		];
		try {
			const result = await executePythonScript(args, true);
			const data = JSON.parse(result);
			// data.scores may be array of {index, score}. Map to ordered scores aligned with input docs
			if (
				Array.isArray(data.scores) &&
				data.scores.length > 0 &&
				typeof data.scores[0] === 'object'
			) {
				const tmp: number[] = new Array(documents.length).fill(0);
				for (const item of data.scores) {
					if (typeof item.index === 'number' && typeof item.score === 'number') {
						tmp[item.index] = item.score;
					}
				}
				return { scores: tmp };
			}
			if (Array.isArray(data.scores)) {
				return { scores: data.scores as number[] };
			}
			throw new Error('Invalid rerank response');
		} catch (error) {
			console.error('MLX rerank failed:', error);
			throw new Error(
				`MLX rerank failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	};

	const generateChat = async (request: {
		messages: ChatMessage[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string }> => {
		const modelName = request.model || 'qwen3-coder-30b-mlx';
		const modelConfig = MLX_MODELS[modelName];

		if (!modelConfig || modelConfig.type !== 'chat') {
			throw new Error(`Unsupported MLX chat model: ${modelName}`);
		}

		try {
			const prompt = request.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

			const args = [
				prompt,
				'--model',
				modelName,
				'--chat-mode',
				'--max-tokens',
				String(request.max_tokens || 1000),
				'--temperature',
				String(request.temperature || 0.7),
				'--json-only',
			];

			const result = await executePythonScript(args, true);
			const data = JSON.parse(result);

			return {
				content: data.content || data.response || 'No response generated',
				model: modelName,
			};
		} catch (error) {
			console.error('MLX chat generation failed:', error);
			throw new Error(
				`MLX chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	};

	const isAvailable = async (): Promise<boolean> => {
		try {
			// Test with a simple text to check if MLX is available
			await executePythonScript(['test', '--json-only']);
			return true;
		} catch {
			return false;
		}
	};

	return {
		generateEmbedding,
		generateEmbeddings,
		generateChat,
		rerank,
		isAvailable,
	};
}

// Class wrapper so tests can instantiate `new MLXAdapter()` and use mocks
export class MLXAdapter implements MLXAdapterApi {
	private readonly impl = createMLXAdapter();

	generateEmbedding(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> {
		return this.impl.generateEmbedding(request);
	}
	generateEmbeddings(texts: string[], model?: string): Promise<MLXEmbeddingResponse[]> {
		return this.impl.generateEmbeddings(texts, model);
	}
	generateChat(request: {
		messages: ChatMessage[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string }> {
		return this.impl.generateChat(request);
	}
	rerank(query: string, documents: string[], model?: string): Promise<{ scores: number[] }> {
		return this.impl.rerank(query, documents, model);
	}
	isAvailable(): Promise<boolean> {
		return this.impl.isAvailable();
	}
}
