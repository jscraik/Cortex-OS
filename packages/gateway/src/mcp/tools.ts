import { z } from 'zod';

// Gateway MCP Tool Schemas
const CreateRouteInputSchema = z.object({
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
	handler: z.string(),
	middleware: z.array(z.string()).optional(),
	rateLimit: z
		.object({
			requests: z.number().positive(),
			window: z.number().positive(),
		})
		.optional(),
});

const GetRoutesInputSchema = z.object({
	path: z.string().optional(),
	method: z.string().optional(),
	active: z.boolean().optional(),
});

const UpdateRouteInputSchema = z.object({
	routeId: z.string(),
	updates: z.object({
		handler: z.string().optional(),
		middleware: z.array(z.string()).optional(),
		rateLimit: z
			.object({
				requests: z.number().positive(),
				window: z.number().positive(),
			})
			.optional(),
		active: z.boolean().optional(),
	}),
});

const GetHealthInputSchema = z.object({
	includeDependencies: z.boolean().optional(),
});

// Gateway MCP Tool Definitions
export interface GatewayTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const gatewayMcpTools: GatewayTool[] = [
	{
		name: 'create_route',
		description: 'Create a new API route',
		inputSchema: CreateRouteInputSchema,
	},
	{
		name: 'get_routes',
		description: 'List API routes with optional filtering',
		inputSchema: GetRoutesInputSchema,
	},
	{
		name: 'update_route',
		description: 'Update an existing API route',
		inputSchema: UpdateRouteInputSchema,
	},
	{
		name: 'get_health',
		description: 'Get gateway health status',
		inputSchema: GetHealthInputSchema,
	},
];

// Export types for external use
export type CreateRouteInput = z.infer<typeof CreateRouteInputSchema>;
export type GetRoutesInput = z.infer<typeof GetRoutesInputSchema>;
export type UpdateRouteInput = z.infer<typeof UpdateRouteInputSchema>;
export type GetHealthInput = z.infer<typeof GetHealthInputSchema>;
