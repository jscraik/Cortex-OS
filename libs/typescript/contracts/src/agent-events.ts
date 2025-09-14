import { z } from 'zod';

/**
 * Agent-related A2A event schemas for inter-package communication
 */

// Agent Started Event
export const AgentStartedEventSchema = z.object({
	agentId: z.string(),
	type: z.enum([
		'security',
		'documentation',
		'test-generation',
		'code-analysis',
	]),
	task: z.string(),
	startedAt: z.string(),
});

// Agent Completed Event
export const AgentCompletedEventSchema = z.object({
	agentId: z.string(),
	type: z.enum([
		'security',
		'documentation',
		'test-generation',
		'code-analysis',
	]),
	result: z.record(z.unknown()),
	duration: z.number().positive(),
	completedAt: z.string(),
});

// Agent Failed Event
export const AgentFailedEventSchema = z.object({
	agentId: z.string(),
	type: z.enum([
		'security',
		'documentation',
		'test-generation',
		'code-analysis',
	]),
	error: z.string(),
	failedAt: z.string(),
});

// MCP Server Connected Event
export const MCPServerConnectedEventSchema = z.object({
	serverId: z.string(),
	serverName: z.string(),
	transport: z.enum(['stdio', 'sse', 'streamableHttp']),
	connectedAt: z.string(),
});

// Export event type definitions
export type AgentStartedEvent = z.infer<typeof AgentStartedEventSchema>;
export type AgentCompletedEvent = z.infer<typeof AgentCompletedEventSchema>;
export type AgentFailedEvent = z.infer<typeof AgentFailedEventSchema>;
export type MCPServerConnectedEvent = z.infer<
	typeof MCPServerConnectedEventSchema
>;

// Helper function to create agent events
export const createAgentEvent = {
	started: (data: AgentStartedEvent) => ({
		type: 'agent.started' as const,
		data: AgentStartedEventSchema.parse(data),
	}),
	completed: (data: AgentCompletedEvent) => ({
		type: 'agent.completed' as const,
		data: AgentCompletedEventSchema.parse(data),
	}),
	failed: (data: AgentFailedEvent) => ({
		type: 'agent.failed' as const,
		data: AgentFailedEventSchema.parse(data),
	}),
	mcpConnected: (data: MCPServerConnectedEvent) => ({
		type: 'agent.mcp.connected' as const,
		data: MCPServerConnectedEventSchema.parse(data),
	}),
};
