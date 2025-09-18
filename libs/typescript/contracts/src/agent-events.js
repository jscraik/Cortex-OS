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
// Helper function to create agent events
export const createAgentEvent = {
	started: (data) => ({
		type: 'agent.started',
		data: AgentStartedEventSchema.parse(data),
	}),
	completed: (data) => ({
		type: 'agent.completed',
		data: AgentCompletedEventSchema.parse(data),
	}),
	failed: (data) => ({
		type: 'agent.failed',
		data: AgentFailedEventSchema.parse(data),
	}),
	mcpConnected: (data) => ({
		type: 'agent.mcp.connected',
		data: MCPServerConnectedEventSchema.parse(data),
	}),
};
//# sourceMappingURL=agent-events.js.map
