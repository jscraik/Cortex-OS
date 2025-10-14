export interface GenerationConfig {
	model: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	stream?: boolean;
	provider?: 'mlx' | 'ollama';
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface GenerationResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	provider: 'mlx' | 'ollama';
}

export interface Generator {
	generate(prompt: string, config?: Partial<GenerationConfig>): Promise<GenerationResponse>;
	chat(messages: ChatMessage[], config?: Partial<GenerationConfig>): Promise<GenerationResponse>;
	close?(): Promise<void>;
}

// REF‑RAG generation interfaces
export interface TriBandGenerationConfig extends GenerationConfig {
	/** Band A context (full text) */
	bandA?: string;
	/** Band B context (virtual tokens) */
	bandB?: Float32Array;
	/** Band C context (structured facts) */
	bandC?: Array<{
		type: string;
		value: string | number | boolean;
		context: string;
		confidence: number;
	}>;
	/** Enable structured output mode */
	enableStructuredOutput?: boolean;
	/** Virtual token handling mode */
	virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
}

export interface TriBandGenerationResponse extends GenerationResponse {
	/** Band usage statistics */
	bandUsage?: {
		bandAChars: number;
		bandBVirtualTokens: number;
		bandCFacts: number;
	};
	/** Context pack metadata */
	contextMetadata?: {
		riskClass: string;
		totalChunks: number;
		expansionRatio: number;
	};
}

export * from './multi-model.js';
