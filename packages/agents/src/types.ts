// Basic type definitions for Cortex-OS agents

export interface AgentConfig {
	name: string;
	type: string;
	capabilities: string[];
	modelProvider: string;
	memoryConfig?: MemoryConfig;
	toolConfig?: ToolConfig;
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
	type: string;
	content: any;
	timestamp: string;
	metadata?: Record<string, any>;
}
