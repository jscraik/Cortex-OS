/**
 * nO (Master Agent Loop) Architecture Contracts
 * 
 * Contract-first design with Zod schemas for the nO architecture upgrade.
 * Defines interfaces for sophisticated scheduling, multi-tool layers, 
 * and complex agent coordination.
 * 
 * Following BVOO principles: Bounded, Validated, Observable Orchestration
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { z } from 'zod';

// Type guard helpers
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

// ================================
// Core Resource & Execution Types
// ================================

export const ResourceLimitsSchema = z.object({
    memoryMB: z.number().int().min(64).max(8192), // 64MB to 8GB
    cpuPercent: z.number().int().min(1).max(95), // 1% to 95% CPU
    timeoutMs: z.number().int().min(1000).max(1800000).optional(), // 1s to 30min
});

// Full (strict) request schema
const FullExecutionRequestSchema = z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    complexity: z.number().min(0).max(1), // 0.0 to 1.0 complexity score
    timeoutMs: z.number().int().min(1000).max(1800000), // 1s to 30min
    resourceLimits: ResourceLimitsSchema,
    constraints: z.record(z.unknown()).default({}),
    metadata: z.record(z.unknown()).optional(),
});

// Minimal compatibility request schema (used by some tests)
const MinimalExecutionRequestSchema = z.object({
    task: z.string().min(1),
    constraints: z.object({
        timeoutMs: z.number().int().min(1000).max(1800000),
        maxTokens: z.number().int().positive().max(100_000).optional(),
    }),
    context: z.record(z.unknown()).optional(),
});

export const ExecutionRequestSchema = z.union([
    FullExecutionRequestSchema,
    MinimalExecutionRequestSchema,
]).transform((input) => {
    // If already full shape, return as-is
    if (isRecord(input) && 'id' in input && 'description' in input) {
        return input as unknown as z.infer<typeof FullExecutionRequestSchema>;
    }

    // Normalize minimal shape -> full
    const minimal = input;
    const now = Date.now();
    const ctxUnknown: unknown = minimal.context ?? {};
    const ctx: Record<string, unknown> = isRecord(ctxUnknown) ? ctxUnknown : {};
    const profileUnknown = ctx['taskProfile'];
    const profile: Record<string, unknown> = isRecord(profileUnknown) ? profileUnknown : {};
    const description = String(minimal.task);
    const complexity = typeof profile['complexity'] === 'number' ? (profile['complexity'] as unknown as number) : 0.4;
    const priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    const timeoutMs = minimal.constraints.timeoutMs;
    const memoryMB = typeof profile['memoryMB'] === 'number' ? (profile['memoryMB'] as unknown as number) : 512;
    const cpuPercent = typeof profile['cpuPercent'] === 'number' ? (profile['cpuPercent'] as unknown as number) : 50;

    return {
        id: `req-${now}-${Math.random().toString(36).slice(2, 8)}`,
        description,
        priority,
        complexity,
        timeoutMs,
        resourceLimits: {
            memoryMB,
            cpuPercent,
            // propagate timeout if provided at resource level via constraints
            timeoutMs,
        },
        constraints: {
            ...minimal.constraints,
            // surface profile hints to constraints for strategy selection
            canParallelize: Boolean(profile['canParallelize']),
            estimatedBranches: (profile['estimatedBranches'] as number | undefined) ?? undefined,
        },
        metadata: (ctx['metadata'] as Record<string, unknown> | undefined) ?? undefined,
    } satisfies z.infer<typeof FullExecutionRequestSchema>;
});

export const ExecutionStepSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['analysis', 'planning', 'execution', 'validation', 'coordination']),
    agentRequirements: z.array(z.string()), // Required agent specializations
    dependencies: z.array(z.string()), // Dependent step IDs
    estimatedDuration: z.number().int().min(100), // Minimum 100ms
    resourceRequirements: ResourceLimitsSchema.optional(),
    parameters: z.record(z.unknown()).default({}),
});

// Full plan schema
const FullExecutionPlanSchema = z.object({
    id: z.string().min(1),
    requestId: z.string().min(1),
    strategy: z.enum(['sequential', 'parallel', 'adaptive', 'hierarchical']),
    estimatedDuration: z.number().int().min(100),
    steps: z.array(ExecutionStepSchema).min(1),
    resourceAllocation: ResourceLimitsSchema,
    contingencyPlans: z.array(z.object({
        condition: z.string(),
        alternativeSteps: z.array(z.string()),
    })).default([]),
    metadata: z.record(z.unknown()).default({}),
});

// Minimal plan schema (compat)
const MinimalExecutionPlanSchema = z.object({
    id: z.string().min(1),
    steps: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        dependsOn: z.array(z.string()).default([]),
    })).min(1),
    metadata: z.object({ createdBy: z.string().min(1) }).passthrough(),
});

export const ExecutionPlanSchema = z.union([
    FullExecutionPlanSchema,
    MinimalExecutionPlanSchema,
]).transform((input) => {
    if (isRecord(input) && 'requestId' in input && 'resourceAllocation' in input) {
        return input as unknown as z.infer<typeof FullExecutionPlanSchema>;
    }

    const minimal = input;
    const estimatedPerStep = 1000;
    const steps = minimal.steps.map((s) => ({
        id: s.id,
        type: 'execution' as const,
        agentRequirements: ['general'],
        dependencies: s.dependsOn ?? [],
        estimatedDuration: estimatedPerStep,
        parameters: {},
    }));

    return {
        id: minimal.id,
        requestId: `req-${minimal.id}`,
        strategy: 'sequential' as const,
        estimatedDuration: Math.max(estimatedPerStep, steps.length * estimatedPerStep),
        steps,
        resourceAllocation: {
            memoryMB: 512,
            cpuPercent: 50,
            timeoutMs: 5000,
        },
        contingencyPlans: [],
        metadata: {
            ...minimal.metadata,
            bounds: {
                timeoutMs: 5000,
                maxTokens: 1024,
            },
        },
    } satisfies z.infer<typeof FullExecutionPlanSchema>;
});

// Full feedback schema
const FullExecutionFeedbackSchema = z.object({
    planId: z.string().min(1),
    successRate: z.number().min(0).max(1),
    averageDuration: z.number().int().min(0),
    resourceUtilization: z.object({
        memoryUsage: z.number().min(0).max(1),
        cpuUsage: z.number().min(0).max(1),
    }),
    errors: z.array(z.object({
        step: z.string(),
        error: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
    })).default([]),
    optimizationSuggestions: z.array(z.string()).default([]),
});

// Minimal feedback schema (compat)
const MinimalExecutionFeedbackSchema = z.object({
    planId: z.string().min(1),
    successRate: z.number().min(0).max(1),
    notes: z.array(z.string()).optional(),
});

export const ExecutionFeedbackSchema = z.union([
    FullExecutionFeedbackSchema,
    MinimalExecutionFeedbackSchema,
]).transform((input) => {
    if (isRecord(input) && 'averageDuration' in input && 'resourceUtilization' in input) {
        return input as unknown as z.infer<typeof FullExecutionFeedbackSchema>;
    }
    const minimal = input;
    return {
        planId: minimal.planId,
        successRate: minimal.successRate,
        averageDuration: 0,
        resourceUtilization: { memoryUsage: 0.5, cpuUsage: 0.5 },
        errors: [],
        optimizationSuggestions: [],
    } satisfies z.infer<typeof FullExecutionFeedbackSchema>;
});

export const StrategyAdjustmentSchema = z.object({
    newStrategy: z.enum(['sequential', 'parallel', 'adaptive', 'hierarchical']),
    reasoning: z.string().min(1),
    expectedImprovement: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
});

export const ExecutionStatusSchema = z.object({
    planId: z.string().min(1),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    currentStep: z.string().optional(),
    progress: z.number().min(0).max(1),
    startTime: z.string().datetime(),
    estimatedCompletion: z.string().datetime().optional(),
    activeAgents: z.array(z.string()).default([]),
});

// (moved below AgentScheduleSchema to avoid forward reference)

// ================================
// Agent Management Types
// ================================

export const AgentConfigurationSchema = z.object({
    maxConcurrentAgents: z.number().int().min(1).max(50),
    agentPoolSize: z.number().int().min(1).max(20),
    healthCheckInterval: z.number().int().min(1000).max(60000), // 1s to 1min
    restartPolicy: z.enum(['never', 'on-failure', 'always']),
    resourceLimits: ResourceLimitsSchema,
});

export const AgentStateSchema = z.object({
    agentId: z.string().min(1),
    specialization: z.string().min(1),
    status: z.enum(['idle', 'busy', 'error', 'maintenance', 'shutdown']),
    currentTask: z.string().optional(),
    performance: z.object({
        tasksCompleted: z.number().int().min(0),
        averageExecutionTime: z.number().min(0),
        successRate: z.number().min(0).max(1),
        errorCount: z.number().int().min(0),
    }),
    resources: z.object({
        memoryUsageMB: z.number().min(0),
        cpuUsagePercent: z.number().min(0).max(100),
    }),
    lastUpdate: z.string().datetime(),
    version: z.string().min(1),
});

export const AgentPoolSchema = z.object({
    agents: z.array(AgentStateSchema),
    totalCapacity: z.number().int().min(0),
    availableCapacity: z.number().int().min(0),
    healthStatus: z.enum(['healthy', 'degraded', 'critical']),
});

export const AgentErrorSchema = z.object({
    agentId: z.string().min(1),
    error: z.string().min(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    timestamp: z.string().datetime(),
    context: z.record(z.unknown()).default({}),
    stackTrace: z.string().optional(),
});

export const RecoveryActionSchema = z.object({
    type: z.enum(['restart', 'redistribute', 'fallback', 'escalate', 'ignore']),
    targetAgent: z.string().optional(),
    fallbackAgent: z.string().optional(),
    newTaskDistribution: z.array(z.object({
        agentId: z.string(),
        tasks: z.array(z.string()),
    })).optional(),
    reasoning: z.string().min(1),
});

export const ExecutionResultSchema = z.object({
    planId: z.string().min(1),
    status: z.enum(['success', 'partial', 'failure']),
    results: z.array(z.object({
        stepId: z.string(),
        agentId: z.string(),
        result: z.unknown(),
        duration: z.number().int().min(0),
    })),
    totalDuration: z.number().int().min(0),
    resourceUsage: ResourceLimitsSchema,
    errors: z.array(AgentErrorSchema).default([]),
});

// Full schedule schema
const FullAgentScheduleSchema = z.object({
    id: z.string().min(1),
    planId: z.string().min(1),
    agents: z.array(z.object({
        agentId: z.string().min(1),
        specialization: z.string().min(1),
        assignedSteps: z.array(z.string()),
        estimatedLoad: z.number().min(0).max(1),
        priority: z.number().int().min(1).max(10),
    })),
    coordinationEvents: z.array(z.object({
        type: z.enum(['start', 'checkpoint', 'handoff', 'complete', 'error']),
        agentId: z.string().min(1),
        timestamp: z.string().datetime(),
        dependencies: z.array(z.string()).default([]),
        payload: z.record(z.unknown()).default({}),
    })),
    startTime: z.string().datetime(),
    estimatedEndTime: z.string().datetime(),
});

// Minimal schedule schema (compat)
const MinimalAgentScheduleSchema = z.object({
    planId: z.string().min(1),
    assignments: z.array(z.object({ stepId: z.string(), agentId: z.string() })).min(1),
});

export const AgentScheduleSchema = z.union([
    FullAgentScheduleSchema,
    MinimalAgentScheduleSchema,
]).transform((input) => {
    if (isRecord(input) && 'agents' in input && 'id' in input) {
        return input as unknown as z.infer<typeof FullAgentScheduleSchema>;
    }
    const minimal = input;
    const now = Date.now();
    return {
        id: `schedule-${now}-${Math.random().toString(36).slice(2, 8)}`,
        planId: minimal.planId,
        agents: minimal.assignments.map((a) => ({
            agentId: a.agentId,
            specialization: 'general',
            assignedSteps: [a.stepId],
            estimatedLoad: 0.5,
            priority: 5,
        })),
        coordinationEvents: [],
        startTime: new Date().toISOString(),
        estimatedEndTime: new Date(now + 1000).toISOString(),
    } satisfies z.infer<typeof FullAgentScheduleSchema>;
});

// ================================
// Intelligence Scheduler Interface
// ================================

export const IntelligenceSchedulerSchema = z.object({
    planExecution: z.function()
        .args(ExecutionRequestSchema)
        .returns(z.promise(ExecutionPlanSchema)),
    scheduleAgents: z.function()
        .args(ExecutionPlanSchema)
        .returns(z.promise(AgentScheduleSchema)),
    adaptStrategy: z.function()
        .args(ExecutionFeedbackSchema)
        .returns(z.promise(StrategyAdjustmentSchema)),
    monitorExecution: z.function()
        .args(AgentScheduleSchema)
        .returns(z.promise(ExecutionStatusSchema)),
});

// ================================
// Master Agent Loop Interface
// ================================

export const MasterAgentLoopSchema = z.object({
    initializeAgents: z.function()
        .args(AgentConfigurationSchema)
        .returns(z.promise(AgentPoolSchema)),
    coordinateExecution: z.function()
        .args(ExecutionPlanSchema)
        .returns(z.promise(ExecutionResultSchema)),
    handleAgentFailure: z.function()
        .args(z.string(), AgentErrorSchema)
        .returns(z.promise(RecoveryActionSchema)),
    persistAgentState: z.function()
        .args(z.string(), AgentStateSchema)
        .returns(z.promise(z.void())),
});

// ================================
// Tool Layer Types
// ================================

export const ToolCapabilitySchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    level: z.enum(['dashboard', 'execution', 'primitive']),
    inputSchema: z.record(z.unknown()),
    outputSchema: z.record(z.unknown()),
    securityLevel: z.enum(['low', 'medium', 'high', 'critical']),
    requiredPermissions: z.array(z.string()).default([]),
    estimatedExecutionTime: z.number().int().min(10).optional(), // ms
});

export const ToolResultSchema = z.object({
    toolName: z.string().min(1),
    status: z.enum(['success', 'error', 'timeout', 'cancelled']),
    result: z.unknown(),
    duration: z.number().int().min(0),
    resourceUsage: z.object({
        memoryMB: z.number().min(0),
        cpuPercent: z.number().min(0).max(100),
    }).optional(),
    error: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
});

export const ToolManifestSchema = z.object({
    level: z.enum(['dashboard', 'execution', 'primitive']),
    tools: z.array(ToolCapabilitySchema),
    totalCapabilities: z.number().int().min(0),
    securityProfile: z.object({
        highSecurityTools: z.number().int().min(0),
        permissionRequiredTools: z.number().int().min(0),
    }),
});

// ================================
// Tool Layer Interface
// ================================

export const ToolLayerSchema = z.object({
    level: z.enum(['dashboard', 'execution', 'primitive']),
    capabilities: z.array(ToolCapabilitySchema),
    invoke: z.function()
        .args(z.string(), z.unknown())
        .returns(z.promise(ToolResultSchema)),
    getAvailableTools: z.function()
        .returns(z.array(ToolManifestSchema)),
});

// ================================
// Agent Network Types
// ================================

export const AgentMessageSchema = z.object({
    id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1), // '*' for broadcast
    type: z.enum(['request', 'response', 'notification', 'heartbeat']),
    content: z.record(z.unknown()),
    timestamp: z.string().datetime(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    ttl: z.number().int().min(1000).optional(), // Time to live in ms
    requiresAck: z.boolean().default(false),
});

export const BroadcastMessageSchema = z.object({
    id: z.string().min(1),
    from: z.string().min(1),
    topic: z.string().min(1),
    content: z.record(z.unknown()),
    timestamp: z.string().datetime(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    targetAgents: z.array(z.string()).optional(), // Subset of agents
});

export const MessageHandlerSchema = z.function()
    .args(AgentMessageSchema)
    .returns(z.promise(z.void()));

export const UnsubscribeFnSchema = z.function()
    .returns(z.void());

// ================================
// Agent Network Interface  
// ================================

export const AgentNetworkSchema = z.object({
    sendMessage: z.function()
        .args(z.string(), z.string(), AgentMessageSchema)
        .returns(z.promise(z.void())),
    broadcast: z.function()
        .args(z.string(), BroadcastMessageSchema)
        .returns(z.promise(z.void())),
    subscribeToAgent: z.function()
        .args(z.string(), MessageHandlerSchema)
        .returns(UnsubscribeFnSchema),
});

// ================================
// Type Exports
// ================================

export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ExecutionFeedback = z.infer<typeof ExecutionFeedbackSchema>;
export type StrategyAdjustment = z.infer<typeof StrategyAdjustmentSchema>;
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export type IntelligenceScheduler = z.infer<typeof IntelligenceSchedulerSchema>;

export type AgentConfiguration = z.infer<typeof AgentConfigurationSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
export type AgentPool = z.infer<typeof AgentPoolSchema>;
export type AgentError = z.infer<typeof AgentErrorSchema>;
export type RecoveryAction = z.infer<typeof RecoveryActionSchema>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export type AgentSchedule = z.infer<typeof AgentScheduleSchema>;

export type MasterAgentLoop = z.infer<typeof MasterAgentLoopSchema>;

export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type ToolManifest = z.infer<typeof ToolManifestSchema>;

export type ToolLayer = z.infer<typeof ToolLayerSchema>;

export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export type BroadcastMessage = z.infer<typeof BroadcastMessageSchema>;
export type MessageHandler = z.infer<typeof MessageHandlerSchema>;
export type UnsubscribeFn = z.infer<typeof UnsubscribeFnSchema>;

export type AgentNetwork = z.infer<typeof AgentNetworkSchema>;

// ================================
// Contract Validation Utilities
// ================================

/**
 * Validate execution request with bounds checking
 */
export function validateExecutionRequest(request: unknown): ExecutionRequest {
    // Apply bounds checking before validation using safe, typed guards
    const base: Record<string, unknown> =
        typeof request === 'object' && request !== null ? (request as Record<string, unknown>) : {};

    // Clone to avoid mutating the original
    const requestObj: Record<string, unknown> = { ...base };

    // Clamp complexity to 0-1 range
    const complexity = requestObj.complexity;
    if (typeof complexity === 'number' && complexity > 1.0) {
        requestObj.complexity = 1.0;
    }

    // Clamp CPU percentage to 1-95 range
    const resourceLimits = requestObj.resourceLimits;
    if (resourceLimits && typeof resourceLimits === 'object') {
        const rl = { ...(resourceLimits as Record<string, unknown>) };
        const cpuPercent = rl.cpuPercent;
        if (typeof cpuPercent === 'number' && cpuPercent > 95) {
            rl.cpuPercent = 95;
        }
        requestObj.resourceLimits = rl;
    }

    // Now validate with bounds-checked values
    const validated = ExecutionRequestSchema.parse(requestObj);
    return validated;
}

/**
 * Validate tool capability with security checks
 */
export function validateToolCapability(capability: unknown): ToolCapability {
    const validated = ToolCapabilitySchema.parse(capability);

    // Ensure security level matches required permissions
    if (validated.requiredPermissions.length > 0 && validated.securityLevel === 'low') {
        validated.securityLevel = 'medium';
    }

    return validated;
}

/**
 * Create bounded resource limits
 */
export function createBoundedResourceLimits(
    memoryMB: number,
    cpuPercent: number,
    timeoutMs?: number
): ResourceLimits {
    return ResourceLimitsSchema.parse({
        memoryMB: Math.max(64, Math.min(8192, memoryMB)),
        cpuPercent: Math.max(1, Math.min(95, cpuPercent)),
        timeoutMs: timeoutMs ? Math.max(1000, Math.min(1800000, timeoutMs)) : undefined,
    });
}
