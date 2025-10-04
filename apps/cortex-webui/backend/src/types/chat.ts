// Chat-related types for Cortex WebUI backend
// brAInwav production standards

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	createdAt: string;
	tokenCount?: number;
	modelId?: string;
	metadata?: Record<string, unknown>;
}

export interface ChatSession {
	id: string;
	modelId: string | null;
	messages: ChatMessage[];
	createdAt: string;
	updatedAt: string;
	title?: string;
	userId?: string;
	metadata?: Record<string, unknown>;
}

export interface ChatRequest {
	messages: ChatMessage[];
	model?: string;
	stream?: boolean;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
}

export interface ChatResponse {
	id: string;
	choices: ChatChoice[];
	created: number;
	model: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

export interface ChatChoice {
	index: number;
	message: ChatMessage;
	finishReason?: 'stop' | 'length' | 'content_filter';
}

export interface StreamChunk {
	id: string;
	choices: StreamChoice[];
	created: number;
	model: string;
}

export interface StreamChoice {
	index: number;
	delta: {
		role?: string;
		content?: string;
	};
	finishReason?: 'stop' | 'length' | 'content_filter';
}