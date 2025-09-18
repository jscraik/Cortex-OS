/**
 * @file_path packages/model-gateway/src/adapters/frontier-adapter.ts
 * Minimal Frontier adapter for the model gateway.
 * Provides stubbed implementations used in tests until
 * real Frontier API integration is available.
 */

import type { Message } from './types.js';

export interface FrontierAdapterApi {
	isAvailable(model?: string): Promise<boolean>;
	listModels?(): Promise<string[]>; // optional for future parity with other adapters
	generateEmbedding(_text: string, model?: string): Promise<{ embedding: number[]; model: string }>;
	generateEmbeddings(
		texts: string[],
		model?: string,
	): Promise<{ embedding: number[]; model: string }[]>;
	generateChat(request: {
		messages: Message[];
		model?: string;
		temperature?: number;
		max_tokens?: number;
	}): Promise<{ content: string; model: string }>;
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
}

/**
 * Simple deterministic adapter used for local testing.
 */
export class FrontierAdapter implements FrontierAdapterApi {
	async isAvailable(): Promise<boolean> {
		return true;
	}

	async generateEmbedding(
		_text: string,
		model = 'frontier-embedding',
	): Promise<{ embedding: number[]; model: string }> {
		return {
			embedding: new Array(8).fill(0).map((_, i) => i),
			model,
		};
	}

	async generateEmbeddings(
		texts: string[],
		model?: string,
	): Promise<{ embedding: number[]; model: string }[]> {
		return Promise.all(texts.map((t) => this.generateEmbedding(t, model)));
	}

	async generateChat(request: {
		messages: Message[];
		model?: string;
		temperature?: number;
		max_tokens?: number;
	}): Promise<{ content: string; model: string }> {
		const content = request.messages.map((m) => m.content).join(' ');
		return { content, model: request.model || 'frontier-chat' };
	}

	async rerank(
		_query: string,
		documents: string[],
		model = 'frontier-rerank',
	): Promise<{ scores: number[]; model: string }> {
		// trivial scoring: reverse index
		const scores = documents.map((_, i) => documents.length - i);
		return { scores, model };
	}
}

export function createFrontierAdapter(): FrontierAdapterApi {
	return new FrontierAdapter();
}
