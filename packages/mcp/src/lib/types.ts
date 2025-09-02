export interface McpRequest {
	jsonrpc: "2.0";
	id: string | number;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: unknown;
}

export interface McpResponse {
	jsonrpc: "2.0";
	id: string | number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface Transport {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	send(
		message: McpRequest,
		onError?: (err: unknown, msg: McpRequest) => void,
	): Promise<void>;

	isConnected(): boolean;
	on?(event: string, listener: (...args: unknown[]) => void): void;
	emit?(event: string, ...args: unknown[]): boolean;
}

export interface StdioTransportConfig {
	type: "stdio";
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	timeoutMs?: number;
}

export interface HttpTransportConfig {
	type: "http";
	url: string;
	timeoutMs?: number;
	headers?: Record<string, string>;
}

export interface SSETransportConfig {
	type: "sse";
	url: string;
	timeoutMs?: number;
	retryDelayMs?: number;
	maxRetries?: number;
	heartbeatIntervalMs?: number;
	headers?: Record<string, string>;
	writeUrl?: string; // companion HTTP endpoint for sending JSON-RPC
}

export type TransportConfig =
	| StdioTransportConfig
	| HttpTransportConfig
	| SSETransportConfig;

export interface ToolDefinition {
	name: string;
	description?: string;
	inputSchema?: unknown;
}

export interface ResourceDefinition {
	uri: string;
	name?: string;
	description?: string;
	mimeType?: string;
}

export interface PromptDefinition {
	name: string;
	description?: string;
	arguments?: unknown[];
}

export interface McpConfigSchema {
	servers: Record<string, unknown>;
	mcpPath?: string;
	globalArguments?: string[];
}

export interface McpConfig {
	servers: Record<string, unknown>;
	mcpPath?: string;
	globalArguments?: string[];
}
