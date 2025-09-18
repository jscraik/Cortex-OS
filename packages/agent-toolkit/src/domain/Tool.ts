import type { AgentToolkitInput, AgentToolkitResult } from '@cortex-os/contracts';

/**
 * Abstract base class for all agent toolkit tools
 */
export abstract class Tool {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly operation: string;

	/**
	 * Execute the tool with given inputs
	 */
	abstract execute(
		input: AgentToolkitInput,
		context?: ToolExecutionContext,
	): Promise<AgentToolkitResult>;

	/**
	 * Validate input before execution
	 */
	abstract validateInput(input: unknown): AgentToolkitInput;

	/**
	 * Get tool metadata for MCP registration
	 */
	getMcpToolDefinition(): McpToolDefinition {
		return {
			name: this.name,
			description: this.description,
			inputSchema: this.getInputSchema(),
		};
	}

	protected abstract getInputSchema(): Record<string, unknown>;
}

/**
 * Context provided to tool execution
 */
export interface ToolExecutionContext {
	requestedBy: string;
	sessionId?: string;
	traceparent?: string;
	correlationId?: string;
	timeout?: number;
}

/**
 * MCP tool definition interface
 */
export interface McpToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

/**
 * Tool registry interface for managing available tools
 */
export interface ToolRegistry {
	registerTool(tool: Tool): void;
	getTool(name: string): Tool | undefined;
	getAllTools(): Tool[];
	getToolNames(): string[];
}

/**
 * Event emitter interface for tool execution events
 */
export interface ToolEventEmitter {
	emitExecutionStarted(event: {
		toolId: string;
		toolName: string;
		operation: string;
		inputs: Record<string, unknown>;
		requestedBy: string;
		sessionId?: string;
	}): Promise<void>;

	emitExecutionCompleted(event: {
		toolId: string;
		toolName: string;
		operation: string;
		inputs: Record<string, unknown>;
		results: unknown;
		duration: number;
		requestedBy: string;
		sessionId?: string;
		success: boolean;
		error?: string;
	}): Promise<void>;

	emitExecutionFailed(event: {
		toolId: string;
		toolName: string;
		operation: string;
		inputs: Record<string, unknown>;
		error: string;
		duration: number;
		requestedBy: string;
		sessionId?: string;
	}): Promise<void>;
}
