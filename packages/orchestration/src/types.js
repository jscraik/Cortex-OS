/**
 * Core types and interfaces for the Orchestration Engine
 * Defines the fundamental data structures for task planning, execution, and coordination
 */
import { z } from 'zod';
// ================================
// Core Enums
// ================================
export var TaskStatus;
((TaskStatus) => {
	TaskStatus['PENDING'] = 'pending';
	TaskStatus['PLANNING'] = 'planning';
	TaskStatus['EXECUTING'] = 'executing';
	TaskStatus['COMPLETED'] = 'completed';
	TaskStatus['FAILED'] = 'failed';
	TaskStatus['CANCELLED'] = 'cancelled';
	TaskStatus['PAUSED'] = 'paused';
})(TaskStatus || (TaskStatus = {}));
export var OrchestrationStrategy;
((OrchestrationStrategy) => {
	OrchestrationStrategy['SEQUENTIAL'] = 'sequential';
	OrchestrationStrategy['PARALLEL'] = 'parallel';
	OrchestrationStrategy['ADAPTIVE'] = 'adaptive';
	OrchestrationStrategy['HIERARCHICAL'] = 'hierarchical';
	OrchestrationStrategy['REACTIVE'] = 'reactive';
})(OrchestrationStrategy || (OrchestrationStrategy = {}));
export var AgentRole;
((AgentRole) => {
	AgentRole['PLANNER'] = 'planner';
	AgentRole['EXECUTOR'] = 'executor';
	AgentRole['COORDINATOR'] = 'coordinator';
	AgentRole['VALIDATOR'] = 'validator';
	AgentRole['MONITOR'] = 'monitor';
	AgentRole['SPECIALIST'] = 'specialist';
	AgentRole['WORKER'] = 'worker';
})(AgentRole || (AgentRole = {}));
// ================================
// Zod Schemas for Runtime Validation
// ================================
export const TaskSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1),
	description: z.string(),
	status: z.nativeEnum(TaskStatus),
	priority: z.number().min(1).max(10),
	dependencies: z.array(z.string().uuid()).default([]),
	requiredCapabilities: z.array(z.string()).default([]),
	context: z.record(z.unknown()).default({}),
	metadata: z.record(z.unknown()).default({}),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
	completedAt: z.date().optional(),
	estimatedDuration: z.number().optional(),
	actualDuration: z.number().optional(),
});
export const ExecutionPlanSchema = z
	.object({
		id: z.string().uuid(),
		taskId: z.string().uuid(),
		strategy: z.nativeEnum(OrchestrationStrategy),
		phases: z.array(z.string()),
		dependencies: z.record(z.array(z.string())),
		estimatedDuration: z.number(),
		resourceRequirements: z.object({
			minAgents: z.number().min(1),
			maxAgents: z.number().min(1),
			requiredCapabilities: z.array(z.string()),
			memoryRequirement: z.number().optional(),
			computeRequirement: z.number().optional(),
		}),
		checkpoints: z.array(
			z.object({
				phase: z.string(),
				criteria: z.array(z.string()),
				validation: z.string(),
			}),
		),
		createdAt: z.date(),
		updatedAt: z.date().optional(),
	})
	.strict();
export var PlanningPhase;
((PlanningPhase) => {
	PlanningPhase['INITIALIZATION'] = 'initialization';
	PlanningPhase['ANALYSIS'] = 'analysis';
	PlanningPhase['STRATEGY'] = 'strategy';
	PlanningPhase['EXECUTION'] = 'execution';
	PlanningPhase['VALIDATION'] = 'validation';
	PlanningPhase['COMPLETION'] = 'completion';
})(PlanningPhase || (PlanningPhase = {}));
export var AgentCapability;
((AgentCapability) => {
	AgentCapability['TASK_PLANNING'] = 'task_planning';
	AgentCapability['RESOURCE_OPTIMIZATION'] = 'resource_optimization';
	AgentCapability['RISK_ASSESSMENT'] = 'risk_assessment';
	AgentCapability['CODE_GENERATION'] = 'code_generation';
	AgentCapability['TESTING'] = 'testing';
	AgentCapability['DEPLOYMENT'] = 'deployment';
	AgentCapability['MONITORING'] = 'monitoring';
	AgentCapability['COMMUNICATION'] = 'communication';
	AgentCapability['LEARNING'] = 'learning';
	AgentCapability['DECISION_MAKING'] = 'decision_making';
})(AgentCapability || (AgentCapability = {}));
// Orchestration statistics removed (legacy, unused)
export const Schemas = {
	Task: TaskSchema,
	ExecutionPlan: ExecutionPlanSchema,
};
//# sourceMappingURL=types.js.map
