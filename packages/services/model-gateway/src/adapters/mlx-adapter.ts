/**
 * Lightweight MLX adapter stub for the model gateway.
 * Provides deterministic local implementations for embeddings, chat and rerank.
 */

import type { ChatResponse, Message } from './types.js';

export interface MLXAdapterApi {
	isAvailable(): Promise<boolean>;
	generateEmbedding(request: {
		text: string;
		model?: string;
	}): Promise<{ embedding: number[]; model: string }>;
	generateEmbeddings(request: {
		texts: string[];
		model?: string;
	}): Promise<{ embedding: number[]; model: string }[]>;
	generateChat(request: {
		messages: Message[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<ChatResponse>;
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
}

export function createMLXAdapter(): MLXAdapterApi {
	const defaultModel = process.env.MLX_DEFAULT_MODEL || 'mlx-default';
	// Local helper for embedding generation
	async function generateEmbedding({
		text,
		model,
	}: {
		text: string;
		model?: string;
	}) {
		const usedModel = model || defaultModel;
		const hash = Array.from(text).reduce(
			(h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
			0,
		);
		const vec = new Array(8)
			.fill(0)
			.map((_, i) => ((hash >> (i % 8)) & 0xff) / 255);
		return { embedding: vec, model: usedModel };
	}
	return {
		async isAvailable(): Promise<boolean> {
			return true;
		},
		// Local helper for embedding generation
		generateEmbedding,
		async generateEmbeddings({
			texts,
			model,
		}: {
			texts: string[];
			model?: string;
		}) {
			// Use the local method reference instead of 'this'
			return Promise.all(
				texts.map((t) =>
					// Call the local method directly
					// No 'as any' needed, type is correct
					(this as MLXAdapterApi).generateEmbedding({ text: t, model }),
				),
			);
		},
		async generateChat({
			messages,
			model,
		}: {
			messages: Message[];
			model?: string;
			max_tokens?: number;
			temperature?: number;
		}) {
			const usedModel = model || 'mlx-chat';
			const lastUser = [...messages].reverse().find((m) => m.role === 'user');
			const content = lastUser
				? lastUser.content.toUpperCase().slice(0, 64)
				: 'OK';
			return { content, model: usedModel };
		},
		async rerank(query: string, documents: string[], model?: string) {
			const q = query.toLowerCase();
			const scores = documents.map((d) => {
				const dl = d.toLowerCase();
				let s = 0;
				for (const token of q.split(/\s+/)) {
					if (token && dl.includes(token)) s += 1;
				}
				return s / Math.max(1, q.split(/\s+/).length);
			});
			return { scores, model: model || defaultModel };
		},
	};
}

export class MLXAdapter implements MLXAdapterApi {
	private readonly impl = createMLXAdapter();

	isAvailable(): Promise<boolean> {
		return this.impl.isAvailable();
	}
	generateEmbedding(request: {
		text: string;
		model?: string;
	}): Promise<{ embedding: number[]; model: string }> {
		return this.impl.generateEmbedding(request);
	}
	generateEmbeddings(request: {
		texts: string[];
		model?: string;
	}): Promise<{ embedding: number[]; model: string }[]> {
		return this.impl.generateEmbeddings(request);
	}
	generateChat(request: {
		messages: Message[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<ChatResponse> {
		return this.impl.generateChat(request);
	}
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }> {
		return this.impl.rerank(query, documents, model);
	}
}
