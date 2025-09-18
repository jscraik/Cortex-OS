import type { AgentToolkitInput, AgentToolkitResult } from '@cortex-os/contracts';

/**
 * Core abstraction for executing agent toolkit tools
 */
export interface ToolExecutor {
	/**
	 * Execute a tool with given inputs
	 */
	execute(toolName: string, inputs: AgentToolkitInput): Promise<AgentToolkitResult>;

	/**
	 * Check if a tool is available
	 */
	isAvailable(toolName: string): Promise<boolean>;

	/**
	 * Get list of available tools
	 */
	getAvailableTools(): Promise<string[]>;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
	toolId: string;
	requestedBy: string;
	sessionId?: string;
	timeout?: number;
}

/**
 * Tool execution events for monitoring and debugging
 */
export interface ToolExecutionEvents {
	onStart: (context: ToolExecutionContext, inputs: AgentToolkitInput) => void;
	onComplete: (context: ToolExecutionContext, result: AgentToolkitResult, duration: number) => void;
	onError: (context: ToolExecutionContext, error: Error, duration: number) => void;
}
