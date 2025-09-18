/**
 * Model provider types for the agents package
 */

export interface GenerateOptions {
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	stop?: string[];
	tools?: any[];
	toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface GenerateResult {
	content: string;
	finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	toolCalls?: Array<{
		id: string;
		type: 'function';
		function: {
			name: string;
			arguments: string;
		};
	}>;
}

export interface ModelProvider {
	name: string;
	generate: (prompt: string, options?: GenerateOptions) => Promise<GenerateResult>;
	isAvailable?: () => Promise<boolean>;
	shutdown?: () => Promise<void>;
}
