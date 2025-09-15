import { AVAILABLE_MLX_MODELS, type MLXAdapter } from './mlx-adapter.js';
interface OllamaAdapter {
	generate(options: {
		prompt: string;
		temperature?: number;
		maxTokens?: number;
		model?: string;
	}): Promise<{
		text: string;
	}>;
}
export interface LLMConfig {
	provider: 'mlx' | 'ollama';
	endpoint?: string;
	model?: string;
	mlxModel?: keyof typeof AVAILABLE_MLX_MODELS;
	knifePath?: string;
}
export interface LLMGenerateOptions {
	prompt?: string;
	temperature?: number;
	maxTokens?: number;
}
export interface LLMState {
	config: LLMConfig;
	ollamaAdapter?: OllamaAdapter;
	mlxAdapter?: MLXAdapter;
}
export declare function configureLLM(config: LLMConfig): LLMState;
export declare function getProvider(state: LLMState): string;
export declare function getModel(state: LLMState): string;
export declare function getMLXAdapter(state: LLMState): MLXAdapter | undefined;
export declare function listMLXModels(
	state: LLMState,
): Promise<import('./mlx-adapter.js').MLXModelInfo[]>;
export declare function checkProviderHealth(state: LLMState): Promise<{
	healthy: boolean;
	message: string;
}>;
export declare function generate(
	state: LLMState,
	prompt: string,
	options?: LLMGenerateOptions,
): Promise<string>;
export declare function shutdown(state: LLMState): Promise<void>;
export declare class LLMBridge {
	private readonly state;
	constructor(config: LLMConfig);
	getProvider(): string;
	getModel(): string;
	generate(prompt: string, options?: LLMGenerateOptions): Promise<string>;
	listModels(): Promise<import('./mlx-adapter.js').MLXModelInfo[]>;
	checkHealth(): Promise<{
		healthy: boolean;
		message: string;
	}>;
	shutdown(): Promise<void>;
}
//# sourceMappingURL=llm-bridge.d.ts.map
