import { z } from 'zod';

// Integrations MCP Tool Schemas
const CreateIntegrationInputSchema = z.object({
	name: z.string(),
	type: z.enum(['webhook', 'api', 'database', 'message-queue']),
	config: z.object({
		endpoint: z.string().url().optional(),
		credentials: z.record(z.string()).optional(),
		headers: z.record(z.string()).optional(),
		retryPolicy: z
			.object({
				maxRetries: z.number().int().nonnegative().default(3),
				backoffMs: z.number().positive().default(1000),
			})
			.optional(),
	}),
});

const TestIntegrationInputSchema = z.object({
	integrationId: z.string(),
	testType: z
		.enum(['connectivity', 'authentication', 'full'])
		.default('connectivity'),
});

const ExecuteIntegrationInputSchema = z.object({
	integrationId: z.string(),
	operation: z.string(),
	payload: z.record(z.unknown()).optional(),
	timeout: z.number().positive().optional(),
});

const ListIntegrationsInputSchema = z.object({
	type: z.enum(['webhook', 'api', 'database', 'message-queue']).optional(),
	status: z.enum(['active', 'inactive', 'error']).optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const MonitorIntegrationInputSchema = z.object({
	integrationId: z.string(),
	metrics: z
		.array(z.enum(['latency', 'success-rate', 'error-count']))
		.optional(),
	timeRange: z
		.object({
			start: z.string().datetime().optional(),
			end: z.string().datetime().optional(),
		})
		.optional(),
});

// Integrations MCP Tool Definitions
export interface IntegrationsTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const integrationsMcpTools: IntegrationsTool[] = [
	{
		name: 'create_integration',
		description: 'Create a new external system integration',
		inputSchema: CreateIntegrationInputSchema,
	},
	{
		name: 'test_integration',
		description: 'Test connectivity and functionality of an integration',
		inputSchema: TestIntegrationInputSchema,
	},
	{
		name: 'execute_integration',
		description: 'Execute an operation through an integration',
		inputSchema: ExecuteIntegrationInputSchema,
	},
	{
		name: 'list_integrations',
		description: 'List configured integrations with filtering',
		inputSchema: ListIntegrationsInputSchema,
	},
	{
		name: 'monitor_integration',
		description: 'Get monitoring data for an integration',
		inputSchema: MonitorIntegrationInputSchema,
	},
];

// Export types for external use
export type CreateIntegrationInput = z.infer<
	typeof CreateIntegrationInputSchema
>;
export type TestIntegrationInput = z.infer<typeof TestIntegrationInputSchema>;
export type ExecuteIntegrationInput = z.infer<
	typeof ExecuteIntegrationInputSchema
>;
export type ListIntegrationsInput = z.infer<typeof ListIntegrationsInputSchema>;
export type MonitorIntegrationInput = z.infer<
	typeof MonitorIntegrationInputSchema
>;
