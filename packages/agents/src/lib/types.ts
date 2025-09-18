/**
 * Core type definitions for the agents package
 */

import { EventEmitter } from 'events';

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
	policy?: {
		pii?: boolean;
		scope?: 'session' | 'user' | 'org';
		requiresConsent?: boolean;
	};
	embeddingModel?: string;
	metadata?: Record<string, unknown>;
}

export interface MemoryStore {
	upsert(m: Memory, namespace?: string): Promise<Memory>;
	get(id: string, namespace?: string): Promise<Memory | null>;
	delete(id: string, namespace?: string): Promise<void>;
	searchByText(
		q: { text: string; topK: number; filterTags?: string[] },
		namespace?: string,
	): Promise<Memory[]>;
	searchByVector(
		q: { vector: number[]; topK: number; filterTags?: string[] },
		namespace?: string,
	): Promise<Memory[]>;
	purgeExpired(nowISO: string, namespace?: string): Promise<number>;
}

export interface GenerateOptions {
	model?: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	stop?: string[];
	stream?: boolean;
	[key: string]: any;
}

export interface GenerateResult {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	model?: string;
	finishReason?: string;
	[key: string]: any;
}

export interface ModelProvider {
	name: string;
	generate: (prompt: string, options?: GenerateOptions) => Promise<GenerateResult>;
	isAvailable?: () => Promise<boolean>;
	shutdown?: () => Promise<void>;
}

export interface Tool {
	name: string;
	description: string;
	schema: any;
	execute: (input: any) => Promise<any>;
}

export interface AgentMessage {
	id: string;
	type: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

export interface AgentConfig {
	name: string;
	type: string;
	capabilities: string[];
	modelProvider: string;
	model?: string;
	tools?: ToolConfig[];
	memoryConfig?: MemoryConfig;
	toolConfig?: ToolConfig;
	systemPrompt?: string;
	mcpEndpoint?: string;
	streamingMode?: 'updates' | 'values';
	eventBus?: EventEmitter;
}

export interface MemoryConfig {
	workingMemorySize: number;
	contextualMemorySize: number;
	episodicMemorySize: number;
	retentionPolicy: 'lru' | 'ttl' | 'importance';
}

export interface ToolConfig {
	enableA2A: boolean;
	enableMCP: boolean;
	enableSystemTools: boolean;
	customTools?: string[];
}

export interface AgentMetrics {
	messagesProcessed: number;
	totalTokensUsed: number;
	averageResponseTime: number;
	errorRate: number;
	lastUpdated: string;
}
