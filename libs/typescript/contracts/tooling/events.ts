import { z } from 'zod';

// Tool Run Completed Event Schema
export const toolRunCompletedEventDataSchema = z.object({
	toolName: z.string(),
	durationMs: z.number().int().nonnegative(),
	success: z.boolean(),
	contextSummary: z.string().optional(),
	error: z.string().optional(),
});

// Pipeline Run Completed Event Schema
export const pipelineRunCompletedEventDataSchema = z.object({
	runId: z.string(),
	status: z.enum(['success', 'failed', 'canceled']),
	contextDigest: z.string().optional(),
	artifactRefs: z.array(z.string()).default([]),
});

export type ToolRunCompletedEventData = z.infer<typeof toolRunCompletedEventDataSchema>;
export type PipelineRunCompletedEventData = z.infer<typeof pipelineRunCompletedEventDataSchema>;

export const TOOLING_EVENT_TYPES = {
	TOOL_RUN_COMPLETED: 'tool.run.completed',
	PIPELINE_RUN_COMPLETED: 'pipeline.run.completed',
} as const;

export type ToolingEventType = (typeof TOOLING_EVENT_TYPES)[keyof typeof TOOLING_EVENT_TYPES];

export const TOOLING_EVENT_SCHEMAS = {
	[TOOLING_EVENT_TYPES.TOOL_RUN_COMPLETED]: toolRunCompletedEventDataSchema,
	[TOOLING_EVENT_TYPES.PIPELINE_RUN_COMPLETED]: pipelineRunCompletedEventDataSchema,
} as const;

export function validateToolingEvent(eventType: ToolingEventType, data: unknown) {
	const schema = TOOLING_EVENT_SCHEMAS[eventType];
	if (!schema) {
		throw new Error(`Unknown tooling event type: ${eventType}`);
	}
	return schema.parse(data);
}
