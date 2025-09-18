import { z } from 'zod';

/**
 * Evaluation-related A2A event schemas for inter-package communication
 */

export const EVALS_EVENT_SOURCE = 'urn:cortex:evals';

// Evaluation Started Event
export const EvaluationStartedEventSchema = z.object({
	evaluationId: z.string(),
	evaluationType: z.enum(['unit', 'integration', 'performance', 'security', 'manual']),
	targetComponent: z.string(),
	criteria: z.array(z.string()),
	startedAt: z.string(),
});

// Test Case Executed Event
export const TestCaseExecutedEventSchema = z.object({
	evaluationId: z.string(),
	testCaseId: z.string(),
	name: z.string(),
	status: z.enum(['passed', 'failed', 'skipped', 'error']),
	duration: z.number().int().nonnegative(),
	errorMessage: z.string().optional(),
	executedAt: z.string(),
});

// Benchmark Result Event
export const BenchmarkResultEventSchema = z.object({
	evaluationId: z.string(),
	benchmarkId: z.string(),
	metric: z.string(),
	value: z.number(),
	unit: z.string(),
	baseline: z.number().optional(),
	threshold: z.number().optional(),
	recordedAt: z.string(),
});

// Evaluation Completed Event
export const EvaluationCompletedEventSchema = z.object({
	evaluationId: z.string(),
	status: z.enum(['passed', 'failed', 'partial']),
	totalTests: z.number().int().nonnegative(),
	passedTests: z.number().int().nonnegative(),
	failedTests: z.number().int().nonnegative(),
	duration: z.number().int().nonnegative(),
	completedAt: z.string(),
});

// Export event type definitions
export type EvaluationStartedEvent = z.infer<typeof EvaluationStartedEventSchema>;
export type TestCaseExecutedEvent = z.infer<typeof TestCaseExecutedEventSchema>;
export type BenchmarkResultEvent = z.infer<typeof BenchmarkResultEventSchema>;
export type EvaluationCompletedEvent = z.infer<typeof EvaluationCompletedEventSchema>;

// Helper function to create evaluation events
export const createEvalsEvent = {
	started: (data: EvaluationStartedEvent) => ({
		type: 'evals.evaluation.started' as const,
		data: EvaluationStartedEventSchema.parse(data),
	}),
	testExecuted: (data: TestCaseExecutedEvent) => ({
		type: 'evals.test.executed' as const,
		data: TestCaseExecutedEventSchema.parse(data),
	}),
	benchmarkResult: (data: BenchmarkResultEvent) => ({
		type: 'evals.benchmark.result' as const,
		data: BenchmarkResultEventSchema.parse(data),
	}),
	completed: (data: EvaluationCompletedEvent) => ({
		type: 'evals.evaluation.completed' as const,
		data: EvaluationCompletedEventSchema.parse(data),
	}),
};
