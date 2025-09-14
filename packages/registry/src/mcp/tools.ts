import { z } from 'zod';

// Registry MCP Tool Schemas
const RegisterSchemaInputSchema = z.object({
	name: z.string(),
	version: z.string(),
	schema: z.record(z.unknown()),
	metadata: z
		.object({
			description: z.string().optional(),
			tags: z.array(z.string()).optional(),
			author: z.string().optional(),
		})
		.optional(),
});

const GetSchemaInputSchema = z.object({
	name: z.string(),
	version: z.string().optional(),
	format: z.enum(['json', 'yaml']).default('json'),
});

const ValidateSchemaInputSchema = z.object({
	schemaName: z.string(),
	data: z.record(z.unknown()),
	version: z.string().optional(),
	strict: z.boolean().default(false),
});

const ListSchemasInputSchema = z.object({
	nameFilter: z.string().optional(),
	tags: z.array(z.string()).optional(),
	author: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const RegisterServiceInputSchema = z.object({
	name: z.string(),
	endpoint: z.string().url(),
	healthCheck: z.string().url().optional(),
	metadata: z
		.object({
			version: z.string().optional(),
			description: z.string().optional(),
			capabilities: z.array(z.string()).optional(),
		})
		.optional(),
});

// Registry MCP Tool Definitions
export interface RegistryTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const registryMcpTools: RegistryTool[] = [
	{
		name: 'register_schema',
		description: 'Register a new schema in the registry',
		inputSchema: RegisterSchemaInputSchema,
	},
	{
		name: 'get_schema',
		description: 'Retrieve a schema from the registry',
		inputSchema: GetSchemaInputSchema,
	},
	{
		name: 'validate_schema',
		description: 'Validate data against a registered schema',
		inputSchema: ValidateSchemaInputSchema,
	},
	{
		name: 'list_schemas',
		description: 'List available schemas with filtering',
		inputSchema: ListSchemasInputSchema,
	},
	{
		name: 'register_service',
		description: 'Register a service in the service registry',
		inputSchema: RegisterServiceInputSchema,
	},
];

// Export types for external use
export type RegisterSchemaInput = z.infer<typeof RegisterSchemaInputSchema>;
export type GetSchemaInput = z.infer<typeof GetSchemaInputSchema>;
export type ValidateSchemaInput = z.infer<typeof ValidateSchemaInputSchema>;
export type ListSchemasInput = z.infer<typeof ListSchemasInputSchema>;
export type RegisterServiceInput = z.infer<typeof RegisterServiceInputSchema>;
