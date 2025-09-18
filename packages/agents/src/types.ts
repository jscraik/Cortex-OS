// Basic type definitions for Cortex-OS agents

import { EventEmitter } from 'events';

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
	execute: (input: Record<string, unknown>) => Promise<unknown>;
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
