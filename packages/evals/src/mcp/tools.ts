import { z } from 'zod';

// Evaluations MCP Tool Schemas
const CreateEvalSuiteInputSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	testCases: z.array(
		z.object({
			input: z.string(),
			expectedOutput: z.string().optional(),
			criteria: z.array(z.string()).optional(),
		}),
	),
	config: z
		.object({
			model: z.string().optional(),
			temperature: z.number().min(0).max(1).optional(),
			maxTokens: z.number().positive().optional(),
		})
		.optional(),
});

const RunEvaluationInputSchema = z.object({
	suiteId: z.string().optional(),
	suiteName: z.string().optional(),
	model: z.string(),
	provider: z.string().optional(),
	parallel: z.boolean().default(false),
	saveResults: z.boolean().default(true),
});

const GetEvalResultsInputSchema = z.object({
	evalId: z.string().optional(),
	suiteId: z.string().optional(),
	model: z.string().optional(),
	dateRange: z
		.object({
			start: z.string().datetime().optional(),
			end: z.string().datetime().optional(),
		})
		.optional(),
	format: z.enum(['summary', 'detailed', 'json']).default('summary'),
});

const CompareModelsInputSchema = z.object({
	models: z.array(z.string()).min(2),
	suiteId: z.string(),
	metrics: z.array(z.enum(['accuracy', 'latency', 'cost', 'safety'])).optional(),
});

const ValidateOutputInputSchema = z.object({
	output: z.string(),
	criteria: z.array(z.string()),
	strictMode: z.boolean().default(false),
});

// Evaluations MCP Tool Definitions
export interface EvalsTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const evalsMcpTools: EvalsTool[] = [
	{
		name: 'create_eval_suite',
		description: 'Create a new evaluation test suite',
		inputSchema: CreateEvalSuiteInputSchema,
	},
	{
		name: 'run_evaluation',
		description: 'Run an evaluation suite against a model',
		inputSchema: RunEvaluationInputSchema,
	},
	{
		name: 'get_eval_results',
		description: 'Retrieve evaluation results with filtering',
		inputSchema: GetEvalResultsInputSchema,
	},
	{
		name: 'compare_models',
		description: 'Compare performance of multiple models',
		inputSchema: CompareModelsInputSchema,
	},
	{
		name: 'validate_output',
		description: 'Validate model output against criteria',
		inputSchema: ValidateOutputInputSchema,
	},
];

// Export types for external use
export type CreateEvalSuiteInput = z.infer<typeof CreateEvalSuiteInputSchema>;
export type RunEvaluationInput = z.infer<typeof RunEvaluationInputSchema>;
export type GetEvalResultsInput = z.infer<typeof GetEvalResultsInputSchema>;
export type CompareModelsInput = z.infer<typeof CompareModelsInputSchema>;
export type ValidateOutputInput = z.infer<typeof ValidateOutputInputSchema>;
