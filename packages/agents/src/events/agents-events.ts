import { z } from 'zod';

/**
 * Agents-related A2A event schemas for inter-package communication
 */

export const AGENTS_EVENT_SOURCE = 'urn:cortex:agents';

// Agent Created Event
export const AgentCreatedEventSchema = z.object({
	agentId: z.string(),
	agentType: z.string(),
	capabilities: z.array(z.string()),
	configuration: z.record(z.unknown()),
	createdBy: z.string().optional(),
	createdAt: z.string(),
});

// Agent Task Started Event
export const AgentTaskStartedEventSchema = z.object({
	taskId: z.string(),
	agentId: z.string(),
	taskType: z.string(),
	description: z.string(),
	priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
	estimatedDuration: z.number().optional(),
	startedAt: z.string(),
});

// Agent Task Completed Event
export const AgentTaskCompletedEventSchema = z.object({
	taskId: z.string(),
	agentId: z.string(),
	taskType: z.string(),
	status: z.enum(['success', 'failed', 'cancelled']),
	durationMs: z.number(),
	result: z.record(z.unknown()).optional(),
	errorMessage: z.string().optional(),
	completedAt: z.string(),
});

// Agent Communication Event
export const AgentCommunicationEventSchema = z.object({
	communicationId: z.string(),
	fromAgent: z.string(),
	toAgent: z.string(),
	messageType: z.string(),
	content: z.record(z.unknown()),
	correlationId: z.string().optional(),
	timestamp: z.string(),
});

// Export event type definitions
export type AgentCreatedEvent = z.infer<typeof AgentCreatedEventSchema>;
export type AgentTaskStartedEvent = z.infer<typeof AgentTaskStartedEventSchema>;
export type AgentTaskCompletedEvent = z.infer<typeof AgentTaskCompletedEventSchema>;
export type AgentCommunicationEvent = z.infer<typeof AgentCommunicationEventSchema>;

// Helper object to create agent events
export const createAgentEvent = {
	created: (data: AgentCreatedEvent) => ({
		type: 'agents.agent.created' as const,
		data: AgentCreatedEventSchema.parse(data),
	}),
	taskStarted: (data: AgentTaskStartedEvent) => ({
		type: 'agents.task.started' as const,
		data: AgentTaskStartedEventSchema.parse(data),
	}),
	taskCompleted: (data: AgentTaskCompletedEvent) => ({
		type: 'agents.task.completed' as const,
		data: AgentTaskCompletedEventSchema.parse(data),
	}),
	communication: (data: AgentCommunicationEvent) => ({
		type: 'agents.communication.sent' as const,
		data: AgentCommunicationEventSchema.parse(data),
	}),
};
