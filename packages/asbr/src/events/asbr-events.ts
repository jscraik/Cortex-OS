import { z } from 'zod';

/**
 * ASBR-related A2A event schemas for inter-package communication
 */

// Review Created Event
export const ReviewCreatedEventSchema = z.object({
	reviewId: z.string(),
	repositoryUrl: z.string(),
	pullRequestId: z.string().optional(),
	scope: z.enum(['full', 'incremental', 'security-only']),
	reviewers: z.array(z.string()),
	createdAt: z.string(),
});

// Review Completed Event
export const ReviewCompletedEventSchema = z.object({
	reviewId: z.string(),
	status: z.enum(['approved', 'rejected', 'needs-changes']),
	findings: z.array(
		z.object({
			type: z.enum(['security', 'performance', 'style', 'bug']),
			severity: z.enum(['low', 'medium', 'high', 'critical']),
			message: z.string(),
			file: z.string().optional(),
			line: z.number().optional(),
		}),
	),
	completedAt: z.string(),
});

// Security Scan Executed Event
export const SecurityScanExecutedEventSchema = z.object({
	scanId: z.string(),
	targetPath: z.string(),
	scanType: z.enum(['sast', 'dependency', 'secrets', 'all']),
	findings: z.number().nonnegative(),
	criticalIssues: z.number().nonnegative(),
	executedAt: z.string(),
});

// Feedback Submitted Event
export const FeedbackSubmittedEventSchema = z.object({
	reviewId: z.string(),
	feedbackId: z.string(),
	type: z.enum(['approval', 'request-changes', 'comment']),
	submittedBy: z.string(),
	submittedAt: z.string(),
});

// Export event type definitions
export type ReviewCreatedEvent = z.infer<typeof ReviewCreatedEventSchema>;
export type ReviewCompletedEvent = z.infer<typeof ReviewCompletedEventSchema>;
export type SecurityScanExecutedEvent = z.infer<
	typeof SecurityScanExecutedEventSchema
>;
export type FeedbackSubmittedEvent = z.infer<
	typeof FeedbackSubmittedEventSchema
>;

// Helper function to create ASBR events
export const createASBREvent = {
	reviewCreated: (data: ReviewCreatedEvent) => ({
		type: 'asbr.review.created' as const,
		data: ReviewCreatedEventSchema.parse(data),
	}),
	reviewCompleted: (data: ReviewCompletedEvent) => ({
		type: 'asbr.review.completed' as const,
		data: ReviewCompletedEventSchema.parse(data),
	}),
	securityScanExecuted: (data: SecurityScanExecutedEvent) => ({
		type: 'asbr.security.scan_executed' as const,
		data: SecurityScanExecutedEventSchema.parse(data),
	}),
	feedbackSubmitted: (data: FeedbackSubmittedEvent) => ({
		type: 'asbr.feedback.submitted' as const,
		data: FeedbackSubmittedEventSchema.parse(data),
	}),
};
