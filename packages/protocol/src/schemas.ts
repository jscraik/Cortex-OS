import { z } from 'zod';

const streamLaneValues = ['hot', 'heavy'] as const;
const taskStatusValues = [
	'idle',
	'running',
	'blocked',
	'completed',
	'failed',
	'cancelled',
] as const;
const planStepStatusValues = ['pending', 'active', 'completed', 'skipped', 'failed'] as const;
const toolCallStatusValues = ['pending', 'running', 'completed', 'failed'] as const;
const streamStatusValues = ['queued', 'running', 'paused', 'completed', 'failed'] as const;
const budgetMeterKinds = ['tokens', 'time', 'tools', 'network', 'filesystem'] as const;

export const JsonSchemaDefinitionSchema: z.ZodType<import('./types.js').JsonSchemaDefinition> =
	z.lazy(() =>
		z.object({
			$id: z.string().optional(),
			title: z.string().optional(),
			type: z.string().optional(),
			properties: z.record(JsonSchemaDefinitionSchema).optional(),
			required: z.array(z.string()).optional(),
			items: z.union([JsonSchemaDefinitionSchema, z.array(JsonSchemaDefinitionSchema)]).optional(),
			additionalProperties: z.union([z.boolean(), JsonSchemaDefinitionSchema]).optional(),
			anyOf: z.array(JsonSchemaDefinitionSchema).optional(),
			allOf: z.array(JsonSchemaDefinitionSchema).optional(),
			oneOf: z.array(JsonSchemaDefinitionSchema).optional(),
			enum: z.array(z.unknown()).optional(),
			const: z.unknown().optional(),
			format: z.string().optional(),
			minimum: z.number().optional(),
			maximum: z.number().optional(),
			pattern: z.string().optional(),
		}),
	);

export const ErrorShapeSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.record(z.unknown()).optional(),
	retryable: z.boolean().optional(),
});

export const EnvelopeSchema = z.object({
	id: z.string(),
	type: z.string(),
	payload: z.unknown(),
	occurredAt: z.string().datetime({ offset: true }),
	sessionId: z.string().optional(),
	source: z.string().optional(),
	traceId: z.string().optional(),
	ttlMs: z.number().int().positive().optional(),
	headers: z.record(z.unknown()).optional(),
});

export const TaskSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	name: z.string(),
	input: z.unknown(),
	status: z.enum(taskStatusValues),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	priority: z.number().int().optional(),
	context: z
		.object({
			locale: z.string().optional(),
			agentRole: z.string().optional(),
			metadata: z.record(z.unknown()).optional(),
		})
		.optional(),
	budgetId: z.string().optional(),
});

export const PlanStepSchema = z.object({
	id: z.string(),
	description: z.string(),
	status: z.enum(planStepStatusValues),
	dependsOn: z.array(z.string()).optional(),
	notes: z.string().optional(),
	toolCallId: z.string().optional(),
});

export const PlanSchema = z.object({
	id: z.string(),
	taskId: z.string(),
	revision: z.number().int().nonnegative(),
	author: z.string(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	steps: z.array(PlanStepSchema).min(1),
	summary: z.string().optional(),
});

export const ToolCallSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	taskId: z.string(),
	toolName: z.string(),
	arguments: z.unknown(),
	issuedAt: z.string().datetime({ offset: true }),
	status: z.enum(toolCallStatusValues),
	deadlineMs: z.number().int().positive().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const ToolResultSchema = z.object({
	id: z.string(),
	toolCallId: z.string(),
	completedAt: z.string().datetime({ offset: true }),
	output: z.unknown(),
	logs: z.array(z.string()).optional(),
	error: ErrorShapeSchema.optional(),
});

export const StreamPatchSummarySchema = z.object({
	path: z.string(),
	changeType: z.enum(['created', 'modified', 'deleted']),
	additions: z.number().int().nonnegative(),
	deletions: z.number().int().nonnegative(),
	preview: z.string().optional(),
});

const StreamEventBaseSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	timestamp: z.string().datetime({ offset: true }),
	traceId: z.string().optional(),
});

const TokenStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('token'),
	sequence: z.number().int().nonnegative(),
	content: z.string(),
	lane: z.enum(streamLaneValues),
	source: z.enum(['model', 'tool']),
});

const StatusStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('status'),
	status: z.enum(streamStatusValues),
	message: z.string().optional(),
});

const ToolStartStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('tool_start'),
	toolCall: ToolCallSchema,
});

const ToolEndStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('tool_end'),
	toolResult: ToolResultSchema,
});

const PatchStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('patch'),
	patch: StreamPatchSummarySchema,
});

const ErrorStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('error'),
	error: ErrorShapeSchema,
});

const DoneStreamEventSchema = StreamEventBaseSchema.extend({
	type: z.literal('done'),
	durationMs: z.number().int().nonnegative().optional(),
	outcome: z.enum(['success', 'failure', 'cancelled']).optional(),
});

export const StreamEventSchema = z.discriminatedUnion('type', [
	TokenStreamEventSchema,
	StatusStreamEventSchema,
	ToolStartStreamEventSchema,
	ToolEndStreamEventSchema,
	PatchStreamEventSchema,
	ErrorStreamEventSchema,
	DoneStreamEventSchema,
]);

export const BudgetMeterSchema = z.object({
	kind: z.enum(budgetMeterKinds),
	limit: z.number().nonnegative(),
	used: z.number().nonnegative(),
	windowMs: z.number().int().positive().optional(),
	lastUpdated: z.string().datetime({ offset: true }),
});

export const BudgetSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	meters: z.array(BudgetMeterSchema),
	expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const SessionLabelsSchema = z.object({
	tags: z.array(z.string()).optional(),
	owner: z.string().optional(),
	environment: z.enum(['dev', 'ci', 'prod', 'test']).optional(),
});

export const SessionSnapshotSchema = z.object({
	id: z.string(),
	createdAt: z.string().datetime({ offset: true }),
	updatedAt: z.string().datetime({ offset: true }),
	labels: SessionLabelsSchema.optional(),
	metadata: z.record(z.unknown()).optional(),
	parentId: z.string().optional(),
});
