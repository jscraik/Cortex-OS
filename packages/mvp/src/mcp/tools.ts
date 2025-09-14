import { z } from 'zod';

// MVP MCP Tool Schemas
const CreateGraphInputSchema = z.object({
	name: z.string(),
	nodes: z.array(
		z.object({
			id: z.string(),
			type: z.string(),
			config: z.record(z.unknown()).optional(),
		}),
	),
	edges: z
		.array(
			z.object({
				from: z.string(),
				to: z.string(),
				condition: z.string().optional(),
			}),
		)
		.optional(),
});

const ExecuteGraphInputSchema = z.object({
	graphId: z.string(),
	inputs: z.record(z.unknown()).optional(),
	config: z
		.object({
			timeout: z.number().positive().optional(),
			parallel: z.boolean().default(false),
		})
		.optional(),
});

const GetGraphStatusInputSchema = z.object({
	graphId: z.string(),
	includeHistory: z.boolean().default(false),
});

const ValidateGraphInputSchema = z.object({
	graphId: z.string().optional(),
	graphDefinition: z.record(z.unknown()).optional(),
	strict: z.boolean().default(false),
});

const OptimizeGraphInputSchema = z.object({
	graphId: z.string(),
	optimizationType: z
		.enum(['performance', 'memory', 'cost'])
		.default('performance'),
});

// MVP MCP Tool Definitions
export interface MVPTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const mvpMcpTools: MVPTool[] = [
	{
		name: 'create_graph',
		description: 'Create a new execution graph',
		inputSchema: CreateGraphInputSchema,
	},
	{
		name: 'execute_graph',
		description: 'Execute a graph with given inputs',
		inputSchema: ExecuteGraphInputSchema,
	},
	{
		name: 'get_graph_status',
		description: 'Get the current status of a graph execution',
		inputSchema: GetGraphStatusInputSchema,
	},
	{
		name: 'validate_graph',
		description: 'Validate graph definition and structure',
		inputSchema: ValidateGraphInputSchema,
	},
	{
		name: 'optimize_graph',
		description: 'Optimize graph execution performance',
		inputSchema: OptimizeGraphInputSchema,
	},
];

// Export types for external use
export type CreateGraphInput = z.infer<typeof CreateGraphInputSchema>;
export type ExecuteGraphInput = z.infer<typeof ExecuteGraphInputSchema>;
export type GetGraphStatusInput = z.infer<typeof GetGraphStatusInputSchema>;
export type ValidateGraphInput = z.infer<typeof ValidateGraphInputSchema>;
export type OptimizeGraphInput = z.infer<typeof OptimizeGraphInputSchema>;
