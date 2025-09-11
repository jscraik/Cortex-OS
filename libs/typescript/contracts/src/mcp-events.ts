import { z } from 'zod';

// Event type constants for MCP telemetry
export const McpEventTypes = {
	ToolCallBegin: 'mcp.tool.call.begin',
	ToolCallEnd: 'mcp.tool.call.end',
} as const;

export const McpToolCallBeginSchema = z.object({
	callId: z.string().min(1),
	name: z.string().min(1),
	// Arguments are redacted before emission; keep loose typing here
	arguments: z.unknown().optional(),
	timestamp: z.number().int().nonnegative(),
});

export type McpToolCallBegin = z.infer<typeof McpToolCallBeginSchema>;

export const McpToolCallEndSchema = z.object({
	callId: z.string().min(1),
	name: z.string().min(1),
	durationMs: z.number().int().nonnegative(),
	success: z.boolean(),
	error: z.string().optional(),
});

export type McpToolCallEnd = z.infer<typeof McpToolCallEndSchema>;

export type McpTelemetryEvent =
	| { type: typeof McpEventTypes.ToolCallBegin; payload: McpToolCallBegin }
	| { type: typeof McpEventTypes.ToolCallEnd; payload: McpToolCallEnd };
