import { z } from 'zod';

/**
 * PRP Runner A2A event schemas for inter-package communication
 */

// PR Processing Started Event
export const PrProcessingStartedEventSchema = z.object({
	processId: z.string(),
	pullRequestId: z.string(),
	repositoryId: z.string(),
	initiatedBy: z.string(),
	tasks: z.array(z.string()),
	startedAt: z.string(),
});

// Task Executed Event
export const TaskExecutedEventSchema = z.object({
	processId: z.string(),
	taskId: z.string(),
	name: z.string(),
	status: z.enum(['started', 'completed', 'failed', 'skipped']),
	duration: z.number().int().nonnegative().optional(),
	output: z.string().optional(),
	errorMessage: z.string().optional(),
	executedAt: z.string(),
});

// Review Generated Event
export const ReviewGeneratedEventSchema = z.object({
	processId: z.string(),
	reviewId: z.string(),
	pullRequestId: z.string(),
	type: z.enum(['automated', 'ai_assisted', 'template']),
	findings: z.number().int().nonnegative(),
	suggestions: z.number().int().nonnegative(),
	generatedAt: z.string(),
});

// PR Processing Completed Event
export const PrProcessingCompletedEventSchema = z.object({
	processId: z.string(),
	pullRequestId: z.string(),
	status: z.enum(['success', 'partial', 'failed']),
	totalTasks: z.number().int().nonnegative(),
	completedTasks: z.number().int().nonnegative(),
	failedTasks: z.number().int().nonnegative(),
	duration: z.number().int().nonnegative(),
	completedAt: z.string(),
});

// Export event type definitions
export type PrProcessingStartedEvent = z.infer<
	typeof PrProcessingStartedEventSchema
>;
export type TaskExecutedEvent = z.infer<typeof TaskExecutedEventSchema>;
export type ReviewGeneratedEvent = z.infer<typeof ReviewGeneratedEventSchema>;
export type PrProcessingCompletedEvent = z.infer<
	typeof PrProcessingCompletedEventSchema
>;

// Helper function to create PRP Runner events
export const createPrpRunnerEvent = {
	processingStarted: (data: PrProcessingStartedEvent) => ({
		type: 'prp_runner.processing.started' as const,
		data: PrProcessingStartedEventSchema.parse(data),
	}),
	taskExecuted: (data: TaskExecutedEvent) => ({
		type: 'prp_runner.task.executed' as const,
		data: TaskExecutedEventSchema.parse(data),
	}),
	reviewGenerated: (data: ReviewGeneratedEvent) => ({
		type: 'prp_runner.review.generated' as const,
		data: ReviewGeneratedEventSchema.parse(data),
	}),
	processingCompleted: (data: PrProcessingCompletedEvent) => ({
		type: 'prp_runner.processing.completed' as const,
		data: PrProcessingCompletedEventSchema.parse(data),
	}),
};
