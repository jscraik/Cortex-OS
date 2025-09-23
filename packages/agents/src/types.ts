// Basic type definitions for Cortex-OS agents

import type { EventEmitter } from 'node:events';
import type { z } from 'zod';

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
	// Additional missing properties
	maxTokens?: number;
	temperature?: number;
	timeout?: number;
	retryAttempts?: number;
	securityLevel?: 'low' | 'medium' | 'high';
	enableLogging?: boolean;
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

export interface AgentMessage {
	id: string;
	type: string | 'user' | 'assistant' | 'system';
	content: string | Record<string, unknown>;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

// Basic tool types for agents
export interface Tool<T = Record<string, unknown>> {
	name: string;
	description: string;
	schema: T;
	execute: (input: Record<string, unknown>) => Promise<ToolOutput>;
}

export interface ToolSchema {
	type: string;
	properties: Record<string, unknown>;
	required?: string[];
}

/**
 * Tool registry interface for registering and managing tools
 */
export interface IToolRegistry {
	/** Register a new tool */
	register<T extends ToolSchema>(tool: Tool<T>): void;

	/** Unregister a tool by ID */
	unregister(toolId: string): boolean;

	/** Get a tool by ID */
	get<T extends ToolSchema>(toolId: string): Tool<T> | null;

	/** List all registered tools */
	list<T extends ToolSchema>(): Tool<T>[];

	/** Check if a tool is registered */
	has(toolId: string): boolean;
}

// Agent-specific interfaces to replace 'any' types
export interface AgentInfo {
	id: string;
	name: string;
	specialization: string;
	capabilities: string[];
	status: 'online' | 'offline' | 'busy' | 'error';
	model: string;
}

export interface AgentListResponse {
	agents: AgentInfo[];
	totalAgents: number;
	onlineAgents: number;
	timestamp: string;
}

export interface AgentStatus {
	agentId: string;
	status: 'online' | 'offline' | 'busy' | 'error';
	activeTasks: number;
	completedTasks: number;
	averageResponseTime: number;
	lastActivity: string;
}

export interface SystemStatus {
	systemStatus: 'healthy' | 'degraded' | 'unhealthy';
	totalAgents: number;
	onlineAgents: number;
	activeTasks: number;
	completedTasks: number;
	averageResponseTime: number;
	systemUptime: number;
	timestamp: string;
}

export interface TaskDelegation {
	delegationId: string;
	task: string;
	targetAgent: string;
	urgency: 'low' | 'medium' | 'high';
	status: 'delegated' | 'in_progress' | 'completed' | 'failed';
	estimatedCompletion: string;
	timestamp: string;
}

// A2A Bus related types
export type EventHandler<T = unknown> = (data: T) => void;

export interface BusTransport {
	send(message: Record<string, unknown>): Promise<void>;
	receive(handler: EventHandler): void;
	close(): Promise<void>;
}

export interface SchemaRegistry {
	register(name: string, schema: z.ZodSchema): void;
	get(name: string): z.ZodSchema | undefined;
	validate(name: string, data: unknown): unknown;
}

export interface AccessControlList {
	canPublish(topic: string, userId: string): boolean;
	canSubscribe(topic: string, userId: string): boolean;
}

export interface BusOptions {
	retryAttempts?: number;
	timeout?: number;
	batchSize?: number;
	compressionEnabled?: boolean;
}

// Tool execution interfaces
export interface ToolInput {
	name: string;
	parameters: Record<string, unknown>;
	timeout?: number;
	validation?: boolean;
}

export interface ToolOutput {
	success: boolean;
	result?: unknown;
	error?: string;
	executionTime: number;
	timestamp: string;
}

export interface ToolExecutor<TInput = unknown, TOutput = unknown> {
	schema: z.ZodSchema<TInput>;
	execute: (input: TInput) => Promise<TOutput>;
	validate?: (input: unknown) => input is TInput;
	timeout?: number;
}

// LangGraph stream chunk types
export interface StreamChunk {
	type: 'message' | 'update' | 'error' | 'complete';
	data: unknown;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

// Security check types
export interface SecurityCheckResult {
	passed: boolean;
	risk: 'low' | 'medium' | 'high' | 'critical';
	vulnerabilities?: string[];
	recommendations?: string[];
}
