export interface Envelope {
	type: string;
	data: any;
	id: string;
	timestamp: string;
	source: string;
}

export interface Agent<TInput = any, TOutput = any> {
	id: string;
	name: string;
	capabilities: AgentCapability[];
	execute: (context: ExecutionContext<TInput>) => Promise<GenerateResult<TOutput>>;
}

export interface AgentCapability {
	name: string;
	description: string;
	parameters?: Record<string, any>;
}

export interface AgentDependencies {
	eventBus: EventBus;
	modelProvider: ModelProvider;
	mcpClient?: MCPClient;
}

export interface EventBus {
	publish: (msg: Envelope) => Promise<void>;
	bind: (handlers: Array<{ type: string; handle: (msg: Envelope) => Promise<void> }>) => Promise<void>;
}

export interface EventSubscription {
	unsubscribe: () => Promise<void>;
}

export interface ExecutionContext<TInput = any> {
	userId?: string;
	sessionId?: string;
	traceId?: string;
	input: TInput;
	metadata?: Record<string, any>;
}

export interface GenerateOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stop?: string[];
	stream?: boolean;
	responseFormat?: {
		type: 'json' | 'text';
		schema?: any;
	};
	systemPrompt?: string;
	seed?: number;
}

export interface GenerateResult<TOutput = any> {
	content: string;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	metadata?: Record<string, any>;
	data?: TOutput;
}

export interface MCPClient {
	call: (method: string, params?: any) => Promise<any>;
	callTool: (name: string, params?: any) => Promise<any>;
	listResources: () => Promise<any[]>;
	listTools: () => Promise<any[]>;
	readResource: (uri: string) => Promise<any>;
}

export interface MCPServerInfo {
	name: string;
	version: string;
	capabilities?: Record<string, any>;
}

export interface ModelProvider {
	name: string;
	generate: (prompt: string, options?: GenerateOptions) => Promise<GenerateResult>;
	isAvailable: () => Promise<boolean>;
	shutdown?: () => Promise<void>;
}

export interface ProviderChainConfig {
	providers: ModelProvider[];
	fallbackStrategy?: 'sequence' | 'parallel';
	retryAttempts?: number;
}

export interface MemoryPolicy {
	ttl?: number;
	maxSize?: number;
	evictionStrategy?: 'lru' | 'fifo' | 'random';
	namespace?: string;
	maxItemBytes?: number;
	redactPII?: boolean;
}

// Error classes
export class AgentError extends Error {
	constructor(message: string, public code?: string, public details?: any) {
		super(message);
		this.name = 'AgentError';
	}
}

export class ProviderError extends Error {
	constructor(message: string, public provider?: string, public details?: any) {
		super(message);
		this.name = 'ProviderError';
	}
}

export class ValidationError extends Error {
	constructor(message: string, public field?: string, public value?: any) {
		super(message);
		this.name = 'ValidationError';
	}
}

export interface MemoryStore {
	store: (key: string, value: any, options?: any) => Promise<void>;
	retrieve: (key: string) => Promise<any>;
	delete: (key: string) => Promise<void>;
	list: (prefix?: string) => Promise<string[]>;
}
