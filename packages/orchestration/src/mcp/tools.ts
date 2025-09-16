
import { randomUUID } from 'node:crypto';
import { z, type ZodIssue, ZodError } from 'zod';
import {
        recordAgentActivation,
        recordAgentDeactivation,
        recordWorkflowEnd,
        recordWorkflowStart,
        updateResourceUtilization,
        withEnhancedSpan,
} from '../observability/otel.js';
import type { EnhancedSpanContext } from '../observability/otel.js';

type MCPToolResponse = {
        content: Array<{ type: 'text'; text: string }>;
        metadata: {
                correlationId: string;
                timestamp: string;
                tool: string;
        };
        isError?: boolean;
};

type MCPToolDefinition = {
        name: string;
        description: string;
        inputSchema: z.ZodTypeAny;
        handler: (params: unknown) => Promise<MCPToolResponse>;
};

class OrchestrationToolError extends Error {
        constructor(
                public readonly code:
                        | 'validation_error'
                        | 'conflict'
                        | 'internal_error'
                        | 'security_error',
                message: string,
                public readonly details: string[] = [],
        ) {
                super(message);
                this.name = 'OrchestrationToolError';
        }
}

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ENTRIES = 64;
const MAX_ARRAY_LENGTH = 64;
const MAX_STRING_LENGTH = 4096;

function mapZodIssues(issues: ZodIssue[]): string[] {
        return issues.map((issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`);
}

function createCorrelationId(): string {
        return randomUUID();
}

function sanitizeString(value: string, field: string, { min, max }: { min: number; max: number }): string {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized || normalized.length < min) {
                        throw new OrchestrationToolError('validation_error', `${field} cannot be empty`, [
                                `${field} must contain at least ${min} characters`,
                        ]);
        }
        if (normalized.length > max) {
                        throw new OrchestrationToolError('validation_error', `${field} exceeds maximum length`, [
                                `${field} must not exceed ${max} characters`,
                        ]);
        }
        if (CONTROL_CHARS.test(normalized)) {
                                'Remove control characters from input',
                                `${field} contains control characters`,
                        ]);
        }
        CONTROL_CHARS.lastIndex = 0;
        return normalized;
}

function ensurePlainObject(value: unknown, context: string): asserts value is Record<string, unknown> {
        if (typeof value !== 'object' || value === null) {
                throw new OrchestrationToolError('validation_error', `${context} must be an object`, [
                        `${context} must be an object`,
                ]);
        }
        const proto = Reflect.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
                throw new OrchestrationToolError('security_error', `${context} has an unsafe prototype`, [
                        `${context} must not override Object prototype`,
                ]);
        }
}

function sanitizeMetadataValue(value: unknown, context: string, depth: number): unknown {
        if (depth > MAX_METADATA_DEPTH) {
                throw new OrchestrationToolError('validation_error', `${context} exceeds maximum depth`, [
                        `${context} exceeds maximum metadata depth of ${MAX_METADATA_DEPTH}`,
                ]);
        }
        if (value === null || value === undefined) return value;
        if (typeof value === 'string') {
                const sanitized = value.replace(/\s+/g, ' ').trim();
                if (sanitized.length > MAX_STRING_LENGTH) {
                        throw new OrchestrationToolError('validation_error', `${context} exceeds allowed length`, [
                                `${context} exceeds maximum metadata length of ${MAX_STRING_LENGTH}`,
                        ]);
                }
                return sanitized;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
                if (typeof value === 'number' && !Number.isFinite(value)) {
                        throw new OrchestrationToolError('validation_error', `${context} must be a finite number`, [
                                `${context} must be finite`,
                        ]);
                }
                return value;
        }
        if (Array.isArray(value)) {
                if (value.length > MAX_ARRAY_LENGTH) {
                        throw new OrchestrationToolError('validation_error', `${context} array too large`, [
                                `${context} arrays cannot exceed ${MAX_ARRAY_LENGTH} items`,
                        ]);
                }
                return value.map((entry, index) => sanitizeMetadataValue(entry, `${context}[${index}]`, depth + 1));
        }
        ensurePlainObject(value, context);
        const entries = Object.entries(value);
        if (entries.length > MAX_METADATA_ENTRIES) {
                throw new OrchestrationToolError('validation_error', `${context} has too many entries`, [
                        `${context} cannot exceed ${MAX_METADATA_ENTRIES} entries`,
                ]);
        }
        const sanitized: Record<string, unknown> = {};
        for (const [key, entry] of entries) {
                sanitized[sanitizeString(key, `${context} key`, { min: 1, max: 120 })] = sanitizeMetadataValue(
                        entry,
                        `${context}.${key}`,
                        depth + 1,
                );
        }
        return sanitized;
}

function sanitizeOptionalRecord(
        value: Record<string, unknown> | undefined,
        context: string,
): Record<string, unknown> | undefined {
        if (value === undefined) return undefined;
        ensurePlainObject(value, context);
        return sanitizeMetadataValue(value, context, 1) as Record<string, unknown>;
}

function createSuccessResponse<T>(tool: string, data: T, correlationId: string, timestamp: string): MCPToolResponse {
        return {
                content: [
                        {
                                type: 'text',
                                text: JSON.stringify({ success: true, data, correlationId, timestamp }),
                        },
                ],
                metadata: { correlationId, timestamp, tool },
        };
}

function createErrorResponse(
        tool: string,
        error: { code: string; message: string; details?: string[] },
        correlationId: string,
        timestamp: string,
): MCPToolResponse {
        console.error(`[orchestration:mcp:${tool}] ${error.code}: ${error.message}`, {
                correlationId,
                details: error.details ?? [],
        });
        return {
                content: [
                        {
                                type: 'text',
                                text: JSON.stringify({ success: false, error, correlationId, timestamp }),
                        },
                ],
                metadata: { correlationId, timestamp, tool },
                isError: true,
        };
}

async function executeTool<TInput>(options: {
        tool: string;
        schema: z.ZodType<TInput>;
        params: unknown;
        logic: (input: TInput) => Promise<unknown>;
}): Promise<MCPToolResponse> {
        const { tool, schema, params, logic } = options;
        const correlationId = createCorrelationId();
        const timestamp = new Date().toISOString();
        try {
                const parsed = schema.parse(params);
                const result = await logic(parsed);
                console.info(`[orchestration:mcp:${tool}] completed`, {
                        correlationId,
                        timestamp,
                });
                return createSuccessResponse(tool, result, correlationId, timestamp);
        } catch (error) {
                if (error instanceof OrchestrationToolError) {
                        return createErrorResponse(
                                tool,
                                {
                                        code: error.code,
                                        message: error.message,
                                        details: error.details,
                                },
                                correlationId,
                                timestamp,
                        );
                }
                if (error instanceof ZodError) {
                        return createErrorResponse(
                                tool,
                                {
                                        code: 'validation_error',
                                        message: 'Invalid input provided',
                                        details: mapZodIssues(error.issues),
                                },
                                correlationId,
                                timestamp,
                        );
                }
                const message = error instanceof Error ? error.message : 'Unknown error';
                return createErrorResponse(
                        tool,
                        { code: 'internal_error', message },
                        correlationId,
                        timestamp,
                );
        }
}

const STEP_STATUSES = new Set(['pending', 'running', 'completed', 'failed']);

const workflowStepSchema = z.object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(160),
        description: z.string().min(1).max(1024),
        agent: z.string().min(1).max(160),
        status: z.string().optional(),
        estimatedDurationMs: z.number().int().positive().max(86_400_000).optional(),
});

const workflowInputSchema = z.object({
        workflowId: z.string().min(3).max(128).optional(),
        workflowName: z.string().min(1).max(180),
        goal: z.string().min(1).max(4096),
        steps: z.array(workflowStepSchema).min(1).max(50),
        context: z.record(z.unknown()).optional(),
});

function sanitizeWorkflowStep(step: z.infer<typeof workflowStepSchema>, index: number) {
        const id = sanitizeString(step.id, `steps[${index}].id`, { min: 1, max: 64 });
        const name = sanitizeString(step.name, `steps[${index}].name`, { min: 1, max: 160 });
        const description = sanitizeString(step.description, `steps[${index}].description`, {
                min: 1,
                max: 1024,
        });
        const agent = sanitizeString(step.agent, `steps[${index}].agent`, { min: 1, max: 160 });
        const normalizedStatus = step.status ? step.status.toLowerCase() : 'pending';
        if (!STEP_STATUSES.has(normalizedStatus)) {
                throw new OrchestrationToolError('validation_error', `Invalid status for step ${id}`, [
                        `steps[${index}].status must be one of ${Array.from(STEP_STATUSES).join(', ')}`,
                ]);
        }
        const estimatedDurationMs = step.estimatedDurationMs;
        return {
                id,
                name,
                description,
                agent,
                status: normalizedStatus,
                estimatedDurationMs,
        };
}

export const workflowOrchestrationTool: MCPToolDefinition = {
        name: 'orchestration.workflow.execute',
        description: 'Validate and summarize a multi-agent workflow orchestration request.',
        inputSchema: workflowInputSchema,
        handler: async (params: unknown) =>
                executeTool({
                        tool: 'orchestration.workflow.execute',
                        schema: workflowInputSchema,
                        params,
                        logic: async (input) => {
                                const workflowName = sanitizeString(input.workflowName, 'workflowName', {
                                        min: 1,
                                        max: 180,
                                });
                                const goal = sanitizeString(input.goal, 'goal', { min: 1, max: 4096 });
                                const workflowId = input.workflowId
                                        ? sanitizeString(input.workflowId, 'workflowId', { min: 3, max: 128 })
                                        : `workflow-${randomUUID()}`;
                                const context = sanitizeOptionalRecord(input.context, 'context') ?? {};
                                const startedAt = new Date().toISOString();
                                const agents = new Set<string>();
                                recordWorkflowStart(workflowId, workflowName);
                                let success = false;
                                try {
                                        const sanitizedSteps = input.steps.map((step, index) => {
                                                const sanitized = sanitizeWorkflowStep(step, index);
                                                agents.add(sanitized.agent);
                                                return sanitized;
                                        });
                                        for (const agentId of agents) {
                                                recordAgentActivation(agentId, []);
                                        }
                                        const pendingSteps = sanitizedSteps.filter((step) => step.status === 'pending').length;
                                        const completedSteps = sanitizedSteps.filter((step) => step.status === 'completed').length;
                                        const totalDurationMs = sanitizedSteps.reduce(
                                                (acc, step) => acc + (step.estimatedDurationMs ?? 0),
                                                0,
                                        );
                                        const spanContext: EnhancedSpanContext = {
                                                workflowId,
                                                workflowName,
                                                stepKind: 'workflow',
                                                phase: 'coordination',
                                        };
                                        const result = await withEnhancedSpan(
                                                'mcp.tool.orchestration.workflow.execute',
                                                async () => ({
                                                        workflowId,
                                                        workflowName,
                                                        goal,
                                                        summary: {
                                                                totalSteps: sanitizedSteps.length,
                                                                pendingSteps,
                                                                completedSteps,
                                                                assignedAgents: Array.from(agents),
                                                                estimatedDurationMs: totalDurationMs || null,
                                                        },
                                                        steps: sanitizedSteps,
                                                        context,
                                                        startedAt,
                                                        completedAt: new Date().toISOString(),
                                                }),
                                                spanContext,
                                        );
                                        success = true;
                                        return result;
                                } finally {
                                        for (const agentId of agents) {
                                                recordAgentDeactivation(agentId);
                                        }
                                        recordWorkflowEnd(workflowId, workflowName, success);
                                }
                        },
                }),
};

const progressSchema = z.object({
        current: z.number().int().min(0),
        total: z.number().int().positive(),
        message: z.string().max(512).optional(),
});

const taskSchema = z.object({
        id: z.string().min(1).max(128).optional(),
        title: z.string().min(1).max(160),
        description: z.string().max(2048).optional(),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
        assignee: z.string().min(1).max(160).optional(),
        tags: z.array(z.string()).max(32).optional(),
        metadata: z.record(z.unknown()).optional(),
        progress: progressSchema.optional(),
});

const taskManagementInputSchema = z.object({
        action: z.enum(['create', 'update', 'progress', 'complete', 'fail', 'cancel']).default('create'),
        task: taskSchema,
        audit: z
                .object({
                        actor: z.string().min(1).max(160),
                        reason: z.string().max(512).optional(),
                })
                .optional(),
});

const STATUS_BY_ACTION: Record<z.infer<typeof taskManagementInputSchema>['action'], string> = {
        create: 'pending',
        update: 'in_progress',
        progress: 'in_progress',
        complete: 'completed',
        fail: 'failed',
        cancel: 'cancelled',
};

export const taskManagementTool: MCPToolDefinition = {
        name: 'orchestration.task.manage',
        description: 'Manage orchestration task lifecycle with structured updates.',
        inputSchema: taskManagementInputSchema,
        handler: async (params: unknown) =>
                executeTool({
                        tool: 'orchestration.task.manage',
                        schema: taskManagementInputSchema,
                        params,
                        logic: async (input) => {
                                const title = sanitizeString(input.task.title, 'task.title', { min: 1, max: 160 });
                                const taskId = input.task.id
                                        ? sanitizeString(input.task.id, 'task.id', { min: 1, max: 128 })
                                        : `task-${randomUUID()}`;
                                const assignee = input.task.assignee
                                        ? sanitizeString(input.task.assignee, 'task.assignee', { min: 1, max: 160 })
                                        : undefined;
                                const metadata = sanitizeOptionalRecord(input.task.metadata, 'task.metadata');
                                const tags = input.task.tags?.map((tag, index) =>
                                        sanitizeString(tag, `task.tags[${index}]`, { min: 1, max: 64 }),
                                );
                                const audit = input.audit
                                        ? {
                                                  actor: sanitizeString(input.audit.actor, 'audit.actor', {
                                                          min: 1,
                                                          max: 160,
                                                  }),
                                                  reason: input.audit.reason
                                                          ? sanitizeString(input.audit.reason, 'audit.reason', {
                                                                        min: 1,
                                                                        max: 512,
                                                                })
                                                          : undefined,
                                          }
                                        : undefined;
                                const baseStatus = STATUS_BY_ACTION[input.action];
                                const status =
                                        input.action === 'update'
                                                ? input.task.status ?? baseStatus
                                                : baseStatus;
                                const spanContext: EnhancedSpanContext = {
                                        workflowName: title,
                                        stepKind: 'task-management',
                                        agentId: assignee,
                                };
                                const progress = input.task.progress
                                        ? (() => {
                                                  const current = input.task.progress!.current;
                                                  const total = input.task.progress!.total;
                                                  if (current > total) {
                                                          throw new OrchestrationToolError(
                                                                  'validation_error',
                                                                  'Progress current cannot exceed total',
                                                                  ['task.progress.current cannot exceed task.progress.total'],
                                                          );
                                                  }
                                                  const percentage = Math.round((current / total) * 100);
                                                  const message = input.task.progress!.message
                                                          ? sanitizeString(
                                                                        input.task.progress!.message,
                                                                        'task.progress.message',
                                                                        { min: 1, max: 512 },
                                                                )
                                                          : undefined;
                                                  return { current, total, percentage, message };
                                          })()
                                        : undefined;
                                return withEnhancedSpan(
                                        'mcp.tool.orchestration.task.manage',
                                        async () => ({
                                                taskId,
                                                action: input.action,
                                                status,
                                                title,
                                                assignee,
                                                priority: input.task.priority,
                                                progress,
                                                metadata,
                                                tags,
                                                audit,
                                                updatedAt: new Date().toISOString(),
                                        }),
                                        spanContext,
                                );
                        },
                }),
};

const processSchema = z.object({
        pid: z.number().int().positive(),
        name: z.string().min(1).max(160),
        status: z.enum(['running', 'sleeping', 'stopped', 'zombie', 'waiting']).optional(),
        cpu: z.number().min(0).max(100),
        memoryMb: z.number().min(0),
        startedAt: z.string().datetime().optional(),
        metadata: z.record(z.unknown()).optional(),
});

const processMonitoringInputSchema = z.object({
        workflowId: z.string().min(3).max(128).optional(),
        workflowName: z.string().min(1).max(180).optional(),
        processes: z.array(processSchema).min(1).max(100),
        thresholds: z
                .object({
                        cpu: z.number().min(1).max(100).default(85),
                        memoryMb: z.number().min(1).default(1024),
                })
                .default({ cpu: 85, memoryMb: 1024 }),
});

const RUNNING_STATUS = 'running';

export const processMonitoringTool: MCPToolDefinition = {
        name: 'orchestration.process.monitor',
        description: 'Assess running orchestration processes and flag anomalies.',
        inputSchema: processMonitoringInputSchema,
        handler: async (params: unknown) =>
                executeTool({
                        tool: 'orchestration.process.monitor',
                        schema: processMonitoringInputSchema,
                        params,
                        logic: async (input) => {
                                const workflowName = input.workflowName
                                        ? sanitizeString(input.workflowName, 'workflowName', { min: 1, max: 180 })
                                        : undefined;
                                const workflowId = input.workflowId
                                        ? sanitizeString(input.workflowId, 'workflowId', { min: 3, max: 128 })
                                        : undefined;
                                const thresholds = input.thresholds ?? { cpu: 85, memoryMb: 1024 };
                                const processes = input.processes.map((proc, index) => {
                                        const name = sanitizeString(proc.name, `processes[${index}].name`, {
                                                min: 1,
                                                max: 160,
                                        });
                                        const status = (proc.status ?? RUNNING_STATUS).toLowerCase();
                                        if (!['running', 'sleeping', 'stopped', 'zombie', 'waiting'].includes(status)) {
                                                throw new OrchestrationToolError('validation_error', `Invalid status for process ${name}`, [
                                                        `processes[${index}].status must be running, sleeping, stopped, waiting, or zombie`,
                                                ]);
                                        }
                                        const startedAt = proc.startedAt ? new Date(proc.startedAt).toISOString() : undefined;
                                        const metadata = sanitizeOptionalRecord(proc.metadata, `processes[${index}].metadata`);
                                        return {
                                                pid: proc.pid,
                                                name,
                                                status,
                                                cpu: Number(proc.cpu.toFixed(2)),
                                                memoryMb: Number(proc.memoryMb.toFixed(2)),
                                                startedAt,
                                                metadata,
                                        };
                                });
                                const spanContext: EnhancedSpanContext = {
                                        workflowId,
                                        workflowName,
                                        stepKind: 'process-monitoring',
                                        phase: 'monitoring',
                                };
                                return withEnhancedSpan(
                                        'mcp.tool.orchestration.process.monitor',
                                        async () => {
                                                const alerts: string[] = [];
                                                let cpuSum = 0;
                                                let memorySum = 0;
                                                let highCpu = 0;
                                                let highMemory = 0;
                                                let nonRunning = 0;
                                                for (const proc of processes) {
                                                        cpuSum += proc.cpu;
                                                        memorySum += proc.memoryMb;
                                                        const cpuRatio = proc.cpu / 100;
                                                        const memoryRatio = proc.memoryMb / thresholds.memoryMb;
                                                        updateResourceUtilization('cpu', Number(cpuRatio.toFixed(4)), proc.name);
                                                        updateResourceUtilization('memory', Number(memoryRatio.toFixed(4)), proc.name);
                                                        if (proc.cpu > thresholds.cpu) {
                                                                highCpu += 1;
                                                                alerts.push(
                                                                        `Process ${proc.name} (pid ${proc.pid}) exceeded CPU threshold ${thresholds.cpu}% with ${proc.cpu}%`,
                                                                );
                                                        }
                                                        if (proc.memoryMb > thresholds.memoryMb) {
                                                                highMemory += 1;
                                                                alerts.push(
                                                                        `Process ${proc.name} (pid ${proc.pid}) exceeded memory threshold ${thresholds.memoryMb}MB with ${proc.memoryMb}MB`,
                                                                );
                                                        }
                                                if (proc.status !== RUNNING_STATUS) {
                                                        nonRunning += 1;
                                                }
                                                }
                                                const count = processes.length;
                                                const summary = {
                                                        totalProcesses: count,
                                                        highCpuProcesses: highCpu,
                                                        highMemoryProcesses: highMemory,
                                                        nonRunningProcesses: nonRunning,
                                                        averageCpu: Number((cpuSum / count).toFixed(2)),
                                                        averageMemoryMb: Number((memorySum / count).toFixed(2)),
                                                };
                                                return {
                                                        workflowId,
                                                        workflowName,
                                                        thresholds,
                                                        summary,
                                                        alerts,
                                                        processes: processes.map((proc) => ({
                                                                pid: proc.pid,
                                                                name: proc.name,
                                                                status: proc.status,
                                                                cpu: proc.cpu,
                                                                memoryMb: proc.memoryMb,
                                                        })),
                                                        timestamp: new Date().toISOString(),
                                                };
                                        },
                                        spanContext,
                                );
                        },
                }),
};

export const orchestrationMcpTools = [
        workflowOrchestrationTool,
        taskManagementTool,
        processMonitoringTool,
];
