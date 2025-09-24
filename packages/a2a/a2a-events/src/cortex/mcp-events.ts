import { z } from 'zod';

/**
 * Cortex-OS MCP-related A2A event schemas for inter-package communication
 */

export const CORTEX_MCP_EVENT_SOURCE = 'urn:cortex:mcp';

// MCP Tool Execution Event
export const McpToolExecutionEventSchema = z.object({
	event_id: z.string().uuid(),
	event_type: z.literal('cortex.mcp.tool.execution'),
	source: z.literal('cortex-mcp'),
	timestamp: z.string().datetime(),

	// Event-specific data
	toolName: z.string(),
	executionId: z.string(),
	contextId: z.string().optional(),
	input: z.record(z.unknown()).optional(),
	startTime: z.string().datetime(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),

	// Metadata
	metadata: z.record(z.string()).optional(),
});

// MCP Tool Response Event
export const McpToolResponseEventSchema = z.object({
	event_id: z.string().uuid(),
	event_type: z.literal('cortex.mcp.tool.response'),
	source: z.literal('cortex-mcp'),
	timestamp: z.string().datetime(),

	// Event-specific data
	toolName: z.string(),
	executionId: z.string(),
	durationMs: z.number(),
	success: z.boolean(),
	output: z.unknown().optional(),
	error: z.string().optional(),
	isCached: z.boolean().default(false),

	// Metadata
	metadata: z.record(z.string()).optional(),
});

// MCP Context Created Event
export const McpContextCreatedEventSchema = z.object({
	event_id: z.string().uuid(),
	event_type: z.literal('cortex.mcp.context.created'),
	source: z.literal('cortex-mcp'),
	timestamp: z.string().datetime(),

	// Event-specific data
	contextId: z.string(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	capabilities: z.array(z.string()),
	tools: z.array(z.string()),
	createdAt: z.string().datetime(),

	// Metadata
	metadata: z.record(z.string()).optional(),
});

// MCP Error Event
export const McpErrorEventSchema = z.object({
	event_id: z.string().uuid(),
	event_type: z.literal('cortex.mcp.error'),
	source: z.literal('cortex-mcp'),
	timestamp: z.string().datetime(),

	// Event-specific data
	errorType: z.string(),
	errorMessage: z.string(),
	errorCode: z.string().optional(),
	contextId: z.string().optional(),
	toolName: z.string().optional(),
	stackTrace: z.string().optional(),
	severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),

	// Metadata
	metadata: z.record(z.string()).optional(),
});

// Export event type definitions
export type McpToolExecutionEvent = z.infer<typeof McpToolExecutionEventSchema>;
export type McpToolResponseEvent = z.infer<typeof McpToolResponseEventSchema>;
export type McpContextCreatedEvent = z.infer<typeof McpContextCreatedEventSchema>;
export type McpErrorEvent = z.infer<typeof McpErrorEventSchema>;

// Validation Functions
export function validateMcpToolExecutionEvent(data: unknown): McpToolExecutionEvent {
	return McpToolExecutionEventSchema.parse(data);
}

export function isMcpToolExecutionEvent(data: unknown): data is McpToolExecutionEvent {
	return McpToolExecutionEventSchema.safeParse(data).success;
}

export function validateMcpToolResponseEvent(data: unknown): McpToolResponseEvent {
	return McpToolResponseEventSchema.parse(data);
}

export function isMcpToolResponseEvent(data: unknown): data is McpToolResponseEvent {
	return McpToolResponseEventSchema.safeParse(data).success;
}

export function validateMcpContextCreatedEvent(data: unknown): McpContextCreatedEvent {
	return McpContextCreatedEventSchema.parse(data);
}

export function isMcpContextCreatedEvent(data: unknown): data is McpContextCreatedEvent {
	return McpContextCreatedEventSchema.safeParse(data).success;
}

export function validateMcpErrorEvent(data: unknown): McpErrorEvent {
	return McpErrorEventSchema.parse(data);
}

export function isMcpErrorEvent(data: unknown): data is McpErrorEvent {
	return McpErrorEventSchema.safeParse(data).success;
}

// Helper object to create MCP events
export const createMcpEvent = {
	toolExecution: (
		data: Omit<McpToolExecutionEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>,
	) => ({
		event_id: crypto.randomUUID(),
		event_type: 'cortex.mcp.tool.execution' as const,
		source: 'cortex-mcp' as const,
		timestamp: new Date().toISOString(),
		...data,
	}),
	toolResponse: (
		data: Omit<McpToolResponseEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>,
	) => ({
		event_id: crypto.randomUUID(),
		event_type: 'cortex.mcp.tool.response' as const,
		source: 'cortex-mcp' as const,
		timestamp: new Date().toISOString(),
		...data,
	}),
	contextCreated: (
		data: Omit<McpContextCreatedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>,
	) => ({
		event_id: crypto.randomUUID(),
		event_type: 'cortex.mcp.context.created' as const,
		source: 'cortex-mcp' as const,
		timestamp: new Date().toISOString(),
		...data,
	}),
	error: (data: Omit<McpErrorEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
		event_id: crypto.randomUUID(),
		event_type: 'cortex.mcp.error' as const,
		source: 'cortex-mcp' as const,
		timestamp: new Date().toISOString(),
		...data,
	}),
};
