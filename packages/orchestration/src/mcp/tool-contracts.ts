import { z } from 'zod';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';
import { ToolErrorCode, ToolValidationError } from './tool-errors.js';

// Schemas (moved from tools.ts for separation of concerns)
export const PlanWorkflowInputSchema = z.object({
	workflowName: z.string().min(1).max(180),
	goal: z.string().min(1).max(4096),
	preferredStrategy: z.nativeEnum(OrchestrationStrategy).optional(),
	context: z.record(z.unknown()).optional(),
	tasks: z
		.array(
			z.object({
				title: z.string().min(1).max(160),
				summary: z.string().min(1).max(1024),
				requiredCapabilities: z.array(z.string().min(1).max(120)).max(64),
				dependencies: z.array(z.string().min(1).max(128)).max(32),
				estimatedDurationMinutes: z.number().int().positive().max(1440).optional(),
			}),
		)
		.min(1)
		.max(50),
});

export const PlanWorkflowResultSchema = z.object({
	planId: z.string().uuid(),
	workflowName: z.string().min(1).max(180),
	recommendedStrategy: z.nativeEnum(OrchestrationStrategy),
	phases: z
		.array(
			z.object({
				id: z.string().min(1).max(64),
				name: z.string().min(1).max(160),
				objective: z.string().min(1).max(1024),
				dependencies: z.array(z.string().min(1).max(64)).max(32),
				tasks: z
					.array(
						z.object({
							id: z.string().min(1).max(128),
							title: z.string().min(1).max(160),
							status: z.nativeEnum(TaskStatus),
							requiredCapabilities: z.array(z.string().min(1).max(120)).max(64),
							estimatedDurationMinutes: z.number().int().positive().max(1440).optional(),
						}),
					)
					.min(1),
			}),
		)
		.min(1),
	estimatedDurationMinutes: z.number().int().positive().max(43200),
	confidence: z.number().min(0).max(1),
	createdAt: z.string().datetime(),
});

export const UpdateTaskStatusInputSchema = z.object({
	taskId: z.string().min(1).max(128),
	status: z.nativeEnum(TaskStatus),
	progress: z
		.object({
			percentage: z.number().int().min(0).max(100),
			message: z.string().max(512).optional(),
		})
		.optional(),
	audit: z
		.object({
			actor: z.string().min(1).max(160),
			reason: z.string().max(512).optional(),
		})
		.optional(),
});

export const UpdateTaskStatusResultSchema = z.object({
	taskId: z.string().min(1).max(128),
	status: z.nativeEnum(TaskStatus),
	updatedAt: z.string().datetime(),
	progress: z
		.object({
			percentage: z.number().int().min(0).max(100),
			message: z.string().max(512).optional(),
		})
		.optional(),
});

export const GetProcessStatusInputSchema = z.object({
	workflowId: z.string().uuid(),
	includeTimeline: z.boolean().optional(),
	includeMetrics: z.boolean().optional(),
});

export const GetProcessStatusResultSchema = z.object({
	workflowId: z.string().uuid(),
	status: z.nativeEnum(TaskStatus),
	lastUpdated: z.string().datetime(),
	metrics: z
		.object({
			progress: z.number().min(0).max(1),
			riskLevel: z.enum(['low', 'medium', 'high']),
			estimatedMinutesRemaining: z.number().int().nonnegative(),
		})
		.optional(),
	activeTasks: z
		.array(
			z.object({
				id: z.string().min(1).max(128),
				title: z.string().min(1).max(160),
				status: z.nativeEnum(TaskStatus),
				assigned: z.object({
					agentId: z.string().min(1).max(128),
					role: z.nativeEnum(AgentRole),
				}),
				startedAt: z.string().datetime(),
			}),
		)
		.max(100),
	timeline: z
		.array(
			z.object({
				timestamp: z.string().datetime(),
				event: z.string().min(1).max(120),
				detail: z.string().max(512),
			}),
		)
		.max(1000)
		.optional(),
});

// Tool contract interface and builder
export interface ToolContract {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	resultSchema: z.ZodTypeAny;
	validateInput: (input: unknown) => unknown;
	errors: Record<ToolErrorCode, string>;
}

function createToolContract(
	name: string,
	description: string,
	inputSchema: z.ZodTypeAny,
	resultSchema: z.ZodTypeAny,
): ToolContract {
	return {
		name,
		description,
		inputSchema,
		resultSchema,
		validateInput: (input: unknown) => {
			try {
				return inputSchema.parse(input);
			} catch (error) {
				if (error instanceof z.ZodError) {
					throw new ToolValidationError(
						`Invalid input: ${error.errors.map((e) => e.message).join(', ')}`,
					);
				}
				throw error;
			}
		},
		errors: {
			[ToolErrorCode.TASK_NOT_FOUND]: 'The specified task was not found',
			[ToolErrorCode.WORKFLOW_NOT_FOUND]: 'The specified workflow was not found',
			[ToolErrorCode.INVALID_INPUT]: 'The input provided is invalid',
			[ToolErrorCode.PERMISSION_DENIED]: 'Permission denied to perform this operation',
			[ToolErrorCode.RATE_LIMITED]: 'Rate limit exceeded, please try again later',
			[ToolErrorCode.INTERNAL_ERROR]: 'An internal error occurred while processing the request',
		},
	};
}

export const workflowOrchestrationTools = [
	createToolContract(
		'workflow.plan',
		'Create a workflow plan for multi-agent orchestration',
		PlanWorkflowInputSchema,
		PlanWorkflowResultSchema,
	),
];

export const taskManagementTools = [
	createToolContract(
		'task.update_status',
		'Update the status of a task in the orchestration system',
		UpdateTaskStatusInputSchema,
		UpdateTaskStatusResultSchema,
	),
];

export const processMonitoringTools = [
	createToolContract(
		'process.get_status',
		'Get the current status of a workflow process',
		GetProcessStatusInputSchema,
		GetProcessStatusResultSchema,
	),
];

export const orchestrationToolContracts = [
	...workflowOrchestrationTools,
	...taskManagementTools,
	...processMonitoringTools,
];
