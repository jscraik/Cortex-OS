import { z } from 'zod';
/**
 * Agent-related A2A event schemas for inter-package communication
 */
export declare const AgentStartedEventSchema: z.ZodObject<
	{
		agentId: z.ZodString;
		type: z.ZodEnum<
			['security', 'documentation', 'test-generation', 'code-analysis']
		>;
		task: z.ZodString;
		startedAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		agentId: string;
		task: string;
		startedAt: string;
	},
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		agentId: string;
		task: string;
		startedAt: string;
	}
>;
export declare const AgentCompletedEventSchema: z.ZodObject<
	{
		agentId: z.ZodString;
		type: z.ZodEnum<
			['security', 'documentation', 'test-generation', 'code-analysis']
		>;
		result: z.ZodRecord<z.ZodString, z.ZodUnknown>;
		duration: z.ZodNumber;
		completedAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		agentId: string;
		result: Record<string, unknown>;
		duration: number;
		completedAt: string;
	},
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		agentId: string;
		result: Record<string, unknown>;
		duration: number;
		completedAt: string;
	}
>;
export declare const AgentFailedEventSchema: z.ZodObject<
	{
		agentId: z.ZodString;
		type: z.ZodEnum<
			['security', 'documentation', 'test-generation', 'code-analysis']
		>;
		error: z.ZodString;
		failedAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		error: string;
		agentId: string;
		failedAt: string;
	},
	{
		type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
		error: string;
		agentId: string;
		failedAt: string;
	}
>;
export declare const MCPServerConnectedEventSchema: z.ZodObject<
	{
		serverId: z.ZodString;
		serverName: z.ZodString;
		transport: z.ZodEnum<['stdio', 'sse', 'streamableHttp']>;
		connectedAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		serverId: string;
		serverName: string;
		transport: 'stdio' | 'sse' | 'streamableHttp';
		connectedAt: string;
	},
	{
		serverId: string;
		serverName: string;
		transport: 'stdio' | 'sse' | 'streamableHttp';
		connectedAt: string;
	}
>;
export type AgentStartedEvent = z.infer<typeof AgentStartedEventSchema>;
export type AgentCompletedEvent = z.infer<typeof AgentCompletedEventSchema>;
export type AgentFailedEvent = z.infer<typeof AgentFailedEventSchema>;
export type MCPServerConnectedEvent = z.infer<
	typeof MCPServerConnectedEventSchema
>;
export declare const createAgentEvent: {
	started: (data: AgentStartedEvent) => {
		type: 'agent.started';
		data: {
			type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
			agentId: string;
			task: string;
			startedAt: string;
		};
	};
	completed: (data: AgentCompletedEvent) => {
		type: 'agent.completed';
		data: {
			type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
			agentId: string;
			result: Record<string, unknown>;
			duration: number;
			completedAt: string;
		};
	};
	failed: (data: AgentFailedEvent) => {
		type: 'agent.failed';
		data: {
			type: 'security' | 'documentation' | 'test-generation' | 'code-analysis';
			error: string;
			agentId: string;
			failedAt: string;
		};
	};
	mcpConnected: (data: MCPServerConnectedEvent) => {
		type: 'agent.mcp.connected';
		data: {
			serverId: string;
			serverName: string;
			transport: 'stdio' | 'sse' | 'streamableHttp';
			connectedAt: string;
		};
	};
};
//# sourceMappingURL=agent-events.d.ts.map
