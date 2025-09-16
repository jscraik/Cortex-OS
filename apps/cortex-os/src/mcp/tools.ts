import { z } from 'zod';

// Common error shape
export const ErrorResponseSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// System management schemas
export const SystemStatusInputSchema = z.object({
    include: z.array(z.enum(['services', 'resources', 'uptime', 'version'])).optional().default(['services', 'resources'])
});
export const SystemStatusOutputSchema = z.object({
    services: z.array(z.object({ name: z.string(), status: z.enum(['running', 'stopped', 'degraded']), version: z.string().optional() })).optional(),
    resources: z.object({ cpu: z.number().min(0).max(100).optional(), memoryMB: z.number().int().nonnegative().optional(), load: z.number().nonnegative().optional() }).optional(),
    uptimeSec: z.number().int().nonnegative().optional(),
    version: z.string().optional()
});

export const RestartServiceInputSchema = z.object({
    service: z.string().min(1),
    mode: z.enum(['graceful', 'force']).default('graceful'),
    timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});
export const RestartServiceOutputSchema = z.object({
    service: z.string(),
    previousStatus: z.string(),
    newStatus: z.string(),
    durationMs: z.number().int().positive(),
    mode: z.enum(['graceful', 'force'])
});

export const SystemResourcesInputSchema = z.object({ sampleWindowSec: z.number().int().positive().max(300).default(5) });
export const SystemResourcesOutputSchema = z.object({
    cpu: z.number().min(0).max(100),
    memory: z.object({ usedMB: z.number().int().nonnegative(), totalMB: z.number().int().positive() }),
    loadAvg: z.tuple([z.number(), z.number(), z.number()])
});

// Orchestration schemas
export const RunWorkflowInputSchema = z.object({
    workflow: z.string().min(1),
    input: z.record(z.any()).optional(),
    traceId: z.string().optional(),
    async: z.boolean().default(true)
});
export const RunWorkflowOutputSchema = z.object({
    workflow: z.string(),
    runId: z.string(),
    status: z.enum(['queued', 'running', 'completed', 'failed']),
    startedAt: z.string(),
    finishedAt: z.string().optional(),
    result: z.any().optional(),
    error: ErrorResponseSchema.optional()
});

export const GetWorkflowStatusInputSchema = z.object({ runId: z.string().min(1) });
export const GetWorkflowStatusOutputSchema = RunWorkflowOutputSchema;

export const ListWorkflowsInputSchema = z.object({ limit: z.number().int().positive().max(100).default(25) });
export const ListWorkflowsOutputSchema = z.object({
    workflows: z.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional(), version: z.string().optional() }))
});

// Configuration management schemas
export const ConfigGetInputSchema = z.object({ key: z.string().min(1) });
export const ConfigGetOutputSchema = z.object({ key: z.string(), value: z.any(), source: z.enum(['env', 'file', 'runtime', 'default']).optional() });

export const ConfigSetInputSchema = z.object({ key: z.string().min(1), value: z.any(), scope: z.enum(['runtime']).default('runtime') });
export const ConfigSetOutputSchema = z.object({ key: z.string(), previous: z.any().optional(), value: z.any(), scope: z.enum(['runtime']) });

export const ConfigListInputSchema = z.object({ prefix: z.string().optional(), limit: z.number().int().positive().max(200).default(100) });
export const ConfigListOutputSchema = z.object({ items: z.array(z.object({ key: z.string(), value: z.any(), source: z.string().optional() })) });

export type ToolDefinition = {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
    outputSchema: z.ZodSchema;
    secure?: boolean; // requires elevated permission
    cacheTtlMs?: number; // optional caching hint
};

export const cortexOsMcpTools: ToolDefinition[] = [
    { name: 'system.status', description: 'Get current system/service status and resource usage', inputSchema: SystemStatusInputSchema, outputSchema: SystemStatusOutputSchema },
    { name: 'system.restart_service', description: 'Restart a managed service', inputSchema: RestartServiceInputSchema, outputSchema: RestartServiceOutputSchema, secure: true },
    { name: 'system.resources', description: 'Sample system resource usage', inputSchema: SystemResourcesInputSchema, outputSchema: SystemResourcesOutputSchema },
    { name: 'orchestration.run_workflow', description: 'Start a workflow execution', inputSchema: RunWorkflowInputSchema, outputSchema: RunWorkflowOutputSchema },
    { name: 'orchestration.get_workflow_status', description: 'Get workflow execution status', inputSchema: GetWorkflowStatusInputSchema, outputSchema: GetWorkflowStatusOutputSchema },
    { name: 'orchestration.list_workflows', description: 'List available workflows', inputSchema: ListWorkflowsInputSchema, outputSchema: ListWorkflowsOutputSchema, cacheTtlMs: 10_000 },
    { name: 'config.get', description: 'Retrieve a configuration value', inputSchema: ConfigGetInputSchema, outputSchema: ConfigGetOutputSchema },
    { name: 'config.set', description: 'Set a runtime configuration value', inputSchema: ConfigSetInputSchema, outputSchema: ConfigSetOutputSchema, secure: true },
    { name: 'config.list', description: 'List configuration values', inputSchema: ConfigListInputSchema, outputSchema: ConfigListOutputSchema, cacheTtlMs: 5_000 }
];

export type CortexOsToolName = typeof cortexOsMcpTools[number]['name'];

export function getToolDefinition(name: string): ToolDefinition | undefined {
    return cortexOsMcpTools.find(t => t.name === name);
}
