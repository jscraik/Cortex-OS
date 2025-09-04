export interface Envelope<T = unknown> {
        type: string;
        data: T;
        id: string;
        timestamp: string;
        source: string;
}

export interface Agent<TInput = unknown, TOutput = unknown> {
	id: string;
	name: string;
	capabilities: AgentCapability[];
	execute: (context: ExecutionContext<TInput>) => Promise<GenerateResult<TOutput>>;
}

export interface AgentCapability {
        name: string;
        description: string;
        parameters?: Record<string, unknown>;
}

export interface AgentDependencies {
	eventBus: EventBus;
	modelProvider: ModelProvider;
	mcpClient?: MCPClient;
}

export interface EventBusStats {
        totalEventsPublished: number;
        eventsByType: Record<string, number>;
}

export interface EventBus {
        publish: <T = unknown>(msg: Envelope<T>) => Promise<void>;
        subscribe: <T = unknown>(
                type: string,
                handler: (msg: Envelope<T>) => void,
        ) => EventSubscription;
        getStats: () => EventBusStats;
        shutdown: () => void;
}

export interface EventSubscription {
        unsubscribe: () => void;
}

export interface ExecutionContext<TInput = unknown> {
	userId?: string;
	sessionId?: string;
	traceId?: string;
	input: TInput;
        metadata?: Record<string, unknown>;
}

export interface GenerateOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stop?: string[];
	stream?: boolean;
        responseFormat?: {
                type: 'json' | 'text';
                schema?: unknown;
        };
	systemPrompt?: string;
	seed?: number;
}

export interface GenerateResult<TOutput = unknown> {
	content: string;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
        metadata?: Record<string, unknown>;
	data?: TOutput;
}

export interface MCPClient {
        call: (method: string, params?: unknown) => Promise<unknown>;
        callTool: (name: string, params?: unknown) => Promise<unknown>;
        listResources: () => Promise<unknown[]>;
        listTools: () => Promise<unknown[]>;
        readResource: (uri: string) => Promise<unknown>;
}

export interface MCPServerInfo {
        name: string;
        version: string;
        capabilities?: Record<string, unknown>;
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
        constructor(message: string, public code?: string, public details?: unknown) {
                super(message);
                this.name = 'AgentError';
        }
}

export class ProviderError extends Error {
        constructor(message: string, public provider?: string, public details?: unknown) {
                super(message);
                this.name = 'ProviderError';
        }
}

export class ValidationError extends Error {
        constructor(message: string, public field?: string, public value?: unknown) {
                super(message);
                this.name = 'ValidationError';
        }
}

export interface MemoryStore {
        store: (key: string, value: unknown, options?: unknown) => Promise<void>;
        retrieve: (key: string) => Promise<unknown>;
        delete: (key: string) => Promise<void>;
        list: (prefix?: string) => Promise<string[]>;
}
