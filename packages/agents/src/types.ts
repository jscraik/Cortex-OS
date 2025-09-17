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
	content: unknown;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

/**
 * Tool registry interface for registering and managing tools
 */
export interface IToolRegistry {
	/**
	 * Register a new tool
	 */
	register(tool: unknown): void;

	/**
	 * Unregister a tool by ID
	 */
	unregister(toolId: string): boolean;

	/**
	 * Get a tool by ID
	 */
	get(toolId: string): unknown;

	/**
	 * List all registered tools
	 */
	list(): unknown[];

	/**
	 * Check if a tool is registered
	 */
	has(toolId: string): boolean;
}
