/**
 * Shared adapter interfaces for Model Gateway
 * These interfaces provide canonical, typed method shapes for adapters.
 */

export type Embedding = { embedding: number[]; model: string; vector?: number[] };
export type ChatResponse = { content: string; model: string };

export type Message = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export interface MLXAdapterApi {
	isAvailable(): Promise<boolean>;
	generateEmbedding(request: { text: string; model?: string }): Promise<Embedding>;
	generateEmbeddings(request: { texts: string[]; model?: string }): Promise<Embedding[]>;
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
	listModels?(): Promise<string[]>;
}

export interface OllamaAdapterApi {
	isAvailable(model?: string): Promise<boolean>;
	listModels(): Promise<string[]>;
	generateEmbedding(text: string, model?: string): Promise<Embedding>;
	generateEmbeddings(texts: string[], model?: string): Promise<Embedding[]>;
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
	rerank?(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
}

export type AdapterEmbeddingResponse = Embedding | Embedding[];
