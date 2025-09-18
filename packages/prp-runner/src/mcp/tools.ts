import { z } from 'zod';

// PRP Runner MCP Tool Schemas
const CreatePRPWorkflowInputSchema = z.object({
	repository: z.string(),
	pullRequestId: z.string(),
	config: z
		.object({
			enableSecurity: z.boolean().default(true),
			enableTests: z.boolean().default(true),
			enableLinting: z.boolean().default(true),
			customChecks: z.array(z.string()).optional(),
		})
		.optional(),
});

const GetPRPStatusInputSchema = z.object({
	workflowId: z.string(),
	includeDetails: z.boolean().default(false),
	includeLogs: z.boolean().default(false),
});

const RunPRPStepInputSchema = z.object({
	workflowId: z.string(),
	stepName: z.string(),
	parameters: z.record(z.unknown()).optional(),
	force: z.boolean().default(false),
});

const ListPRPWorkflowsInputSchema = z.object({
	status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
	repository: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const ApprovePRPStepInputSchema = z.object({
	workflowId: z.string(),
	stepName: z.string(),
	approved: z.boolean(),
	comments: z.string().optional(),
});

// PRP Runner MCP Tool Definitions
export interface PRPRunnerTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const prpRunnerMcpTools: PRPRunnerTool[] = [
	{
		name: 'create_prp_workflow',
		description: 'Create a new pull request processing workflow',
		inputSchema: CreatePRPWorkflowInputSchema,
	},
	{
		name: 'get_prp_status',
		description: 'Get the status of a PRP workflow',
		inputSchema: GetPRPStatusInputSchema,
	},
	{
		name: 'run_prp_step',
		description: 'Execute a specific step in the PRP workflow',
		inputSchema: RunPRPStepInputSchema,
	},
	{
		name: 'list_prp_workflows',
		description: 'List PRP workflows with filtering',
		inputSchema: ListPRPWorkflowsInputSchema,
	},
	{
		name: 'approve_prp_step',
		description: 'Approve or reject a PRP workflow step',
		inputSchema: ApprovePRPStepInputSchema,
	},
];

// Export types for external use
export type CreatePRPWorkflowInput = z.infer<typeof CreatePRPWorkflowInputSchema>;
export type GetPRPStatusInput = z.infer<typeof GetPRPStatusInputSchema>;
export type RunPRPStepInput = z.infer<typeof RunPRPStepInputSchema>;
export type ListPRPWorkflowsInput = z.infer<typeof ListPRPWorkflowsInputSchema>;
export type ApprovePRPStepInput = z.infer<typeof ApprovePRPStepInputSchema>;
