/**
 * Core type definitions for the agents package
 */

import { z } from 'zod';

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
	): Promise<(Memory & { score: number })[]>;
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
	[key: string]: unknown;
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
	[key: string]: unknown;
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
	schema: unknown;
	execute: (input: unknown) => Promise<unknown>;
}

export interface AgentMessage {
	id: string;
	type: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface AgentConfig {
	name: string;
	type: string;
	capabilities: string[];
	modelProvider: string;
	model?: string;
	// Additional missing properties for enhanced functionality
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
	retryAttempts?: number;
	securityLevel?: 'low' | 'medium' | 'high';
	enableLogging?: boolean;
	streamingMode?: 'updates' | 'values';
	toolConfig?: ToolConfig;
	memoryConfig?: MemoryConfig;
	systemPromptId?: string;
	mcpEndpoint?: string;
	// Add tools property that was missing
	tools?: Tool[] | string[];
}

// Missing Subagent types
export interface SubagentConfig {
	name: string;
	capabilities: string[];
	path: string;
	description: string;
	maxConcurrency: number;
	timeout: number;
	systemPromptId: string;
	systemPrompt?: string;
	scope: 'user' | 'project';
	model?: string;
	tools?: string[];
	maxTokens?: number;
	temperature?: number;
}

export interface SubagentRunInput {
	task: string;
	context?: Record<string, unknown>;
	config?: Partial<SubagentConfig>;
}

export interface SubagentRunResult {
	success: boolean;
	result?: unknown;
	error?: string;
	metrics?: AgentMetrics;
	logs?: string[];
}

// Zod schema for SubagentRunResult
export const SubagentRunResultSchema = z.object({
	success: z.boolean(),
	result: z.unknown().optional(),
	error: z.string().optional(),
	metrics: z
		.object({
			messagesProcessed: z.number(),
			totalTokensUsed: z.number(),
			averageResponseTime: z.number(),
			errorRate: z.number(),
			lastUpdated: z.string(),
		})
		.optional(),
	logs: z.array(z.string()).optional(),
});

// Additional missing interfaces for agents
export interface ToolConfig {
	enableA2A: boolean;
	enableMCP: boolean;
	enableSystemTools: boolean;
	customTools?: string[];
	timeout?: number;
	retryAttempts?: number;
}

export interface MemoryConfig {
	workingMemorySize: number;
	contextualMemorySize: number;
	episodicMemorySize: number;
	retentionPolicy: 'lru' | 'ttl' | 'importance';
	persistenceEnabled?: boolean;
	compressionEnabled?: boolean;
}

export interface AgentMetrics {
	messagesProcessed: number;
	totalTokensUsed: number;
	averageResponseTime: number;
	errorRate: number;
	lastUpdated: string;
}

// Interface for subagents that need metrics
export interface Subagent {
	name: string;
	config: SubagentConfig;
	run: (input: SubagentRunInput) => Promise<SubagentRunResult>;
	getMetrics?: () => AgentMetrics;
}
