/**
 * @file_path packages/model-gateway/src/adapters/mlx-adapter.ts
 * MLX adapter for model gateway - interfaces with Python MLX embedding generator
 */

import { randomUUID } from 'node:crypto';
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
		input?: string;
		timeout?: number;
	},
): Promise<string> {
	return new Promise((resolve, reject) => {
		const pythonBin = options.python || 'python3';
		const timeout = options.timeout || 60000; // 1 minute default timeout
		const env = { ...process.env, ...options.envOverrides };

		if (options.setModulePath) {
			env.PYTHONPATH = options.setModulePath;
		}

		// Validate script path
		if (!scriptPath || typeof scriptPath !== 'string') {
			reject(new Error('Invalid script path: must be a non-empty string'));
			return;
		}

		const startTime = Date.now();
		let isResolved = false;
		let child: any;

		// Timeout handler
		const timeoutHandle = setTimeout(() => {
			if (!isResolved) {
				isResolved = true;
				if (child) {
					child.kill('SIGTERM');
					// Force kill if it doesn't terminate gracefully
					setTimeout(() => {
						try {
							child.kill('SIGKILL');
						} catch (e) {
							// Ignore errors when killing process
						}
					}, 5000);
				}
				reject(new Error(`Python script execution timed out after ${timeout}ms`));
			}
		}, timeout);

		try {
			child = spawn(pythonBin, [scriptPath, ...args], {
				env,
				stdio: ['pipe', 'pipe', 'pipe'],
				// Set resource limits if needed
				// detached: false,
			});

			let output = '';
			let error = '';
			let outputBuffer: Buffer[] = [];
			let errorBuffer: Buffer[] = [];

			// Collect stdout data
			child.stdout?.on('data', (data) => {
				outputBuffer.push(data);
			});

			// Collect stderr data
			child.stderr?.on('data', (data) => {
				errorBuffer.push(data);
			});

			// Handle process completion
			child.on('close', (code, signal) => {
				if (isResolved) return;

				clearTimeout(timeoutHandle);
				isResolved = true;

				// Combine buffered data
				output = Buffer.concat(outputBuffer).toString();
				error = Buffer.concat(errorBuffer).toString();

				const executionTime = Date.now() - startTime;

				if (signal) {
					// Process was killed by signal
					if (signal === 'SIGTERM' || signal === 'SIGKILL') {
						reject(new Error(`Python script terminated by signal ${signal} (likely timeout)`));
					} else {
						reject(new Error(`Python script terminated by signal ${signal}`));
					}
					return;
				}

				if (code === 0) {
					// Success
					resolve(output.trim());
				} else {
					// Error - provide detailed error information
					let errorMessage = `Python script failed with exit code ${code}`;

					if (error) {
						errorMessage += `\nStderr: ${error}`;
					}

					// Add common error suggestions
					if (error.includes('ModuleNotFoundError')) {
						errorMessage += '\nSuggestion: Check that required Python modules are installed';
					} else if (error.includes('FileNotFoundError') || error.includes('No such file or directory')) {
						errorMessage += `\nSuggestion: Check script path: ${scriptPath}`;
					} else if (error.includes('Permission denied')) {
						errorMessage += '\nSuggestion: Check file permissions for Python script';
					} else if (error.includes('MLX not available') || error.includes('mlx')) {
						errorMessage += '\nSuggestion: Install MLX and mlx_lm: pip install mlx mlx_lm';
					}

					errorMessage += `\nExecution time: ${executionTime}ms`;
					errorMessage += `\nCommand: ${pythonBin} ${scriptPath} ${args.join(' ')}`;

					reject(new Error(errorMessage));
				}
			});

			// Handle process spawn errors
			child.on('error', (err) => {
				if (isResolved) return;

				clearTimeout(timeoutHandle);
				isResolved = true;

				let errorMessage = `Failed to start Python process: ${err.message}`;

				if (err.message.includes('ENOENT')) {
					errorMessage += `\nSuggestion: Python binary '${pythonBin}' not found. Check Python installation.`;
				} else if (err.message.includes('EACCES')) {
					errorMessage += '\nSuggestion: Check permissions for Python binary';
				}

				reject(new Error(errorMessage));
			});

			// Write input to stdin if provided
			if (options.input) {
				try {
					child.stdin?.write(options.input);
					child.stdin?.end();
				} catch (stdinError) {
					if (!isResolved) {
						clearTimeout(timeoutHandle);
						isResolved = true;
						reject(new Error(`Failed to write to Python stdin: ${stdinError instanceof Error ? stdinError.message : 'Unknown'}`));
					}
				}
			} else {
				// Close stdin if no input provided
				child.stdin?.end();
			}

		} catch (spawnError) {
			if (!isResolved) {
				clearTimeout(timeoutHandle);
				isResolved = true;
				reject(new Error(`Failed to spawn Python process: ${spawnError instanceof Error ? spawnError.message : 'Unknown'}`));
			}
		}
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
	generateChatWithBands(request: {
		messages: ChatMessage[];
		model?: string;
		bandA?: string;
		bandB?: number[];
		bandC?: Array<{
			type: string;
			value: string | number | boolean;
			context: string;
			confidence: number;
		}>;
		virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
		enableStructuredOutput?: boolean;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string; bandUsage?: any; virtualTokenMode?: string; structuredFactsProcessed?: boolean }>;
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

		// Enhanced validation
		if (!modelConfig) {
			const availableModels = Object.keys(MLX_MODELS).filter(name => MLX_MODELS[name].type === 'embedding');
			throw new Error(
				`Unsupported MLX model: ${modelName}. Available embedding models: ${availableModels.join(', ')}`
			);
		}
		if (modelConfig.type !== 'embedding') {
			throw new Error(`Model ${modelName} is not an embedding model (type: ${modelConfig.type})`);
		}

		// Input validation
		if (!request.text || typeof request.text !== 'string') {
			throw new Error(`Invalid text input: must be a non-empty string, got ${typeof request.text}`);
		}
		if (request.text.length > 1000000) { // 1M character limit
			throw new Error(`Text too long: ${request.text.length} characters (max 1000000)`);
		}

		const startTime = Date.now();
		let retryCount = 0;
		const maxRetries = 3;

		while (retryCount <= maxRetries) {
			try {
				const result = await executePythonScript([request.text, '--model', modelName, '--json-only']);

				// Validate response format
				if (!result || typeof result !== 'string') {
					throw new Error('Empty or invalid response from MLX script');
				}

				let data;
				try {
					data = JSON.parse(result);
				} catch (parseError) {
					throw new Error(`Invalid JSON response from MLX script: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
				}

				// Validate embedding data
				if (!Array.isArray(data) || data.length === 0) {
					throw new Error('Invalid embedding response: expected non-empty array');
				}

				const embedding = data[0];
				if (!Array.isArray(embedding) || embedding.length === 0) {
					throw new Error('Invalid embedding format: expected non-empty array of numbers');
				}

				// Validate dimensions
				if (embedding.length !== modelConfig.dimensions) {
					console.warn(`Embedding dimension mismatch: expected ${modelConfig.dimensions}, got ${embedding.length}`);
				}

				const processingTime = Date.now() - startTime;

				return {
					embedding,
					model: modelName,
					dimensions: embedding.length, // Use actual length
					usage: {
						tokens: estimateTokenCount(request.text),
						cost: 0, // Local inference has no API cost
						processing_time_ms: processingTime,
					},
				};

			} catch (error) {
				retryCount++;

				// Log detailed error information
				const errorDetails = {
					modelName,
					textLength: request.text.length,
					retryCount,
					error: error instanceof Error ? error.message : 'Unknown error',
					errorType: error instanceof Error ? error.constructor.name : 'Unknown',
					timestamp: new Date().toISOString(),
				};

				console.error(`brAInwav MLX embedding generation failed (attempt ${retryCount}/${maxRetries + 1}):`, errorDetails);

				// Check if error is retryable
				const isRetryable = error instanceof Error && (
					error.message.includes('timeout') ||
					error.message.includes('memory') ||
					error.message.includes('resource') ||
					error.message.includes('connection')
				);

				if (retryCount > maxRetries || !isRetryable) {
					// Provide enhanced error message with suggestions
					let errorMessage = `brAInwav MLX embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

					if (error instanceof Error) {
						if (error.message.includes('MLX not available')) {
							errorMessage += '\nSuggestion: Install MLX and mlx_lm dependencies';
						} else if (error.message.includes('No such file or directory')) {
							errorMessage += `\nSuggestion: Check model path: ${modelConfig.path}`;
						} else if (error.message.includes('memory')) {
							errorMessage += '\nSuggestion: Try with a smaller model or free up memory';
						}
					}

					throw new Error(errorMessage);
				}

				// Exponential backoff before retry
				const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
				await new Promise(resolve => setTimeout(resolve, backoffMs));
			}
		}

		// This should never be reached
		throw new Error(`Failed to generate embedding after ${maxRetries + 1} attempts`);
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

	const generateChatWithBands = async (request: {
		messages: ChatMessage[];
		model?: string;
		bandA?: string;
		bandB?: number[];
		bandC?: Array<{
			type: string;
			value: string | number | boolean;
			context: string;
			confidence: number;
		}>;
		virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
		enableStructuredOutput?: boolean;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string; bandUsage?: any; virtualTokenMode?: string; structuredFactsProcessed?: boolean }> => {
		const modelName = request.model || 'qwen3-coder-30b-mlx';
		const modelConfig = MLX_MODELS[modelName];

		// Enhanced validation
		if (!modelConfig || modelConfig.type !== 'chat') {
			const availableModels = Object.keys(MLX_MODELS).filter(name => MLX_MODELS[name].type === 'chat');
			throw new Error(
				`Unsupported MLX chat model: ${modelName}. Available chat models: ${availableModels.join(', ')}`
			);
		}

		// Validate messages
		if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
			throw new Error('Invalid or empty messages array');
		}

		// Validate tri-band context
		const bandA = request.bandA || '';
		const bandB = request.bandB || [];
		const bandC = request.bandC || [];

		if (typeof bandA !== 'string') {
			throw new Error(`Invalid bandA: expected string, got ${typeof bandA}`);
		}
		if (!Array.isArray(bandB)) {
			throw new Error(`Invalid bandB: expected array, got ${typeof bandB}`);
		}
		if (!Array.isArray(bandC)) {
			throw new Error(`Invalid bandC: expected array, got ${typeof bandC}`);
		}

		// Check if tri-band context is actually provided
		const hasTriBandContext = bandA.length > 0 || bandB.length > 0 || bandC.length > 0;

		// If no tri-band context, use standard generation
		if (!hasTriBandContext) {
			console.log('No tri-band context provided, using standard MLX chat generation');
			return await generateChat({
				messages: request.messages,
				model: request.model,
				max_tokens: request.max_tokens,
				temperature: request.temperature,
			}).then(result => ({
				...result,
				bandUsage: { bandAChars: 0, bandBVirtualTokens: 0, bandCFacts: 0 },
				virtualTokenMode: request.virtualTokenMode || 'pass-through',
				structuredFactsProcessed: false,
			}));
		}

		// Use RAG Python script for tri-band support
		const ragScriptPath = path.resolve(
			path.dirname(new URL(import.meta.url).pathname),
			'../../../../packages/rag/python/mlx_generate.py',
		);

		const startTime = Date.now();
		let retryCount = 0;
		const maxRetries = 2; // Fewer retries for tri-band as it's more complex

		while (retryCount <= maxRetries) {
			try {
				const prompt = request.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

				// Validate prompt length
				if (prompt.length > 500000) { // 500K character limit for tri-band
					throw new Error(`Prompt too long for tri-band generation: ${prompt.length} characters`);
				}

				// Build input for tri-band generation
				const inputData = {
					model: modelConfig.path, // Use local path for MLX models
					prompt,
					max_tokens: Math.min(request.max_tokens || 1000, 2048), // Cap for tri-band
					temperature: Math.max(0.1, Math.min(request.temperature || 0.7, 1.0)), // Clamp temperature
					// REF‑RAG tri-band context
					bandA,
					bandB,
					bandC,
					virtualTokenMode: request.virtualTokenMode || 'pass-through',
					enableStructuredOutput: Boolean(request.enableStructuredOutput),
                                        request_id: `triband_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 9)}`,
				};

				const result = await runPython(ragScriptPath, [], {
					python: pythonPath,
					setModulePath: path.resolve(process.cwd(), 'packages/rag/python'),
					envOverrides: {
						// Use same environment as regular MLX
						HF_HOME: process.env.HF_HOME || '/Volumes/ExternalSSD/huggingface_cache',
						TRANSFORMERS_CACHE: process.env.TRANSFORMERS_CACHE || '/Volumes/ExternalSSD/ai-cache/huggingface/transformers',
						MLX_CACHE_DIR: process.env.MLX_CACHE_DIR || '/Volumes/ExternalSSD/ai-cache',
						MLX_MODEL_PATH: process.env.MLX_MODEL_PATH || '/Volumes/ExternalSSD/ai-models',
						// Add timeout for tri-band generation
						PYTHONUNBUFFERED: '1',
					},
					input: JSON.stringify(inputData),
					timeout: 120000, // 2 minute timeout for tri-band generation
				});

				// Validate response
				if (!result || typeof result !== 'string') {
					throw new Error('Empty or invalid response from tri-band generation script');
				}

				let data;
				try {
					data = JSON.parse(result);
				} catch (parseError) {
					throw new Error(`Invalid JSON response from tri-band script: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
				}

				// Check for error in response
				if (data.error) {
					throw new Error(`Tri-band generation script error: ${data.error}`);
				}

				// Validate response content
				if (!data.text && typeof data.text !== 'string') {
					throw new Error('Invalid tri-band response: missing or invalid text field');
				}

				const processingTime = Date.now() - startTime;

				return {
					content: data.text || 'No response generated',
					model: modelName,
					bandUsage: data.bandUsage || { bandAChars: bandA.length, bandBVirtualTokens: bandB.length, bandCFacts: bandC.length },
					virtualTokenMode: data.virtualTokenMode || request.virtualTokenMode || 'pass-through',
					structuredFactsProcessed: Boolean(data.structuredFactsProcessed),
					usage: {
						processing_time_ms: processingTime,
						bandA_chars: bandA.length,
						bandB_tokens: bandB.length,
						bandC_facts: bandC.length,
					},
				};

			} catch (error) {
				retryCount++;

				// Enhanced error logging
				const errorDetails = {
					modelName,
					bandALength: bandA.length,
					bandBLength: bandB.length,
					bandCLength: bandC.length,
					retryCount,
					error: error instanceof Error ? error.message : 'Unknown error',
					errorType: error instanceof Error ? error.constructor.name : 'Unknown',
					timestamp: new Date().toISOString(),
				};

				console.error(`MLX tri-band generation failed (attempt ${retryCount}/${maxRetries + 1}):`, errorDetails);

				// Check if we should fallback to standard generation
				const shouldFallback = retryCount > maxRetries || (
					error instanceof Error && (
						error.message.includes('script not found') ||
						error.message.includes('module not found') ||
						error.message.includes('import error')
					)
				);

				if (shouldFallback) {
					console.warn('Falling back to standard MLX chat without tri-band context due to tri-band failure');
					try {
						const fallbackResult = await generateChat({
							messages: request.messages,
							model: request.model,
							max_tokens: request.max_tokens,
							temperature: request.temperature,
						});

						return {
							...fallbackResult,
							bandUsage: { bandAChars: 0, bandBVirtualTokens: 0, bandCFacts: 0 },
							virtualTokenMode: request.virtualTokenMode || 'pass-through',
							structuredFactsProcessed: false,
							fallback_used: true,
							fallback_reason: error instanceof Error ? error.message : 'Unknown tri-band error',
						};

					} catch (fallbackError) {
						// If even fallback fails, throw the original error
						throw new Error(`Both tri-band and standard generation failed. Tri-band error: ${error instanceof Error ? error.message : 'Unknown'}. Fallback error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
					}
				}

				// Exponential backoff for retryable errors
				const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 3000);
				await new Promise(resolve => setTimeout(resolve, backoffMs));
			}
		}

		// This should never be reached due to fallback logic
		throw new Error(`Failed to generate tri-band response after ${maxRetries + 1} attempts`);
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
		generateChatWithBands,
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
	generateChatWithBands(request: {
		messages: ChatMessage[];
		model?: string;
		bandA?: string;
		bandB?: number[];
		bandC?: Array<{
			type: string;
			value: string | number | boolean;
			context: string;
			confidence: number;
		}>;
		virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
		enableStructuredOutput?: boolean;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string; bandUsage?: any; virtualTokenMode?: string; structuredFactsProcessed?: boolean }> {
		return this.impl.generateChatWithBands(request);
	}
	rerank(query: string, documents: string[], model?: string): Promise<{ scores: number[] }> {
		return this.impl.rerank(query, documents, model);
	}
	isAvailable(): Promise<boolean> {
		return this.impl.isAvailable();
	}
}
