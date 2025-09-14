import { z } from 'zod';

// Cortex Logging MCP Tool Schemas
const CreateLoggerInputSchema = z.object({
	name: z.string(),
	level: z
		.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
		.default('info'),
	format: z.enum(['json', 'pretty', 'simple']).default('json'),
	outputs: z.array(z.enum(['console', 'file', 'network'])).default(['console']),
});

const LogMessageInputSchema = z.object({
	logger: z.string(),
	level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
	message: z.string(),
	metadata: z.record(z.unknown()).optional(),
	traceId: z.string().optional(),
});

const QueryLogsInputSchema = z.object({
	level: z
		.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
		.optional(),
	timeRange: z
		.object({
			start: z.string().datetime().optional(),
			end: z.string().datetime().optional(),
		})
		.optional(),
	filter: z.string().optional(),
	limit: z.number().int().positive().max(1000).default(100),
});

const ConfigureLoggerInputSchema = z.object({
	logger: z.string(),
	config: z.object({
		level: z
			.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
			.optional(),
		format: z.enum(['json', 'pretty', 'simple']).optional(),
		outputs: z.array(z.enum(['console', 'file', 'network'])).optional(),
	}),
});

// Cortex Logging MCP Tool Definitions
export interface CortexLoggingTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const cortexLoggingMcpTools: CortexLoggingTool[] = [
	{
		name: 'create_logger',
		description: 'Create a new logger instance',
		inputSchema: CreateLoggerInputSchema,
	},
	{
		name: 'log_message',
		description: 'Log a message with specified level',
		inputSchema: LogMessageInputSchema,
	},
	{
		name: 'query_logs',
		description: 'Query logged messages with filtering',
		inputSchema: QueryLogsInputSchema,
	},
	{
		name: 'configure_logger',
		description: 'Configure an existing logger',
		inputSchema: ConfigureLoggerInputSchema,
	},
];

// Export types for external use
export type CreateLoggerInput = z.infer<typeof CreateLoggerInputSchema>;
export type LogMessageInput = z.infer<typeof LogMessageInputSchema>;
export type QueryLogsInput = z.infer<typeof QueryLogsInputSchema>;
export type ConfigureLoggerInput = z.infer<typeof ConfigureLoggerInputSchema>;
