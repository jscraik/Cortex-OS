import { z } from 'zod';

export const OrchestrationEventTypes = {
	TaskCreated: 'orchestration.task.created',
	TaskStarted: 'orchestration.task.started',
	TaskCompleted: 'orchestration.task.completed',
	TaskFailed: 'orchestration.task.failed',
	AgentAssigned: 'orchestration.agent.assigned',
	AgentFreed: 'orchestration.agent.freed',
	PlanCreated: 'orchestration.plan.created',
	PlanUpdated: 'orchestration.plan.updated',
	CoordinationStarted: 'orchestration.coordination.started',
	DecisionMade: 'orchestration.decision.made',
	ResourceAllocated: 'orchestration.resource.allocated',
	// nO Architecture Events
	AgentCoordinationStarted: 'agent_coordination_started',
	ScheduleAdjusted: 'schedule_adjusted',
	ToolLayerInvoked: 'tool_layer_invoked',
} as const;

export type OrchestrationEventType =
	(typeof OrchestrationEventTypes)[keyof typeof OrchestrationEventTypes];

export const taskCreatedEventSchema = z.object({
	taskId: z.string(),
	input: z.unknown(),
	metadata: z.record(z.unknown()).optional(),
});

export const taskStartedEventSchema = z.object({
	taskId: z.string(),
	agentId: z.string().optional(),
	attempt: z.number().int().positive().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const taskCompletedEventSchema = z.object({
	taskId: z.string(),
	result: z.unknown(),
	durationMs: z.number().nonnegative().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const taskFailedEventSchema = z.object({
	taskId: z.string(),
	error: z.string(),
	retryable: z.boolean().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const agentAssignedEventSchema = z.object({
	agentId: z.string(),
	taskId: z.string(),
	capabilities: z.array(z.string()).optional(),
});

export const agentFreedEventSchema = z.object({
	agentId: z.string(),
	taskId: z.string().optional(),
	reason: z.string().optional(),
});

export const planCreatedEventSchema = z.object({
	planId: z.string(),
	summary: z.string().optional(),
	steps: z.array(z.string()).optional(),
});

export const planUpdatedEventSchema = z.object({
	planId: z.string(),
	changes: z.array(z.string()).min(1),
});

export const coordinationStartedEventSchema = z.object({
	strategy: z.string(),
	runId: z.string(),
	participants: z.array(z.string()).optional(),
});

export const decisionMadeEventSchema = z.object({
	decisionId: z.string(),
	outcome: z.string(),
	confidence: z.number().min(0).max(1).optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const resourceAllocatedEventSchema = z.object({
	resourceId: z.string(),
	taskId: z.string(),
	amount: z.number().positive().optional(),
	unit: z.string().optional(),
});

// nO Architecture Event Schemas
export const agentCoordinationStartedEventSchema = z.object({
	type: z.literal('agent_coordination_started'),
	timestamp: z.string(),
	planId: z.string(),
	masterAgentId: z.string(),
	coordinatedAgents: z.array(z.object({
		agentId: z.string(),
		specialization: z.string(),
		assignedTasks: z.array(z.string()),
		priority: z.number().int().min(1).max(10),
	})),
	coordinationStrategy: z.enum(['parallel', 'sequential', 'hierarchical']),
	estimatedDuration: z.number().positive(),
	metadata: z.record(z.unknown()).optional(),
});

export const scheduleAdjustedEventSchema = z.object({
	type: z.literal('schedule_adjusted'),
	timestamp: z.string(),
	scheduleId: z.string(),
	planId: z.string(),
	adjustmentType: z.enum(['resource_reallocation', 'agent_reallocation', 'priority_adjustment', 'adaptive_optimization']),
	previousSchedule: z.object({
		totalAgents: z.number().int().positive(),
		estimatedCompletion: z.string(),
		resourceAllocation: z.object({
			memoryMB: z.number().positive(),
			cpuPercent: z.number().min(0).max(100),
		}),
	}),
	newSchedule: z.object({
		totalAgents: z.number().int().positive(),
		estimatedCompletion: z.string(),
		resourceAllocation: z.object({
			memoryMB: z.number().positive(),
			cpuPercent: z.number().min(0).max(100),
		}),
	}),
	adjustmentReason: z.string(),
	triggeringMetrics: z.object({
		currentLoad: z.number().min(0).max(1),
		averageResponseTime: z.number().positive(),
		errorRate: z.number().min(0).max(1),
	}),
	expectedImprovement: z.object({
		loadReduction: z.number().min(0).max(1),
		responseTimeImprovement: z.number().min(0).max(1),
		errorRateReduction: z.number().min(0).max(1),
	}),
});

export const toolLayerInvokedEventSchema = z.object({
	type: z.literal('tool_layer_invoked'),
	timestamp: z.string(),
	invocationId: z.string(),
	agentId: z.string(),
	toolLayer: z.enum(['intelligence', 'execution', 'coordination', 'observation']),
	toolsInvoked: z.array(z.object({
		toolName: z.string(),
		parameters: z.record(z.unknown()),
		estimatedDuration: z.number().positive(),
	})),
	invocationContext: z.object({
		taskId: z.string(),
		stepId: z.string().optional(),
		priority: z.enum(['low', 'medium', 'high', 'critical']),
	}),
	parallelExecution: z.boolean().optional().default(false),
	timeoutMs: z.number().positive().optional(),
	securityContext: z.object({
		permissionLevel: z.enum(['low', 'medium', 'high']),
		allowedDomains: z.array(z.string()).optional(),
		restrictedOperations: z.array(z.string()).optional(),
	}).optional(),
});

export type TaskCreatedEvent = z.infer<typeof taskCreatedEventSchema>;
export type TaskStartedEvent = z.infer<typeof taskStartedEventSchema>;
export type TaskCompletedEvent = z.infer<typeof taskCompletedEventSchema>;
export type TaskFailedEvent = z.infer<typeof taskFailedEventSchema>;
export type AgentAssignedEvent = z.infer<typeof agentAssignedEventSchema>;
export type AgentFreedEvent = z.infer<typeof agentFreedEventSchema>;
export type PlanCreatedEvent = z.infer<typeof planCreatedEventSchema>;
export type PlanUpdatedEvent = z.infer<typeof planUpdatedEventSchema>;
export type CoordinationStartedEvent = z.infer<typeof coordinationStartedEventSchema>;
export type DecisionMadeEvent = z.infer<typeof decisionMadeEventSchema>;
export type ResourceAllocatedEvent = z.infer<typeof resourceAllocatedEventSchema>;

// nO Architecture Event Types
export type AgentCoordinationStartedEvent = z.infer<typeof agentCoordinationStartedEventSchema>;
export type ScheduleAdjustedEvent = z.infer<typeof scheduleAdjustedEventSchema>;
export type ToolLayerInvokedEvent = z.infer<typeof toolLayerInvokedEventSchema>;

export const ORCHESTRATION_EVENT_SCHEMAS = {
	[OrchestrationEventTypes.TaskCreated]: taskCreatedEventSchema,
	[OrchestrationEventTypes.TaskStarted]: taskStartedEventSchema,
	[OrchestrationEventTypes.TaskCompleted]: taskCompletedEventSchema,
	[OrchestrationEventTypes.TaskFailed]: taskFailedEventSchema,
	[OrchestrationEventTypes.AgentAssigned]: agentAssignedEventSchema,
	[OrchestrationEventTypes.AgentFreed]: agentFreedEventSchema,
	[OrchestrationEventTypes.PlanCreated]: planCreatedEventSchema,
	[OrchestrationEventTypes.PlanUpdated]: planUpdatedEventSchema,
	[OrchestrationEventTypes.CoordinationStarted]: coordinationStartedEventSchema,
	[OrchestrationEventTypes.DecisionMade]: decisionMadeEventSchema,
	[OrchestrationEventTypes.ResourceAllocated]: resourceAllocatedEventSchema,
	// nO Architecture Event Schemas
	[OrchestrationEventTypes.AgentCoordinationStarted]: agentCoordinationStartedEventSchema,
	[OrchestrationEventTypes.ScheduleAdjusted]: scheduleAdjustedEventSchema,
	[OrchestrationEventTypes.ToolLayerInvoked]: toolLayerInvokedEventSchema,
} as const;
