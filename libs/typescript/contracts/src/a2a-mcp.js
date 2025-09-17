import { z } from 'zod';
/**
 * A2A MCP Tool Contracts
 *
 * These schemas define the inputs/outputs for MCP tools that expose
 * Agent-to-Agent (A2A) capabilities (task queueing, event streaming,
 * and outbox synchronization) to external agent runtimes via the
 * Model Context Protocol.
 *
 * NOTE: These contracts are intentionally generic and do not import
 * internal a2a package runtime types to preserve boundary integrity.
 */
// Shared message part schema (minimal subset)
export const A2AMessagePartSchema = z.object({
    text: z.string().optional(),
    data: z.unknown().optional(),
});
// Message envelope used for queueing tasks/messages
export const A2AQueueMessageInputSchema = z.object({
    id: z.string().uuid().optional().describe('Client supplied id (optional).'),
    message: z
        .object({
        role: z.enum(['user', 'assistant', 'system']).describe('Actor role'),
        parts: z
            .array(A2AMessagePartSchema)
            .min(1)
            .max(32)
            .describe('Ordered message parts'),
    })
        .describe('Primary message payload'),
    context: z
        .array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        parts: z.array(A2AMessagePartSchema).min(1).max(32),
    }))
        .max(50)
        .optional()
        .describe('Conversation context for processors'),
    timeoutMs: z
        .number()
        .int()
        .positive()
        .max(120_000)
        .default(30_000)
        .optional()
        .describe('Hard timeout for task execution'),
});
export const A2AQueueMessageResultSchema = z.object({
    id: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    message: z
        .object({
        role: z.enum(['assistant']),
        parts: z.array(A2AMessagePartSchema),
    })
        .optional(),
    error: z
        .object({
        code: z.number(),
        message: z.string(),
        data: z.unknown().optional(),
    })
        .optional(),
});
// Event stream subscription (initial handshake)
export const A2AEventStreamSubscribeInputSchema = z.object({
    events: z
        .array(z.enum(['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']))
        .default(['taskCompleted', 'taskFailed'])
        .optional(),
    since: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Return events occurring after this timestamp'),
    includeCurrent: z
        .boolean()
        .default(true)
        .optional()
        .describe('Include a snapshot of current tasks.'),
});
export const A2AEventStreamEventSchema = z.object({
    type: z.enum(['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']),
    id: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
    timestamp: z.string().datetime({ offset: true }),
    error: z.object({ code: z.number(), message: z.string() }).optional(),
});
export const A2AEventStreamSubscribeResultSchema = z.object({
    subscriptionId: z.string().uuid(),
    events: z.array(A2AEventStreamEventSchema).optional(),
    note: z
        .string()
        .describe('Informational note about streaming mechanism / limits.'),
});
// Outbox/data synchronization operations
export const A2AOutboxSyncInputSchema = z.object({
    action: z
        .enum(['processPending', 'processRetries', 'cleanup', 'dlqStats'])
        .describe('Synchronization action to perform'),
    olderThanDays: z
        .number()
        .int()
        .positive()
        .max(365)
        .optional()
        .describe('For cleanup action only.'),
});
export const A2AOutboxSyncResultSchema = z.object({
    action: z.string(),
    processed: z.number().int().nonnegative().optional(),
    successful: z.number().int().nonnegative().optional(),
    failed: z.number().int().nonnegative().optional(),
    deadLettered: z.number().int().nonnegative().optional(),
    cleanupDeleted: z.number().int().nonnegative().optional(),
    dlqStats: z.record(z.unknown()).optional(),
    // NOTE(outbox-integration-future-metrics): When real outbox integration lands, add OPTIONAL metrics only:
    //   oldestAgeMs?: number (age in ms of oldest pending or DLQ entry)
    //   byErrorCode?: Record<string, { count: number; lastSeen: string }>
    // Keep fields optional to avoid breaking consumers. Add integration tests for presence/absence.
    durationMs: z.number().int().nonnegative().optional(),
    timestamp: z.string().datetime({ offset: true }),
    note: z.string().optional(),
});
// Standardized error payload for MCP tool failures (re-export shape rather than import to avoid cycle)
export const A2AMcpErrorSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
    }),
    timestamp: z.string().datetime({ offset: true }),
});
// Export union helpers for potential future discriminated parsing
export const A2AMcpToolNames = [
    'a2a_event_stream_subscribe',
    'a2a_queue_message',
    'a2a_outbox_sync',
];
//# sourceMappingURL=a2a-mcp.js.map