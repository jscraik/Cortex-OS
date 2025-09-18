import { z } from 'zod';

/**
 * MVP (Minimum Viable Product) A2A event schemas for inter-package communication
 */

// Feature Activated Event
export const FeatureActivatedEventSchema = z.object({
	featureId: z.string(),
	name: z.string(),
	version: z.string(),
	userId: z.string().optional(),
	environment: z.enum(['development', 'staging', 'production']),
	activatedAt: z.string(),
});

// User Action Event
export const UserActionEventSchema = z.object({
	actionId: z.string(),
	userId: z.string(),
	action: z.string(),
	feature: z.string(),
	metadata: z.record(z.any()).optional(),
	sessionId: z.string().optional(),
	performedAt: z.string(),
});

// Feedback Submitted Event
export const FeedbackSubmittedEventSchema = z.object({
	feedbackId: z.string(),
	userId: z.string().optional(),
	feature: z.string(),
	type: z.enum(['bug', 'feature_request', 'improvement', 'praise']),
	rating: z.number().int().min(1).max(5).optional(),
	comment: z.string().optional(),
	submittedAt: z.string(),
});

// Metric Tracked Event
export const MetricTrackedEventSchema = z.object({
	metricId: z.string(),
	name: z.string(),
	value: z.number(),
	unit: z.string().optional(),
	tags: z.record(z.string()).optional(),
	userId: z.string().optional(),
	trackedAt: z.string(),
});

// Export event type definitions
export type FeatureActivatedEvent = z.infer<typeof FeatureActivatedEventSchema>;
export type UserActionEvent = z.infer<typeof UserActionEventSchema>;
export type FeedbackSubmittedEvent = z.infer<typeof FeedbackSubmittedEventSchema>;
export type MetricTrackedEvent = z.infer<typeof MetricTrackedEventSchema>;

// Helper function to create MVP events
export const createMvpEvent = {
	featureActivated: (data: FeatureActivatedEvent) => ({
		type: 'mvp.feature.activated' as const,
		data: FeatureActivatedEventSchema.parse(data),
	}),
	userAction: (data: UserActionEvent) => ({
		type: 'mvp.user.action' as const,
		data: UserActionEventSchema.parse(data),
	}),
	feedbackSubmitted: (data: FeedbackSubmittedEvent) => ({
		type: 'mvp.feedback.submitted' as const,
		data: FeedbackSubmittedEventSchema.parse(data),
	}),
	metricTracked: (data: MetricTrackedEvent) => ({
		type: 'mvp.metric.tracked' as const,
		data: MetricTrackedEventSchema.parse(data),
	}),
};
