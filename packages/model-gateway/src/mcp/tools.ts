import { z } from 'zod';

// Model Gateway MCP Tool Schemas
const RouteRequestInputSchema = z.object({
	model: z.string(),
	request: z.object({
		messages: z
			.array(
				z.object({
					role: z.enum(['system', 'user', 'assistant']),
					content: z.string(),
				}),
			)
			.optional(),
		prompt: z.string().optional(),
		temperature: z.number().min(0).max(1).optional(),
		maxTokens: z.number().positive().optional(),
	}),
	provider: z.string().optional(),
});

const GetAvailableModelsInputSchema = z.object({
	provider: z.string().optional(),
	capability: z.enum(['chat', 'embeddings', 'rerank']).optional(),
});

const ValidateRequestInputSchema = z.object({
	request: z.record(z.unknown()),
	model: z.string(),
	provider: z.string().optional(),
});

const GetModelInfoInputSchema = z.object({
	model: z.string(),
	provider: z.string().optional(),
});

// Model Gateway MCP Tool Definitions
export interface ModelGatewayTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const modelGatewayMcpTools: ModelGatewayTool[] = [
	{
		name: 'route_request',
		description: 'Route a model request to the appropriate provider',
		inputSchema: RouteRequestInputSchema,
	},
	{
		name: 'get_available_models',
		description: 'Get list of available models by provider and capability',
		inputSchema: GetAvailableModelsInputSchema,
	},
	{
		name: 'validate_request',
		description: 'Validate a model request against schema and policies',
		inputSchema: ValidateRequestInputSchema,
	},
	{
		name: 'get_model_info',
		description: 'Get detailed information about a specific model',
		inputSchema: GetModelInfoInputSchema,
	},
];

// Export types for external use
export type RouteRequestInput = z.infer<typeof RouteRequestInputSchema>;
export type GetAvailableModelsInput = z.infer<
	typeof GetAvailableModelsInputSchema
>;
export type ValidateRequestInput = z.infer<typeof ValidateRequestInputSchema>;
export type GetModelInfoInput = z.infer<typeof GetModelInfoInputSchema>;
