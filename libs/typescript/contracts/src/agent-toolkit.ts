import { z } from 'zod';

// Base tool result schema
export const AgentToolkitBaseResultSchema = z.object({
	tool: z.string(),
	op: z.string(),
	inputs: z.record(z.unknown()),
	timestamp: z.string().datetime().optional(),
});

// Search tools schemas
export const AgentToolkitSearchInputSchema = z.object({
	pattern: z.string(),
	path: z.string(),
});

export const AgentToolkitSearchMatchSchema = z.object({
	file: z.string(),
	line: z.number(),
	text: z.string(),
	column: z.number().optional(),
});

export const AgentToolkitSearchResultSchema =
	AgentToolkitBaseResultSchema.extend({
		tool: z
			.literal('ripgrep')
			.or(z.literal('semgrep'))
			.or(z.literal('ast-grep')),
		op: z.literal('search'),
		inputs: AgentToolkitSearchInputSchema,
		results: z.array(AgentToolkitSearchMatchSchema),
		error: z.string().optional(),
	});

// Code modification schemas
export const AgentToolkitCodemodInputSchema = z.object({
	find: z.string(),
	replace: z.string(),
	path: z.string(),
});

export const AgentToolkitCodemodChangeSchema = z.object({
	file: z.string(),
	changes: z.number(),
	preview: z.string().optional(),
});

export const AgentToolkitCodemodResultSchema =
	AgentToolkitBaseResultSchema.extend({
		tool: z.literal('comby'),
		op: z.literal('rewrite'),
		inputs: AgentToolkitCodemodInputSchema,
		results: z.array(AgentToolkitCodemodChangeSchema),
		error: z.string().optional(),
	});

// Validation schemas
export const AgentToolkitValidationInputSchema = z.object({
	files: z.array(z.string()),
});

export const AgentToolkitValidationIssueSchema = z.object({
	file: z.string(),
	line: z.number().optional(),
	column: z.number().optional(),
	severity: z.enum(['error', 'warning', 'info']),
	message: z.string(),
	rule: z.string().optional(),
});

export const AgentToolkitValidationResultSchema =
	AgentToolkitBaseResultSchema.extend({
		tool: z
			.literal('eslint')
			.or(z.literal('ruff'))
			.or(z.literal('cargo'))
			.or(z.literal('pytest'))
			.or(z.literal('validator')),
		op: z.literal('validate'),
		inputs: AgentToolkitValidationInputSchema,
		results: z.array(AgentToolkitValidationIssueSchema),
		summary: z.object({
			total: z.number(),
			errors: z.number(),
			warnings: z.number(),
		}),
		error: z.string().optional(),
	});

// Events for A2A communication
export const AgentToolkitExecutionStartedEventSchema = z.object({
	toolId: z.string(),
	toolName: z.string(),
	operation: z.string(),
	inputs: z.record(z.unknown()),
	requestedBy: z.string(),
	sessionId: z.string().optional(),
});

export const AgentToolkitExecutionCompletedEventSchema = z.object({
	toolId: z.string(),
	toolName: z.string(),
	operation: z.string(),
	inputs: z.record(z.unknown()),
	results: z.unknown(),
	duration: z.number(),
	requestedBy: z.string(),
	sessionId: z.string().optional(),
	success: z.boolean(),
	error: z.string().optional(),
});

export const AgentToolkitExecutionFailedEventSchema = z.object({
	toolId: z.string(),
	toolName: z.string(),
	operation: z.string(),
	inputs: z.record(z.unknown()),
	error: z.string(),
	duration: z.number(),
	requestedBy: z.string(),
	sessionId: z.string().optional(),
});

// Union types
export const AgentToolkitInputSchema = z.union([
	AgentToolkitSearchInputSchema,
	AgentToolkitCodemodInputSchema,
	AgentToolkitValidationInputSchema,
]);

export const AgentToolkitResultSchema = z.union([
	AgentToolkitSearchResultSchema,
	AgentToolkitCodemodResultSchema,
	AgentToolkitValidationResultSchema,
]);

// Type exports
export type AgentToolkitSearchInput = z.infer<
	typeof AgentToolkitSearchInputSchema
>;
export type AgentToolkitSearchMatch = z.infer<
	typeof AgentToolkitSearchMatchSchema
>;
export type AgentToolkitSearchResult = z.infer<
	typeof AgentToolkitSearchResultSchema
>;

export type AgentToolkitCodemodInput = z.infer<
	typeof AgentToolkitCodemodInputSchema
>;
export type AgentToolkitCodemodChange = z.infer<
	typeof AgentToolkitCodemodChangeSchema
>;
export type AgentToolkitCodemodResult = z.infer<
	typeof AgentToolkitCodemodResultSchema
>;

export type AgentToolkitValidationInput = z.infer<
	typeof AgentToolkitValidationInputSchema
>;
export type AgentToolkitValidationIssue = z.infer<
	typeof AgentToolkitValidationIssueSchema
>;
export type AgentToolkitValidationResult = z.infer<
	typeof AgentToolkitValidationResultSchema
>;

export type AgentToolkitExecutionStartedEvent = z.infer<
	typeof AgentToolkitExecutionStartedEventSchema
>;
export type AgentToolkitExecutionCompletedEvent = z.infer<
	typeof AgentToolkitExecutionCompletedEventSchema
>;
export type AgentToolkitExecutionFailedEvent = z.infer<
	typeof AgentToolkitExecutionFailedEventSchema
>;

export type AgentToolkitInput = z.infer<typeof AgentToolkitInputSchema>;
export type AgentToolkitResult = z.infer<typeof AgentToolkitResultSchema>;
