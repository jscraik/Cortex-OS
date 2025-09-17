// Local minimal CloudEvents-style envelope used within agents package.
// (Decoupled from external a2a-contracts to avoid build-time dependency churn.)
export interface Envelope<T = unknown> {
	specversion: '1.0';
	id: string;
	type: string;
	source: string;
	time: string; // RFC3339
	ttlMs: number;
	headers: Record<string, string>;
	datacontenttype?: string;
	dataschema?: string;
	subject?: string;
	correlationId?: string;
	traceparent?: string;
	data?: T;
	baggage?: string;
}

export interface Agent<TInput = unknown, TOutput = unknown> {
	id: string;
	name: string;
	capabilities: AgentCapability[];
	// Convenience fields for tests and tooling
	capability?: string;
	inputSchema?: unknown;
	outputSchema?: unknown;
	// Accept either full execution context or direct input and return output shape
	execute: (context: ExecutionContext<TInput> | TInput) => Promise<TOutput>;
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
	publish: (msg: Envelope) => Promise<void>;
	subscribe: (
		type: string,
		handler: (msg: Envelope) => void,
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
	generate: (
		prompt: string,
		options?: GenerateOptions,
	) => Promise<GenerateResult>;
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
	constructor(
		message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'AgentError';
	}
}

export class ProviderError extends Error {
	constructor(
		message: string,
		public provider?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'ProviderError';
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string,
		public value?: unknown,
	) {
		super(message);
		this.name = 'ValidationError';
	}
}

// Minimal structural mirror of @cortex-os/memories types
export interface Memory {
	id: string;
	kind: 'note' | 'event' | 'artifact' | 'embedding';
	text?: string;
	vector?: number[];
	tags: string[];
	ttl?: string;
	createdAt: string;
	updatedAt: string;
	provenance: {
		source: 'user' | 'agent' | 'system';
		actor?: string;
		evidence?: { uri: string; range?: [number, number] }[];
		hash?: string;
	};
	policy?: { pii?: boolean; scope?: 'session' | 'user' | 'org' };
	embeddingModel?: string;
}

export interface VectorQuery {
	vector: number[];
	topK: number;
	filterTags?: string[];
	queryText?: string;
}

export interface TextQuery {
	text: string;
	topK: number;
	filterTags?: string[];
}

export interface MemoryStore {
	upsert(m: Memory, namespace?: string): Promise<Memory>;
	get(id: string, namespace?: string): Promise<Memory | null>;
	delete(id: string, namespace?: string): Promise<void>;
	searchByText(q: TextQuery, namespace?: string): Promise<Memory[]>;
	searchByVector(q: VectorQuery, namespace?: string): Promise<Memory[]>;
	purgeExpired(nowISO: string, namespace?: string): Promise<number>;
}
