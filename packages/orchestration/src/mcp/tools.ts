/**
 * MCP tool contract definitions for the orchestration package.
 *
 * These contracts provide a typed interface for agents to interact with
 * orchestration workflows, task coordination, and process monitoring via the
 * Model Context Protocol. Each tool exposes Zod schemas for input/output
 * validation, enumerates error formats, and performs runtime validation before
 * execution handlers are attached in follow-on tasks.
 */

import { OrchestrationError } from '../errors.js';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';
import { z, ZodError, type ZodIssue, type ZodTypeAny } from 'zod';

const MAX_ERROR_DETAILS = 10;
const MAX_ERROR_DETAIL_LENGTH = 500;

export enum ToolErrorCode {
        VALIDATION_ERROR = 'validation_error',
        WORKFLOW_NOT_FOUND = 'workflow_not_found',
        TASK_NOT_FOUND = 'task_not_found',
        TASK_CONFLICT = 'task_conflict',
        MONITORING_UNAVAILABLE = 'monitoring_unavailable',
        INTERNAL_ERROR = 'internal_error',
}

export const toolErrorResponseSchema = z
        .object({
                code: z.nativeEnum(ToolErrorCode),
                message: z.string().min(1).max(2_000),
                details: z
                        .array(z.string().min(1).max(MAX_ERROR_DETAIL_LENGTH))
                        .max(MAX_ERROR_DETAILS)
                        .default([]),
                retryable: z.boolean().default(false),
                timestamp: z.string().datetime().default(() => new Date().toISOString()),
        })
        .strict();

export type ToolErrorResponse = z.infer<typeof toolErrorResponseSchema>;

export class ToolValidationError extends OrchestrationError {
        constructor(public readonly response: ToolErrorResponse) {
                super(response.code, response.message);
                this.name = 'ToolValidationError';
        }
}

type ToolCategory = 'workflow' | 'task' | 'monitoring';

interface ToolErrorMetadata {
        description: string;
        retryable: boolean;
}

export interface ToolContract<I extends ZodTypeAny, O extends ZodTypeAny> {
        name: string;
        summary: string;
        description: string;
        category: ToolCategory;
        inputSchema: I;
        resultSchema: O;
        errors: Partial<Record<ToolErrorCode, ToolErrorMetadata>>;
        validateInput(input: unknown): z.infer<I>;
}

function mapZodIssues(issues: ZodIssue[]): string[] {
        return issues.map((issue) => {
                const path = issue.path.length > 0 ? issue.path.join('.') : 'input';
                return `${path}: ${issue.message}`;
        });
}

export function createToolErrorResponse(
        code: ToolErrorCode,
        message: string,
        options: { details?: string[]; retryable?: boolean; timestamp?: string } = {},
): ToolErrorResponse {
        const sanitizedDetails: string[] = [];
        const details = options.details ?? [];
        for (let i = 0; i < details.length && sanitizedDetails.length < MAX_ERROR_DETAILS; i++) {
            const trimmed = details[i].trim();
            if (trimmed.length > 0) {
                sanitizedDetails.push(trimmed);
            }
        }

        return toolErrorResponseSchema.parse({
                code,
                message,
                details: sanitizedDetails,
                retryable: options.retryable ?? false,
                timestamp: options.timestamp ?? new Date().toISOString(),
        });
}

function createToolContract<I extends ZodTypeAny, O extends ZodTypeAny>(
        config: Omit<ToolContract<I, O>, 'validateInput'>,
): ToolContract<I, O> {
        return {
                ...config,
                validateInput(input: unknown): z.infer<I> {
                        try {
                                return config.inputSchema.parse(input);
                        } catch (error) {
                                if (error instanceof ZodError) {
                                        throw new ToolValidationError(
                                                createToolErrorResponse(
                                                        ToolErrorCode.VALIDATION_ERROR,
                                                        `Invalid input for ${config.name}`,
                                                        { details: mapZodIssues(error.issues) },
                                                ),
                                        );
                                }
                                throw error;
                        }
                },
        };
}

// ---------------------------------------------------------------------------
// Workflow orchestration tool schemas
// ---------------------------------------------------------------------------

const workflowTaskInputSchema = z
        .object({
                title: z.string().min(3).max(120),
                summary: z.string().min(10).max(2_000),
                requiredCapabilities: z.array(z.string().min(2).max(120)).max(10).default([]),
                dependencies: z.array(z.string().min(1).max(120)).max(10).default([]),
                estimatedDurationMinutes: z.number().int().positive().max(10_080).optional(),
        })
        .strict();

const planWorkflowInputSchema = z
        .object({
                workflowName: z.string().min(3).max(120),
                goal: z.string().min(10).max(2_000),
                preferredStrategy: z
                        .nativeEnum(OrchestrationStrategy)
                        .default(OrchestrationStrategy.ADAPTIVE),
                context: z
                        .object({
                                domain: z.string().min(2).max(120).optional(),
                                constraints: z.array(z.string().min(1).max(160)).max(10).optional(),
                                metadata: z.record(z.unknown()).optional(),
                        })
                        .default({}),
                tasks: z.array(workflowTaskInputSchema).min(1).max(50),
        })
        .strict();

const planWorkflowResultSchema = z
        .object({
                planId: z.string().uuid(),
                workflowName: z.string().min(1),
                recommendedStrategy: z.nativeEnum(OrchestrationStrategy),
                phases: z
                        .array(
                                z
                                        .object({
                                                id: z.string().min(1),
                                                name: z.string().min(1),
                                                objective: z.string().min(1),
                                                dependencies: z
                                                        .array(z.string().min(1))
                                                        .max(10)
                                                        .default([]),
                                                tasks: z
                                                        .array(
                                                                z
                                                                        .object({
                                                                                id: z.string().min(1),
                                                                                title: z.string().min(1),
                                                                                status: z.nativeEnum(TaskStatus),
                                                                                requiredCapabilities: z
                                                                                        .array(z.string().min(1))
                                                                                        .max(10)
                                                                                        .default([]),
                                                                                estimatedDurationMinutes: z
                                                                                        .number()
                                                                                        .int()
                                                                                        .positive()
                                                                                        .optional(),
                                                                        })
                                                                        .strict(),
                                                        )
                                                        .min(1),
                                        })
                                        .strict(),
                        )
                        .min(1),
                estimatedDurationMinutes: z.number().int().positive(),
                confidence: z.number().min(0).max(1),
                createdAt: z.string().datetime(),
        })
        .strict();

const startWorkflowInputSchema = z
        .object({
                planId: z.string().uuid(),
                workflowId: z.string().uuid().optional(),
                parameters: z.record(z.unknown()).default({}),
                options: z
                        .object({
                                resumeFromStep: z.string().min(1).optional(),
                                dryRun: z.boolean().default(false),
                                tags: z.array(z.string().min(1).max(64)).max(10).optional(),
                        })
                        .optional(),
        })
        .strict();

const startWorkflowResultSchema = z
        .object({
                workflowId: z.string().uuid(),
                runId: z.string().uuid(),
                status: z.nativeEnum(TaskStatus),
                startedAt: z.string().datetime(),
                estimatedCompletionMinutes: z.number().int().nonnegative().optional(),
        })
        .strict();

const reviewWorkflowInputSchema = z
        .object({
                workflowId: z.string().uuid(),
                runId: z.string().uuid(),
                checkpointId: z.string().min(1).optional(),
                feedback: z.array(z.string().min(3).max(1_000)).max(20).default([]),
                metrics: z
                        .object({
                                quality: z.number().min(0).max(1).optional(),
                                velocityMinutes: z.number().int().nonnegative().optional(),
                                blockers: z.array(z.string().min(3).max(160)).max(10).optional(),
                        })
                        .optional(),
        })
        .strict();

const reviewWorkflowResultSchema = z
        .object({
                workflowId: z.string().uuid(),
                runId: z.string().uuid(),
                status: z.nativeEnum(TaskStatus),
                recommendedActions: z.array(z.string().min(3).max(160)).max(10),
                updatedAt: z.string().datetime(),
        })
        .strict();

export type PlanWorkflowInput = z.infer<typeof planWorkflowInputSchema>;
export type PlanWorkflowResult = z.infer<typeof planWorkflowResultSchema>;
export type StartWorkflowInput = z.infer<typeof startWorkflowInputSchema>;
export type StartWorkflowResult = z.infer<typeof startWorkflowResultSchema>;
export type ReviewWorkflowInput = z.infer<typeof reviewWorkflowInputSchema>;
export type ReviewWorkflowResult = z.infer<typeof reviewWorkflowResultSchema>;

const planWorkflowTool = createToolContract({
        name: 'workflow.plan',
        summary: 'Generate an execution plan for a complex workflow',
        description:
                'Analyzes high-level objectives and decomposes them into executable phases, task groups, and agent assignments.',
        category: 'workflow',
        inputSchema: planWorkflowInputSchema,
        resultSchema: planWorkflowResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Input payload failed validation checks.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'Referenced workflow template or domain configuration was not found.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Unexpected orchestration planning failure.',
                        retryable: true,
                },
        },
});

const startWorkflowTool = createToolContract({
        name: 'workflow.start',
        summary: 'Start executing a planned workflow run',
        description:
                'Initializes workflow execution using a plan identifier, optionally resuming from a checkpoint with runtime options.',
        category: 'workflow',
        inputSchema: startWorkflowInputSchema,
        resultSchema: startWorkflowResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Provided plan identifier or options are invalid.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'Referenced plan or workflow run could not be located.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Failed to start execution due to infrastructure issues.',
                        retryable: true,
                },
        },
});

const reviewWorkflowTool = createToolContract({
        name: 'workflow.review',
        summary: 'Capture human-in-the-loop feedback for an active workflow',
        description:
                'Records feedback or checkpoints against an in-flight workflow run to inform adaptive orchestration decisions.',
        category: 'workflow',
        inputSchema: reviewWorkflowInputSchema,
        resultSchema: reviewWorkflowResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Review payload did not satisfy validation rules.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'Unable to locate the workflow run for review.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Failed to persist workflow review feedback.',
                        retryable: true,
                },
        },
});

export const workflowOrchestrationTools = [planWorkflowTool, startWorkflowTool, reviewWorkflowTool] as const;

// ---------------------------------------------------------------------------
// Task management tool schemas
// ---------------------------------------------------------------------------

const createTaskInputSchema = z
        .object({
                title: z.string().min(3).max(120),
                summary: z.string().min(10).max(4_000),
                priority: z.number().int().min(1).max(5).default(3),
                tags: z.array(z.string().min(1).max(64)).max(20).optional(),
                dependencies: z.array(z.string().min(1).max(120)).max(10).optional(),
                metadata: z.record(z.unknown()).optional(),
        })
        .strict();

const createTaskResultSchema = z
        .object({
                taskId: z.string().min(1),
                status: z.nativeEnum(TaskStatus),
                createdAt: z.string().datetime(),
        })
        .strict();

const updateTaskStatusInputSchema = z
        .object({
                taskId: z.string().min(1),
                status: z.nativeEnum(TaskStatus),
                progress: z
                        .object({
                                percentage: z.number().min(0).max(100),
                                message: z.string().min(1).max(500).optional(),
                        })
                        .optional(),
                result: z.unknown().optional(),
                audit: z
                        .object({
                                actor: z.string().min(1),
                                reason: z.string().min(3).max(500).optional(),
                                timestamp: z.string().datetime().optional(),
                        })
                        .optional(),
        })
        .strict();

const updateTaskStatusResultSchema = z
        .object({
                taskId: z.string().min(1),
                status: z.nativeEnum(TaskStatus),
                updatedAt: z.string().datetime(),
                progress: z
                        .object({
                                percentage: z.number().min(0).max(100),
                                message: z.string().min(1).max(500).optional(),
                        })
                        .optional(),
        })
        .strict();

const assignTaskInputSchema = z
        .object({
                taskId: z.string().min(1),
                agentId: z.string().min(1),
                role: z.nativeEnum(AgentRole),
                estimatedStart: z.string().datetime().optional(),
                estimatedDurationMinutes: z.number().int().positive().optional(),
                metadata: z.record(z.unknown()).optional(),
        })
        .strict();

const assignTaskResultSchema = z
        .object({
                taskId: z.string().min(1),
                agentId: z.string().min(1),
                role: z.nativeEnum(AgentRole),
                assignedAt: z.string().datetime(),
        })
        .strict();

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type CreateTaskResult = z.infer<typeof createTaskResultSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInputSchema>;
export type UpdateTaskStatusResult = z.infer<typeof updateTaskStatusResultSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskInputSchema>;
export type AssignTaskResult = z.infer<typeof assignTaskResultSchema>;

const createTaskTool = createToolContract({
        name: 'task.create',
        summary: 'Create a managed task entry for orchestration',
        description: 'Registers a new orchestration task with metadata, dependencies, and default scheduling hints.',
        category: 'task',
        inputSchema: createTaskInputSchema,
        resultSchema: createTaskResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Task payload is invalid or incomplete.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Task persistence failed unexpectedly.',
                        retryable: true,
                },
        },
});

const updateTaskStatusTool = createToolContract({
        name: 'task.update_status',
        summary: 'Update status and progress for an orchestration task',
        description: 'Applies progress signals, status changes, and audit metadata to a tracked task.',
        category: 'task',
        inputSchema: updateTaskStatusInputSchema,
        resultSchema: updateTaskStatusResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Status update payload failed validation.',
                        retryable: false,
                },
                [ToolErrorCode.TASK_NOT_FOUND]: {
                        description: 'No managed task exists for the provided identifier.',
                        retryable: false,
                },
                [ToolErrorCode.TASK_CONFLICT]: {
                        description: 'Task is in a terminal state that rejects updates.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Failed to persist task update.',
                        retryable: true,
                },
        },
});

const assignTaskTool = createToolContract({
        name: 'task.assign',
        summary: 'Assign an orchestration task to an agent',
        description: 'Binds a task to a specific agent and role with scheduling metadata.',
        category: 'task',
        inputSchema: assignTaskInputSchema,
        resultSchema: assignTaskResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Assignment payload contains invalid values.',
                        retryable: false,
                },
                [ToolErrorCode.TASK_NOT_FOUND]: {
                        description: 'Cannot assign a non-existent task.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Assignment could not be recorded.',
                        retryable: true,
                },
        },
});

export const taskManagementTools = [createTaskTool, updateTaskStatusTool, assignTaskTool] as const;

// ---------------------------------------------------------------------------
// Process monitoring tool schemas
// ---------------------------------------------------------------------------

const getProcessStatusInputSchema = z
        .object({
                workflowId: z.string().uuid(),
                includeTimeline: z.boolean().default(false),
                includeMetrics: z.boolean().default(true),
        })
        .strict();

const getProcessStatusResultSchema = z
        .object({
                workflowId: z.string().uuid(),
                status: z.nativeEnum(TaskStatus),
                lastUpdated: z.string().datetime(),
                metrics: z
                        .object({
                                progress: z.number().min(0).max(1),
                                riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
                                estimatedMinutesRemaining: z.number().int().nonnegative().optional(),
                        })
                        .strict(),
                activeTasks: z
                        .array(
                                z
                                        .object({
                                                id: z.string().min(1),
                                                title: z.string().min(1),
                                                status: z.nativeEnum(TaskStatus),
                                                assigned: z
                                                        .object({
                                                                agentId: z.string().min(1),
                                                                role: z.nativeEnum(AgentRole),
                                                        })
                                                        .optional(),
                                                startedAt: z.string().datetime().optional(),
                                                completedAt: z.string().datetime().optional(),
                                        })
                                        .strict(),
                        )
                        .default([]),
                timeline: z
                        .array(
                                z
                                        .object({
                                                timestamp: z.string().datetime(),
                                                event: z.string().min(1),
                                                detail: z.string().min(1).optional(),
                                        })
                                        .strict(),
                        )
                        .optional(),
        })
        .strict();

const streamProcessEventsInputSchema = z
        .object({
                workflowId: z.string().uuid(),
                since: z.string().datetime().optional(),
                limit: z.number().int().positive().max(200).default(50),
        })
        .strict();

const streamProcessEventsResultSchema = z
        .object({
                workflowId: z.string().uuid(),
                events: z
                        .array(
                                z
                                        .object({
                                                id: z.string().min(1),
                                                timestamp: z.string().datetime(),
                                                type: z.string().min(1),
                                                payload: z.record(z.unknown()).optional(),
                                        })
                                        .strict(),
                        )
                        .default([]),
        })
        .strict();

const recordProcessSignalInputSchema = z
        .object({
                workflowId: z.string().uuid(),
                signalType: z.enum(['heartbeat', 'checkpoint', 'anomaly']),
                detail: z.string().min(3).max(1_000),
                timestamp: z.string().datetime().optional(),
        })
        .strict();

const recordProcessSignalResultSchema = z
        .object({
                workflowId: z.string().uuid(),
                signalType: z.enum(['heartbeat', 'checkpoint', 'anomaly']),
                recordedAt: z.string().datetime(),
        })
        .strict();

export type GetProcessStatusInput = z.infer<typeof getProcessStatusInputSchema>;
export type GetProcessStatusResult = z.infer<typeof getProcessStatusResultSchema>;
export type StreamProcessEventsInput = z.infer<typeof streamProcessEventsInputSchema>;
export type StreamProcessEventsResult = z.infer<typeof streamProcessEventsResultSchema>;
export type RecordProcessSignalInput = z.infer<typeof recordProcessSignalInputSchema>;
export type RecordProcessSignalResult = z.infer<typeof recordProcessSignalResultSchema>;

const getProcessStatusTool = createToolContract({
        name: 'process.get_status',
        summary: 'Retrieve live workflow status and metrics',
        description:
                'Returns the current state of an executing workflow including progress metrics and active tasks.',
        category: 'monitoring',
        inputSchema: getProcessStatusInputSchema,
        resultSchema: getProcessStatusResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Workflow identifier or options are invalid.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'No workflow run exists for the supplied identifier.',
                        retryable: false,
                },
                [ToolErrorCode.MONITORING_UNAVAILABLE]: {
                        description: 'Monitoring backend is currently unavailable.',
                        retryable: true,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Unexpected failure while aggregating workflow status.',
                        retryable: true,
                },
        },
});

const streamProcessEventsTool = createToolContract({
        name: 'process.stream_events',
        summary: 'Stream workflow lifecycle events',
        description: 'Provides a chronological stream of workflow events suitable for dashboards or alerts.',
        category: 'monitoring',
        inputSchema: streamProcessEventsInputSchema,
        resultSchema: streamProcessEventsResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Event stream request parameters are invalid.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'No workflow stream exists for the identifier.',
                        retryable: false,
                },
                [ToolErrorCode.MONITORING_UNAVAILABLE]: {
                        description: 'Event stream infrastructure is unavailable.',
                        retryable: true,
                },
        },
});

const recordProcessSignalTool = createToolContract({
        name: 'process.record_signal',
        summary: 'Record an operational signal for a workflow',
        description: 'Stores runtime heartbeats, checkpoints, or anomaly reports for observability pipelines.',
        category: 'monitoring',
        inputSchema: recordProcessSignalInputSchema,
        resultSchema: recordProcessSignalResultSchema,
        errors: {
                [ToolErrorCode.VALIDATION_ERROR]: {
                        description: 'Signal payload failed validation.',
                        retryable: false,
                },
                [ToolErrorCode.WORKFLOW_NOT_FOUND]: {
                        description: 'Workflow does not exist for the provided identifier.',
                        retryable: false,
                },
                [ToolErrorCode.INTERNAL_ERROR]: {
                        description: 'Failed to record workflow signal.',
                        retryable: true,
                },
        },
});

export const processMonitoringTools = [
        getProcessStatusTool,
        streamProcessEventsTool,
        recordProcessSignalTool,
] as const;

export const orchestrationToolContracts = [
        ...workflowOrchestrationTools,
        ...taskManagementTools,
        ...processMonitoringTools,
] as const;
