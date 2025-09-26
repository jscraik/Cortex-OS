export interface MLXChatMessage {
	role: string;
	content: string;
}

export interface MLXChatResponse {
	content: string;
	model: string;
}

export interface MLXAdapterApi {
	isAvailable(): Promise<boolean>;
	generateChat(args: { messages: MLXChatMessage[] }): Promise<MLXChatResponse>;
}

export interface OllamaAdapterApi {
	generateChat(messages: MLXChatMessage[], modelHint: string): Promise<MLXChatResponse>;
}

type AdapterState = {
	mlx: {
		isAvailable: () => Promise<boolean>;
		generateChat: (args: { messages: MLXChatMessage[] }) => Promise<MLXChatResponse>;
	};
	ollama: {
		generateChat: (
			messages: MLXChatMessage[],
			modelHint: string,
		) => Promise<MLXChatResponse>;
	};
};

const DEFAULT_STATE: AdapterState = {
	mlx: {
		isAvailable: async () => false,
		generateChat: async () => ({
			content: 'mlx stub response',
			model: 'mlx-mock',
		}),
	},
	ollama: {
		generateChat: async (_messages, modelHint) => ({
			content: 'analysis complete',
			model: modelHint || 'ollama-mock',
		}),
	},
};

const state: AdapterState = {
	mlx: {
		...DEFAULT_STATE.mlx,
	},
	ollama: {
		...DEFAULT_STATE.ollama,
	},
};

export function createMLXAdapter(): MLXAdapterApi {
	return {
		isAvailable: (...args) => state.mlx.isAvailable(...args),
		generateChat: (...args) => state.mlx.generateChat(...args),
	};
}

export function createOllamaAdapter(): OllamaAdapterApi {
	return {
		generateChat: (...args) => state.ollama.generateChat(...args),
	};
}

export function __setModelGatewayMocks(overrides: Partial<AdapterState>): void {
	if (overrides.mlx) {
		if (overrides.mlx.isAvailable) state.mlx.isAvailable = overrides.mlx.isAvailable;
		if (overrides.mlx.generateChat) state.mlx.generateChat = overrides.mlx.generateChat;
	}
	if (overrides.ollama) {
		if (overrides.ollama.generateChat) state.ollama.generateChat = overrides.ollama.generateChat;
	}
}

export function __resetModelGatewayMocks(): void {
	state.mlx.isAvailable = DEFAULT_STATE.mlx.isAvailable;
	state.mlx.generateChat = DEFAULT_STATE.mlx.generateChat;
	state.ollama.generateChat = DEFAULT_STATE.ollama.generateChat;
}
