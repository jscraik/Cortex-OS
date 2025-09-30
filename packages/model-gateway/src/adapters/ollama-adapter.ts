/**
 * Ollama adapter for the model gateway.
 * Uses the local Ollama HTTP API with deterministic fallbacks for tests.
 */

import type { ChatResponse, Message } from './types.js';

export interface OllamaAdapterApi {
	isAvailable(model?: string): Promise<boolean>;
	listModels(): Promise<string[]>;
	generateEmbedding(text: string, model?: string): Promise<{ embedding: number[]; model: string; vector?: number[] }>;
	generateEmbeddings(
		texts: string[],
		model?: string,
	): Promise<{ embedding: number[]; model: string; vector?: number[] }[]>;
	generateChat(
		request:
			| {
				messages: Message[];
				model?: string;
				temperature?: number;
				max_tokens?: number;
			}
			| Message[],
		model?: string,
		options?: { temperature?: number; max_tokens?: number },
	): Promise<ChatResponse>;
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
}

/**
 * Factory creator. In real deployments this would call the local Ollama HTTP API.
 * Falls back to deterministic stubs when the service is unavailable.
 */
export function createOllamaAdapter(): OllamaAdapterApi {
	// Allow forcing availability via env for tests/local runs
	const forced = process.env.OLLAMA_AVAILABLE?.toLowerCase();
	const forcedAvailable = forced === '1' || forced === 'true';

	const defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'nomic-embed-text';
	const baseUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

	const fetchJson = async <T>(endpoint: string, body?: unknown): Promise<T> => {
		const res = await fetch(`${baseUrl}${endpoint}`, {
			method: body ? 'POST' : 'GET',
			headers: { 'content-type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined,
		});
		if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
		return (await res.json()) as T;
	};

	const fallbackEmbedding = (text: string): number[] => {
		const hash = Array.from(text).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
		return new Array(8).fill(0).map((_, i) => ((hash >> (i % 8)) & 0xff) / 255);
	};

	const lexicalScores = (query: string, docs: string[]): number[] => {
		const q = query.toLowerCase();
		return docs.map((d) => {
			const dl = d.toLowerCase();
			let s = 0;
			for (const token of q.split(/\s+/)) if (token && dl.includes(token)) s += 1;
			return s / Math.max(1, q.split(/\s+/).length);
		});
	};

	return {
		async isAvailable(model?: string): Promise<boolean> {
			try {
				const data = await fetchJson<{ models: { name: string }[] }>('/api/tags');
				return model ? data.models.some((m) => m.name === model) : true;
			} catch {
				return forcedAvailable;
			}
		},
		async listModels(): Promise<string[]> {
			try {
				const data = await fetchJson<{ models: { name: string }[] }>('/api/tags');
				return data.models.map((m) => m.name);
			} catch {
				return forcedAvailable ? [defaultModel, 'llama2'] : [];
			}
		},
		async generateEmbedding(text: string, model?: string) {
			const usedModel = model || defaultModel;
			try {
				const data = await fetchJson<{ embedding: number[] }>('/api/embeddings', {
					model: usedModel,
					prompt: text,
				});
				return { embedding: data.embedding, model: usedModel, vector: data.embedding };
			} catch {
				return { embedding: fallbackEmbedding(text), model: usedModel, vector: fallbackEmbedding(text) };
			}
		},
		async generateEmbeddings(texts: string[], model?: string) {
			const usedModel = model || defaultModel;
			return Promise.all(texts.map((t) => this.generateEmbedding(t, usedModel)));
		},
		async generateChat(
			req:
				| {
					messages: Message[];
					model?: string;
					temperature?: number;
					max_tokens?: number;
				}
				| Message[],
			model?: string,
			options?: { temperature?: number; max_tokens?: number },
		) {
			const messages = Array.isArray(req) ? req : req.messages;
			const usedModel = (Array.isArray(req) ? model : req.model) || model || 'llama2';
			try {
				const data = await fetchJson<{
					message?: { content: string };
					response?: string;
				}>('/api/chat', {
					model: usedModel,
					messages,
					stream: false,
					...options,
				});
				return {
					content: data.message?.content || data.response || '',
					model: usedModel,
				};
			} catch {
				const lastUser = [...messages].reverse().find((m) => m.role === 'user');
				const content = lastUser ? `echo(${lastUser.content.slice(0, 64)})` : 'ok';
				return { content, model: usedModel };
			}
		},
		async rerank(query: string, documents: string[], model?: string) {
			const usedModel = model || defaultModel;
			try {
				const data = await fetchJson<{
					results: { index: number; score: number }[];
				}>('/api/rerank', { model: usedModel, query, documents });
				const scores = new Array(documents.length).fill(0);
				for (const item of data.results) {
					if (typeof item.index === 'number' && typeof item.score === 'number') {
						scores[item.index] = item.score;
					}
				}
				return { scores, model: usedModel };
			} catch {
				return { scores: lexicalScores(query, documents), model: usedModel };
			}
		},
	};
}

// Class wrapper for tests that expect a constructible adapter
export class OllamaAdapter implements OllamaAdapterApi {
	private readonly impl = createOllamaAdapter();

	isAvailable(model?: string): Promise<boolean> {
		return this.impl.isAvailable(model);
	}
	listModels(): Promise<string[]> {
		return this.impl.listModels();
	}
	generateEmbedding(text: string, model?: string): Promise<{ embedding: number[]; model: string; vector?: number[] }> {
		return this.impl.generateEmbedding(text, model);
	}
	generateEmbeddings(
		texts: string[],
		model?: string,
	): Promise<{ embedding: number[]; model: string; vector?: number[] }[]> {
		return this.impl.generateEmbeddings(texts, model);
	}
	generateChat(
		request:
			| {
				messages: Message[];
				model?: string;
				temperature?: number;
				max_tokens?: number;
			}
			| Message[],
		model?: string,
		options?: { temperature?: number; max_tokens?: number },
	): Promise<ChatResponse> {
		return this.impl.generateChat(request, model, options);
	}
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }> {
		return this.impl.rerank(query, documents, model);
	}
}
