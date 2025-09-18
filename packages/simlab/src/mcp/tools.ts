import { z } from 'zod';

// Simlab MCP Tool Schemas
const CreateScenarioInputSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	type: z.enum(['load', 'chaos', 'security', 'integration']),
	config: z
		.object({
			duration: z.number().positive().optional(),
			concurrency: z.number().int().positive().optional(),
			target: z.string().optional(),
		})
		.optional(),
});

const RunSimulationInputSchema = z.object({
	scenarioId: z.string().optional(),
	scenarioName: z.string().optional(),
	parameters: z.record(z.unknown()).optional(),
	async: z.boolean().default(false),
});

const GetSimulationResultsInputSchema = z.object({
	simulationId: z.string(),
	format: z.enum(['summary', 'detailed', 'metrics']).default('summary'),
	includeFailures: z.boolean().default(true),
});

const ListScenariosInputSchema = z.object({
	type: z.enum(['load', 'chaos', 'security', 'integration']).optional(),
	status: z.enum(['active', 'inactive', 'draft']).optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const InjectFailureInputSchema = z.object({
	target: z.string(),
	failureType: z.enum(['network', 'cpu', 'memory', 'disk', 'service']),
	intensity: z.enum(['low', 'medium', 'high']).default('medium'),
	duration: z.number().positive().optional(),
});

// Simlab MCP Tool Definitions
export interface SimlabTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const simlabMcpTools: SimlabTool[] = [
	{
		name: 'create_scenario',
		description: 'Create a new simulation scenario',
		inputSchema: CreateScenarioInputSchema,
	},
	{
		name: 'run_simulation',
		description: 'Execute a simulation scenario',
		inputSchema: RunSimulationInputSchema,
	},
	{
		name: 'get_simulation_results',
		description: 'Get results from a completed simulation',
		inputSchema: GetSimulationResultsInputSchema,
	},
	{
		name: 'list_scenarios',
		description: 'List available simulation scenarios',
		inputSchema: ListScenariosInputSchema,
	},
	{
		name: 'inject_failure',
		description: 'Inject chaos engineering failures',
		inputSchema: InjectFailureInputSchema,
	},
];

// Export types for external use
export type CreateScenarioInput = z.infer<typeof CreateScenarioInputSchema>;
export type RunSimulationInput = z.infer<typeof RunSimulationInputSchema>;
export type GetSimulationResultsInput = z.infer<typeof GetSimulationResultsInputSchema>;
export type ListScenariosInput = z.infer<typeof ListScenariosInputSchema>;
export type InjectFailureInput = z.infer<typeof InjectFailureInputSchema>;
