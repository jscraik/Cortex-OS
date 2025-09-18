/**
 * Shared adapter interfaces for Model Gateway
 * These interfaces provide canonical, typed method shapes for adapters.
 */

export type Embedding = { embedding: number[]; model: string };
export type ChatResponse = { content: string; model: string };

export type Message = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export interface MLXAdapterInterface {
	isAvailable(): Promise<boolean>;

	// Canonical object-style APIs
	generateEmbedding(request: { text: string; model?: string }): Promise<Embedding>;
	generateEmbeddings(request: { texts: string[]; model?: string }): Promise<Embedding[]>;
	generateChat(request: {
		messages: Message[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<ChatResponse>;

	// Implementations that prefer positional calls may provide these helpers
	generateEmbeddingPositional?(text: string, model?: string): Promise<Embedding>;
	generateEmbeddingsPositional?(texts: string[], model?: string): Promise<Embedding[]>;
	generateChatPositional?(
		messages: Message[],
		model?: string,
		options?: { temperature?: number; max_tokens?: number },
	): Promise<ChatResponse>;

	listModels?(): Promise<string[]>;
}

export interface OllamaAdapterInterface {
	isAvailable(model?: string): Promise<boolean>;
	generateEmbedding(text: string, model?: string): Promise<Embedding>;
	generateEmbeddings(texts: string[], model?: string): Promise<Embedding[]>;
	generateChat(
		messages: Message[],
		model?: string,
		options?: { temperature?: number; max_tokens?: number },
	): Promise<ChatResponse>;
	rerank?(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
	listModels?(): Promise<string[]>;
}

export type AdapterEmbeddingResponse = Embedding | Embedding[];
