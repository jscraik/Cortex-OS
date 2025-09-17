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

/**
 * Tool registry interface for registering and managing tools
 */
export interface IToolRegistry {
	/**
	 * Register a new tool
	 */
	register(tool: any): void;

	/**
	 * Unregister a tool by ID
	 */
	unregister(toolId: string): boolean;

	/**
	 * Get a tool by ID
	 */
	get(toolId: string): any | null;

	/**
	 * List all registered tools
	 */
	list(): any[];

	/**
	 * Check if a tool is registered
	 */
	has(toolId: string): boolean;
}
