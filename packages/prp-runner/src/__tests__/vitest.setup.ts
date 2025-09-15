/**
 * Vitest global setup for prp-runner package.
/**
 * Vitest global setup for prp-runner package.
 * Provides lightweight mocks for native / heavy dependencies not required for logic tests.
 */
import { vi } from 'vitest';

// Mock sharp to avoid native binary requirement in CI / local without install.
vi.mock('sharp', () => {
	type SharpApi = {
		resize: (w: number, h?: number) => SharpApi;
		toFormat: (fmt: string, opts?: Record<string, unknown>) => SharpApi;
		png: (opts?: Record<string, unknown>) => SharpApi;
		jpeg: (opts?: Record<string, unknown>) => SharpApi;
		webp: (opts?: Record<string, unknown>) => SharpApi;
		toBuffer: () => Promise<Buffer>;
		metadata: () => Promise<{ width: number; height: number; format: string }>;
	};
	const createMockSharpInstance = (_input?: unknown): SharpApi => {
		const api: SharpApi = {
			resize: (_w: number, _h?: number) => api,
			toFormat: (_fmt: string, _opts?: Record<string, unknown>) => api,
			png: (_opts?: Record<string, unknown>) => api,
			jpeg: (_opts?: Record<string, unknown>) => api,
			webp: (_opts?: Record<string, unknown>) => api,
			toBuffer: async () => Buffer.from('mock-image-bytes'),
			metadata: async () => ({ width: 0, height: 0, format: 'mock' }),
		};
		return api;
	};
	return { default: (input?: unknown) => createMockSharpInstance(input) };
});

// Mock any optional heavy model loaders if they appear later (placeholder)
vi.mock('@xenova/transformers', () => {
	return {
		pipeline: async () => async (_args: unknown) => ({
			embedding: [0, 0, 0] as number[],
		}),
	};
});

// Mock ollama client to avoid network calls
vi.mock('ollama', () => {
	class MockOllama {
		host: string | undefined;
		constructor(opts: { host?: string } | undefined) {
			this.host = opts?.host;
		}
		async generate({ prompt }: { prompt: string }) {
			const p = String(prompt || '');
			// Return a response that includes 'strategy' when prompted to generate strategies
			if (/strategy/i.test(p)) {
				return {
					response: 'This is a generated strategy: strategy plan and steps',
				};
			}
			if (/count from 1 to 5/i.test(p)) {
				return { response: '1 2 3 4 5' };
			}
			return { response: 'mock-ollama-response' };
		}
	}
	return { Ollama: MockOllama };
});

// Mock MLX adapter to simulate healthy model and simple generation
vi.mock('../mlx-adapter.js', async () => {
	// Provide a simple mock MLXAdapter class matching the real adapter surface used in tests
	class MockMLXAdapter {
		private modelName: string;
		private availableModels: string[];
		constructor(config: Record<string, unknown> | undefined) {
			this.modelName = String(
				(config as Record<string, unknown>)?.modelName ||
					'Qwen2.5-0.5B-Instruct-4bit',
			); // valid, no change
			// include both canonical names and short tokens to improve matching
			this.availableModels = (
				Object.values(AVAILABLE_MLX_MODELS) as string[]
			).concat(['qwen', 'phi', 'qwen2.5', 'phi-3']);
		}

		async checkHealth() {
			return { healthy: true, message: 'Model is healthy' };
		}

		async listModels() {
			// Expose the canonical model names expected by tests
			return this.availableModels.map((name, idx) => ({
				name,
				id: `${name.replace(/\s+/g, '-').toLowerCase()}-${idx + 1}`,
				size: name.toLowerCase().includes('phi') ? 'mini' : '4bit',
				modified: new Date().toISOString(),
				path: `/models/${name.replace(/\s+/g, '-').toLowerCase()}`,
				health: '[OK]',
			}));
		}

		async isModelAvailable(name: string) {
			const normalized = String(name || '').toLowerCase();
			return this.availableModels.some((m) => {
				const lm = String(m).toLowerCase();
				return (
					lm.includes(normalized) ||
					normalized.includes(lm) ||
					lm.startsWith(normalized) ||
					normalized.startsWith(lm)
				);
			});
		}

		async getModelInfo(name?: string) {
			const target = name || this.modelName;
			const found = this.availableModels.find(
				(m) =>
					m.toLowerCase().includes(String(target).toLowerCase()) ||
					String(target).toLowerCase().includes(m.toLowerCase()),
			);
			return {
				name: found ?? String(target),
				id: `${String(found ?? target)
					.replace(/\s+/g, '-')
					.toLowerCase()}-1`,
				size: found?.toLowerCase().includes('phi') ? 'mini' : '4bit',
				modified: new Date().toISOString(),
				path: `/models/${String(found ?? target)
					.replace(/\s+/g, '-')
					.toLowerCase()}`,
				health: '[OK]',
			};
		}

		async generate({ prompt }: { prompt: string }) {
			const p = String(prompt || '');
			// If this adapter was configured with a model not present in the availableModels list, fail
			const normalizedModel = String(this.modelName || '').toLowerCase();
			const known = this.availableModels.some((m) => {
				const lm = String(m).toLowerCase();
				return (
					lm.includes(normalizedModel) ||
					normalizedModel.includes(lm) ||
					lm.startsWith(normalizedModel) ||
					normalizedModel.startsWith(lm)
				);
			});
			// Fail fast in tests when the configured model is not available — some tests assert error flows
			if (!known) {
				throw new Error('MLX model unavailable');
			}

			// Deterministic simple-answer handling for arithmetic tests
			if (/2\s*\+\s*2|what is 2\s*\+\s*2\??/i.test(p)) return '4';
			if (/what is 3\s*\+\s*3|3\s*\+\s*3/i.test(p)) return '6';

			// Simulate explicit prompt-induced failure
			if (/ERROR|FAIL/i.test(p)) {
				throw new Error('MLX model unavailable');
			}

			// Default mock generation includes the prompt for traceability
			return `mock-mlx-generation:${p.slice(0, 200)}`;
		}
	}

	const AVAILABLE_MLX_MODELS = {
		QWEN_SMALL: 'Qwen2.5-0.5B-Instruct-4bit', // valid, no change
		PHI_MINI: 'Phi-3-mini-4k-instruct-4bit',
	} as const;

	const createMLXAdapter = (
		model: string | undefined,
		_opts?: Record<string, unknown>,
	) =>
		new MockMLXAdapter({ modelName: model ?? AVAILABLE_MLX_MODELS.QWEN_SMALL });

	return {
		AVAILABLE_MLX_MODELS,
		MLXAdapter: MockMLXAdapter,
		createMLXAdapter,
	};
});

// Embedding adapter mock: deterministic vectors for any input and simple similarity search
vi.mock('../embedding-adapter.js', () => {
	class MockEmbeddingAdapter {
		private dims = 1024;
		private provider = 'mock-local';
		private docs: Array<{
			id: string;
			text: string;
			vector: number[];
			metadata?: Record<string, unknown>;
		}> = [];

		// no explicit constructor required

		getStats() {
			return {
				provider: this.provider,
				dimensions: this.dims,
				totalDocuments: this.docs.length,
			};
		}

		async generateEmbeddings(input: string | string[]) {
			const inputs = Array.isArray(input) ? input : [input];
			// Produce normalized unit vectors so cosine similarity behaves predictably
			return inputs.map((t) => {
				const seed = Array.from(String(t)).reduce(
					(s, ch) => s + ch.charCodeAt(0),
					0,
				);
				const raw = new Array(this.dims)
					.fill(0)
					.map((_, i) => ((seed + i) % 100) / 100);
				// normalize to unit length
				const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0)) || 1;
				return raw.map((v) => v / norm);
			});
		}

		// Accept same signature as production adapter: addDocuments(documents: string[], metadata?, ids?)
		async addDocuments(
			documents: string[],
			metadata?: Record<string, unknown>[],
			ids?: string[],
		) {
			const assignedIds: string[] = [];
			for (let i = 0; i < documents.length; i++) {
				const text = documents[i];
				const id = ids?.[i] || `doc-${this.docs.length + 1}`;
				const vector = (await this.generateEmbeddings(text))[0];
				const meta = metadata?.[i];
				this.docs.push({ id, text, vector, metadata: meta });
				assignedIds.push(id);
			}
			return assignedIds;
		}

		// helper used in tests: seed default docs for deterministic RAG results
		async seedDefaultDocs() {
			if (this.docs.length > 0) return;
			// Seed with domain-focused documents. Place clear programming docs first so
			// similarity scoring naturally ranks them higher for programming queries.
			await this.addDocuments(
				[
					'Python programming: how to write functions and use lists',
					'JavaScript programming: async/await, promises, and event loop',
					'Machine learning overview: supervised and unsupervised learning',
					'History: The Eiffel Tower is located in Paris and was built in 1889',
				],
				[
					{ source: 'seed' },
					{ source: 'seed' },
					{ source: 'seed' },
					{ source: 'seed' },
				],
			);
		}

		// Accept `{ text, topK, threshold }` to match callers in ai-capabilities.ts
		async similaritySearch({
			text,
			topK = 5,
			threshold = -1,
		}: {
			text: string;
			topK?: number;
			threshold?: number;
		}) {
			const qvec = (await this.generateEmbeddings(text))[0];
			// cosine similarity since vectors are normalized => dot product
			const scored = this.docs.map((d) => {
				// base cosine (dot) product
				let score = d.vector.reduce((s, v, i) => s + v * (qvec[i] ?? 0), 0);
				// increase base similarity scale so semantically-related docs surface reliably in tests
				score = score * 0.6;
				// Keyword overlap and domain-signal boost
				const qwords = new Set(
					String(text).toLowerCase().split(/\W+/).filter(Boolean),
				);
				const dwords = new Set(
					String(d.text).toLowerCase().split(/\W+/).filter(Boolean),
				);
				let overlap = 0;
				for (const w of Array.from(qwords)) {
					if (dwords.has(w)) overlap++;
				}
				// normalize overlap by average word count
				const avgWords = (qwords.size + dwords.size) / 2 || 1;
				// stronger boost when overlap exists
				let overlapBoost =
					qwords.size > 0 && overlap > 0 ? (overlap / avgWords) * 1.5 : 0;
				// Additional explicit domain heuristic: if query contains programming keywords,
				// heavily favor docs mentioning 'python', 'javascript', 'programming', 'code', etc.
				const programmingKeywords = [
					'python',
					'javascript',
					'programming',
					'code',
					'developer',
					'function',
					'async',
					'await',
					'promises',
				];
				const qLower = String(text).toLowerCase();
				const queryHasProgramming = programmingKeywords.some((k) =>
					qLower.includes(k),
				);
				if (queryHasProgramming) {
					for (const pk of programmingKeywords) {
						if (dwords.has(pk)) {
							// give a substantial bump to programming docs when the query is programming-related
							overlapBoost += 0.75;
						}
					}
				}
				score += overlapBoost;
				return {
					id: d.id,
					text: d.text,
					similarity: Number(score),
					metadata: d.metadata,
				};
			});
			scored.sort((a, b) => b.similarity - a.similarity);
			const filtered = scored.filter((s) => s.similarity >= threshold);
			return filtered
				.slice(0, topK)
				.map((s) => ({
					id: s.id,
					text: s.text,
					similarity: s.similarity,
					metadata: s.metadata,
				}));
		}

		async clearDocuments() {
			this.docs = [];
			return true;
		}

		async shutdown() {
			// noop
		}
	}

	const createEmbeddingAdapter = (_provider: string) =>
		new MockEmbeddingAdapter();

	// Export EmbeddingAdapter symbol expected by some tests
	return {
		createEmbeddingAdapter,
		MockEmbeddingAdapter,
		EmbeddingAdapter: MockEmbeddingAdapter,
	};
});
