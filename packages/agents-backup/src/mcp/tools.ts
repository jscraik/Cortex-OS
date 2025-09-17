import { z } from 'zod';

// Agent MCP Tool Schemas
const CreateAgentInputSchema = z.object({
	type: z.enum([
		'security',
		'documentation',
		'test-generation',
		'code-analysis',
	]),
	config: z
		.object({
			model: z.string().optional(),
			temperature: z.number().min(0).max(1).optional(),
			maxTokens: z.number().positive().optional(),
		})
		.optional(),
});

const ExecuteAgentInputSchema = z.object({
	agentId: z.string(),
	task: z.string(),
	context: z
		.object({
			files: z.array(z.string()).optional(),
			codebase: z.string().optional(),
			requirements: z.string().optional(),
		})
		.optional(),
});

const ListAgentsInputSchema = z.object({
	type: z
		.enum(['security', 'documentation', 'test-generation', 'code-analysis'])
		.optional(),
	status: z.enum(['active', 'idle', 'completed', 'error']).optional(),
});

const GetAgentStatusInputSchema = z.object({
	agentId: z.string(),
});

// Agent MCP Tool Definitions
export interface AgentTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const agentMcpTools: AgentTool[] = [
	{
		name: 'create_agent',
		description: 'Create a new AI agent for specific tasks',
		inputSchema: CreateAgentInputSchema,
	},
	{
		name: 'execute_agent_task',
		description: 'Execute a task using a specific agent',
		inputSchema: ExecuteAgentInputSchema,
	},
	{
		name: 'list_agents',
		description: 'List available agents with optional filtering',
		inputSchema: ListAgentsInputSchema,
	},
	{
		name: 'get_agent_status',
		description: 'Get the current status of an agent',
		inputSchema: GetAgentStatusInputSchema,
	},
];

// Export types for external use
export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;
export type ExecuteAgentInput = z.infer<typeof ExecuteAgentInputSchema>;
export type ListAgentsInput = z.infer<typeof ListAgentsInputSchema>;
export type GetAgentStatusInput = z.infer<typeof GetAgentStatusInputSchema>;
