/**
 * Architecture contracts for nO Master Agent Loop + Subagents integration
 *
 * Defines the core interfaces and types for the enhanced agent system
 * combining sophisticated coordination with disk-defined subagents.
 */

import { z } from 'zod';

// === Core Types ===

export type AgentId = string;
export type TaskId = string;
export type ToolName = string;
export type AgentModel = 'inherit' | 'sonnet' | 'opus' | 'haiku' | string;

// === Execution Request ===

export const ExecutionRequestSchema = z.object({
	id: z.string().optional(),
	task: z.string(),
	context: z.record(z.unknown()).optional(),
	priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
	budget: z
		.object({
			tokens: z.number().int().positive().optional(),
			ms: z.number().int().positive().optional(),
		})
		.optional(),
	requireSubagents: z.boolean().default(false),
	preferredSubagents: z.array(z.string()).optional(),
	autoDelegate: z.boolean().default(false),
	metadata: z.record(z.unknown()).optional(),
});

export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

// === Execution Plan ===

export const ExecutionPlanSchema = z.object({
	id: z.string(),
	requestId: z.string(),
	strategy: z.enum(['sequential', 'parallel', 'adaptive', 'coordinated']),
	steps: z.array(
		z.object({
			id: z.string(),
			type: z.enum(['subagent', 'tool', 'wait', 'condition']),
			target: z.string(),
			input: z.record(z.unknown()),
			dependencies: z.array(z.string()).default([]),
			estimatedDuration: z.number().int().optional(),
		}),
	),
	estimatedResources: z.object({
		tokens: z.number().int(),
		ms: z.number().int(),
		agents: z.number().int(),
	}),
	createdAt: z.string(),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// === Execution Result ===

export const ExecutionResultSchema = z.object({
	requestId: z.string(),
	success: z.boolean(),
	output: z.string(),
	artifacts: z.record(z.unknown()).optional(),
	subagentsUsed: z
		.array(
			z.object({
				name: z.string(),
				executionTime: z.number(),
				tokensUsed: z.number(),
				success: z.boolean(),
			}),
		)
		.optional(),
	metrics: z.object({
		totalTokens: z.number().int(),
		totalTime: z.number(),
		stepsCompleted: z.number().int(),
		stepsTotal: z.number().int(),
	}),
	error: z.string().optional(),
	traceId: z.string().optional(),
	completedAt: z.string(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// === Subagent Configuration ===

export const SubagentConfigSchema = z.object({
	name: z.string(), // kebab-case
	description: z.string(),
	tools: z.array(z.string()).optional(), // undefined = inherit all
	model: z.custom<AgentModel>().optional(), // undefined/'inherit' = parent model
	systemPrompt: z.string(),
	scope: z.enum(['project', 'user']),
	path: z.string(),
	capabilities: z.array(z.string()).default([]),
	maxConcurrency: z.number().int().positive().default(1),
	timeout: z.number().int().positive().default(30000), // 30s
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().int().positive().optional(),
});

export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;

// === Subagent Run Context ===

export const SubagentRunInputSchema = z.object({
	task: z.string(),
	context: z.record(z.unknown()).optional(),
	budget: z
		.object({
			tokens: z.number().int().positive().optional(),
			ms: z.number().int().positive().optional(),
		})
		.optional(),
	depth: z.number().int().min(0).default(0),
	caller: z.string().optional(),
	traceId: z.string().optional(),
});

export type SubagentRunInput = z.infer<typeof SubagentRunInputSchema>;

export const SubagentRunResultSchema = z.object({
	output: z.string(),
	artifacts: z.record(z.unknown()).optional(),
	metrics: z
		.object({
			tokensUsed: z.number().int(),
			executionTime: z.number(),
		})
		.optional(),
	error: z.string().optional(),
	traceId: z.string().optional(),
});

export type SubagentRunResult = z.infer<typeof SubagentRunResultSchema>;

// === Master Agent Loop Interface ===

export interface MasterAgentLoop {
	/**
	 * Initialize the master agent loop and all subsystems
	 */
	initialize(): Promise<void>;

	/**
	 * Coordinate execution of a request
	 */
	coordinate(request: ExecutionRequest): Promise<ExecutionResult>;

	/**
	 * Get the subagent manager for direct subagent operations
	 */
	getSubagentManager(): SubagentManager;

	/**
	 * Adapt strategy based on execution feedback
	 */
	adaptStrategy(feedback: ExecutionFeedback): Promise<void>;

	/**
	 * Get current system status and health
	 */
	getStatus(): Promise<SystemStatus>;

	/**
	 * Shutdown gracefully
	 */
	shutdown(): Promise<void>;
}

// === Subagent Manager Interface ===

export interface SubagentManager {
	/**
	 * Load all subagents from disk (project + user scope)
	 */
	loadSubagents(): Promise<Map<string, Subagent>>;

	/**
	 * Create a new subagent from configuration
	 */
	createSubagent(config: SubagentConfig): Promise<Subagent>;

	/**
	 * Execute a task on a specific subagent
	 */
	executeSubagent(agentName: string, input: SubagentRunInput): Promise<SubagentRunResult>;

	/**
	 * Delegate task to appropriate subagent(s)
	 */
	delegateTask(
		task: Task,
		options?: {
			target?: string;
			autoSelect?: boolean;
			k?: number; // for auto-selection
		},
	): Promise<SubagentRunResult[]>;

	/**
	 * Get list of available subagents
	 */
	listSubagents(): SubagentConfig[];

	/**
	 * Get subagent health status
	 */
	getSubagentHealth(agentName: string): Promise<HealthStatus>;
}

// === Intelligence Scheduler Interface ===

export interface IntelligenceScheduler {
	/**
	 * Create execution plan from request
	 */
	planExecution(request: ExecutionRequest): Promise<ExecutionPlan>;

	/**
	 * Schedule agents for execution plan
	 */
	scheduleAgents(plan: ExecutionPlan): Promise<AgentSchedule>;

	/**
	 * Adapt strategy based on execution feedback
	 */
	adaptStrategy(feedback: ExecutionFeedback): Promise<StrategyAdjustment>;

	/**
	 * Monitor execution progress
	 */
	monitorExecution(schedule: AgentSchedule): Promise<ExecutionStatus>;
}

// === Supporting Types ===

export const TaskSchema = z.object({
	id: z.string(),
	description: z.string(),
	type: z.string(),
	input: z.record(z.unknown()),
	requirements: z.array(z.string()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const ExecutionFeedbackSchema = z.object({
	planId: z.string(),
	success: z.boolean(),
	actualDuration: z.number(),
	actualTokens: z.number(),
	errors: z.array(z.string()).default([]),
	agentPerformance: z
		.array(
			z.object({
				agentName: z.string(),
				executionTime: z.number(),
				tokensUsed: z.number(),
				success: z.boolean(),
			}),
		)
		.default([]),
	timestamp: z.string(),
});

export type ExecutionFeedback = z.infer<typeof ExecutionFeedbackSchema>;

export const StrategyAdjustmentSchema = z.object({
	planId: z.string(),
	oldStrategy: z.string(),
	newStrategy: z.string(),
	reason: z.string(),
	confidence: z.number().min(0).max(1),
	parameters: z.record(z.unknown()).optional(),
});

export type StrategyAdjustment = z.infer<typeof StrategyAdjustmentSchema>;

export const AgentScheduleSchema = z.object({
	planId: z.string(),
	agentAssignments: z.array(
		z.object({
			agentName: z.string(),
			stepIds: z.array(z.string()),
			startTime: z.string(),
			estimatedDuration: z.number(),
		}),
	),
	resourceAllocation: z.object({
		totalTokens: z.number(),
		totalMs: z.number(),
		concurrentAgents: z.number(),
	}),
});

export type AgentSchedule = z.infer<typeof AgentScheduleSchema>;

export const ExecutionStatusSchema = z.object({
	planId: z.string(),
	status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
	progress: z.number().min(0).max(1),
	activeAgents: z.array(z.string()),
	completedSteps: z.array(z.string()),
	failedSteps: z.array(z.string()),
	currentMetrics: z.object({
		tokensUsed: z.number(),
		timeElapsed: z.number(),
	}),
});

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const SystemStatusSchema = z.object({
	healthy: z.boolean(),
	subagentsLoaded: z.number(),
	activeTasks: z.number(),
	totalTasksCompleted: z.number(),
	averageResponseTime: z.number(),
	uptime: z.number(),
	lastAdaptation: z.string().optional(),
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;

export const HealthStatusSchema = z.object({
	healthy: z.boolean(),
	lastCheck: z.string(),
	responseTime: z.number(),
	errorRate: z.number().min(0).max(1),
	consecutiveFailures: z.number().int().min(0),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// === Subagent Interface ===

export interface Subagent {
	/**
	 * Subagent configuration
	 */
	config: SubagentConfig;

	/**
	 * Execute a task with isolated context
	 */
	execute(input: SubagentRunInput): Promise<SubagentRunResult>;

	/**
	 * Initialize the subagent
	 */
	initialize(): Promise<void>;

	/**
	 * Cleanup resources
	 */
	cleanup(): Promise<void>;

	/**
	 * Get current health status
	 */
	getHealth(): Promise<HealthStatus>;

	/**
	 * Get available tools (filtered by configuration)
	 */
	getAvailableTools(): string[];
}

// === Tool Layer Types ===

export enum ToolLayer {
	DASHBOARD = 'dashboard',
	EXECUTION = 'execution',
	PRIMITIVE = 'primitive',
}

export const ToolCapabilitySchema = z.object({
	name: z.string(),
	layer: z.nativeEnum(ToolLayer),
	description: z.string(),
	schema: z.any(), // Zod schema
	requiresAuth: z.boolean().default(false),
	rateLimit: z
		.object({
			requests: z.number().int(),
			window: z.enum(['second', 'minute', 'hour']),
		})
		.optional(),
});

export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;

export const ToolResultSchema = z.object({
	success: z.boolean(),
	output: z.unknown(),
	artifacts: z.record(z.unknown()).optional(),
	executionTime: z.number(),
	error: z.string().optional(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// === Network Communication Types ===

export const AgentMessageSchema = z.object({
	id: z.string(),
	from: z.string(),
	to: z.string(),
	type: z.enum(['request', 'response', 'notification', 'broadcast']),
	content: z.string(),
	data: z.record(z.unknown()).optional(),
	timestamp: z.string(),
	requiresAck: z.boolean().default(false),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const AgentCapabilitiesSchema = z.object({
	name: z.string(),
	capabilities: z.array(z.string()),
	tools: z.array(z.string()),
	maxConcurrency: z.number().int().positive(),
	health: HealthStatusSchema,
	lastSeen: z.string(),
});

export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

// === Learning System Types ===

export const ExecutionOutcomeSchema = z.object({
	planId: z.string(),
	success: z.boolean(),
	strategy: z.string(),
	duration: z.number(),
	tokens: z.number(),
	agentCount: z.number(),
	complexity: z.number().min(1).max(10),
	errorType: z.string().optional(),
	timestamp: z.string(),
});

export type ExecutionOutcome = z.infer<typeof ExecutionOutcomeSchema>;

export const AgentPerformanceProfileSchema = z.object({
	agentName: z.string(),
	taskTypes: z.array(z.string()),
	averageResponseTime: z.number(),
	successRate: z.number().min(0).max(1),
	preferredComplexity: z.object({
		min: z.number().min(1).max(10),
		max: z.number().min(1).max(10),
	}),
	lastUpdated: z.string(),
});

export type AgentPerformanceProfile = z.infer<typeof AgentPerformanceProfileSchema>;

// === Error Types ===

export class AgentError extends Error {
	constructor(
		message: string,
		public agentId?: string,
		public code?: string,
		public recoverable = false,
	) {
		super(message);
		this.name = 'AgentError';
	}
}

export class SubagentError extends Error {
	constructor(
		message: string,
		public subagentName: string,
		public code?: string,
	) {
		super(message);
		this.name = 'SubagentError';
	}
}

export class ResourceLimitError extends Error {
	constructor(
		message: string,
		public resource: string,
		public limit: number,
		public requested: number,
	) {
		super(message);
		this.name = 'ResourceLimitError';
	}
}

// === Event Types ===

export const SubagentEventSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('subagent_loaded'),
		subagentName: z.string(),
		config: SubagentConfigSchema,
		timestamp: z.string(),
	}),
	z.object({
		type: z.literal('subagent_task_started'),
		subagentName: z.string(),
		taskId: z.string(),
		input: SubagentRunInputSchema,
		timestamp: z.string(),
	}),
	z.object({
		type: z.literal('subagent_task_completed'),
		subagentName: z.string(),
		taskId: z.string(),
		result: SubagentRunResultSchema,
		duration: z.number(),
		timestamp: z.string(),
	}),
	z.object({
		type: z.literal('subagent_health_changed'),
		subagentName: z.string(),
		oldStatus: HealthStatusSchema,
		newStatus: HealthStatusSchema,
		timestamp: z.string(),
	}),
	z.object({
		type: z.literal('master_loop_adapted'),
		planId: z.string(),
		adjustment: StrategyAdjustmentSchema,
		timestamp: z.string(),
	}),
]);

export type SubagentEvent = z.infer<typeof SubagentEventSchema>;

// Export all schemas for validation
export const Schemas = {
	ExecutionRequest: ExecutionRequestSchema,
	ExecutionPlan: ExecutionPlanSchema,
	ExecutionResult: ExecutionResultSchema,
	SubagentConfig: SubagentConfigSchema,
	SubagentRunInput: SubagentRunInputSchema,
	SubagentRunResult: SubagentRunResultSchema,
	Task: TaskSchema,
	ExecutionFeedback: ExecutionFeedbackSchema,
	StrategyAdjustment: StrategyAdjustmentSchema,
	AgentSchedule: AgentScheduleSchema,
	ExecutionStatus: ExecutionStatusSchema,
	SystemStatus: SystemStatusSchema,
	HealthStatus: HealthStatusSchema,
	ToolCapability: ToolCapabilitySchema,
	ToolResult: ToolResultSchema,
	AgentMessage: AgentMessageSchema,
	AgentCapabilities: AgentCapabilitiesSchema,
	ExecutionOutcome: ExecutionOutcomeSchema,
	AgentPerformanceProfile: AgentPerformanceProfileSchema,
	SubagentEvent: SubagentEventSchema,
} as const;
