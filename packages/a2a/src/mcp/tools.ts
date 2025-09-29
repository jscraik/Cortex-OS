import { randomUUID } from 'node:crypto';
import {
  type A2AEventStreamEvent,
  type A2AEventStreamSubscribeInput,
  A2AEventStreamSubscribeInputSchema,
  type A2AEventStreamSubscribeResult,
  A2AEventStreamSubscribeResultSchema,
  type A2AOutboxSyncInput,
  A2AOutboxSyncInputSchema,
  type A2AOutboxSyncResult,
  A2AOutboxSyncResultSchema,
  type A2AQueueMessageInput,
  A2AQueueMessageInputSchema,
  type A2AQueueMessageResult,
  A2AQueueMessageResultSchema,
} from '@cortex-os/contracts';
import type { z } from 'zod';
import type { OutboxService } from '../outbox-service.js';
import type { TaskManager } from '../task-manager.js';
import { createTaskManager } from '../task-manager.js';
import { createTaskEventStream, type TaskEventStreamOptions } from '../streaming.js';
import { TaskEventStreamRegistry } from '../streaming-registry.js';

/**
 * Simple MCP Tool interface (aligned with other packages)
 */
export interface A2AMcpTool<Params = unknown, Result = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Params>;
  handler: (input: unknown) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
    raw?: Result;
  }>;
}

const defaultTaskManager: TaskManager = createTaskManager();
const defaultStreamRegistry = new TaskEventStreamRegistry();

// Centralized error envelope creator (matches A2AMcpErrorSchema)
function buildError(code: string, message: string) {
  return {
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

// Basic span helper (no hard dependency on @cortex-os/telemetry inside this layer)
// If telemetry package is desired later, this can be replaced with a proper tracer.
interface SpanOptions {
  name: string;
  attrs?: Record<string, unknown>;
}
async function withSpan<T>(opts: SpanOptions, fn: () => Promise<T>): Promise<T> {
  const enabled = process.env.A2A_MCP_SPANS === '1';
  const start = enabled ? performance.now() : 0;
  try {
    const result = await fn();
    if (enabled) {
      console.log(
        JSON.stringify({
          span: opts.name,
          durationMs: Math.round(performance.now() - start),
          ...opts.attrs,
        }),
      );
    }
    return result;
  } catch (error) {
    if (enabled) {
      console.log(
        JSON.stringify({
          span: opts.name,
          error: error instanceof Error ? error.message : String(error),
          ...opts.attrs,
        }),
      );
    }
    throw error;
  }
}
// NOTE(telemetry-integration): Future enhancement – replace withSpan implementation by delegating
// to a tracer from @cortex-os/telemetry once that package is an approved dependency. Keep the
// withSpan signature stable and introduce an adapter during migration.

// 1. Queue Message Tool ----------------------------------------------------
function createQueueMessageTool(deps: { taskManager: TaskManager }): A2AMcpTool<
  A2AQueueMessageInput,
  A2AQueueMessageResult
> {
  return {
    name: 'a2a_queue_message',
    description:
      'Queue (send) an A2A task/message and return its initial result if completed rapidly.',
    inputSchema: A2AQueueMessageInputSchema,
    handler: async (input) =>
      withSpan({ name: 'a2a.mcp.queueMessage' }, async () => {
        let params: A2AQueueMessageInput;
        try {
          params = A2AQueueMessageInputSchema.parse(input);
        } catch (e) {
          const err = buildError(
            'VALIDATION_ERROR',
            e instanceof Error ? e.message : 'Invalid input',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }
        try {
          // Validate required parameters
          if (!params.message) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Message is required' }),
                },
              ],
            };
          }

          // Ensure message has required fields
          if (!params.message.role || !params.message.parts) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Message must have role and parts',
                  }),
                },
              ],
            };
          }

          // Validate context if provided
          if (params.context) {
            for (const ctx of params.context) {
              if (!ctx.role || !ctx.parts) {
                return {
                  isError: true,
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        error: 'Context items must have role and parts',
                      }),
                    },
                  ],
                };
              }
            }
          }

          const resultRaw = await deps.taskManager.sendTask({
            id: params.id,
            message: params.message as {
              role: 'user' | 'assistant' | 'system';
              parts: { text?: string; data?: unknown }[];
            },
            context: params.context as
              | {
                  role: 'user' | 'assistant' | 'system';
                  parts: { text?: string; data?: unknown }[];
                }[]
              | undefined,
          });
          let payload: A2AQueueMessageResult;
          try {
            payload = A2AQueueMessageResultSchema.parse(resultRaw);
          } catch (e) {
            const err = buildError(
              'RESULT_VALIDATION_ERROR',
              e instanceof Error ? e.message : 'Result invalid',
            );
            return {
              content: [{ type: 'text', text: JSON.stringify(err) }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(payload) }],
            raw: payload,
          };
        } catch (e) {
          const err = buildError(
            'QUEUE_SEND_FAILED',
            e instanceof Error ? e.message : 'Unknown error',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }
      }),
  };
}

// 2. Event Stream (Subscribe) Tool -----------------------------------------
export interface EventStreamToolDependencies {
  taskManager: TaskManager;
  registry: TaskEventStreamRegistry;
  streamOptions?: TaskEventStreamOptions;
}

function determineEventType(status: string): A2AEventStreamEvent['type'] {
  switch (status) {
    case 'failed':
      return 'taskFailed';
    case 'cancelled':
      return 'taskCancelled';
    case 'running':
      return 'taskRunning';
    default:
      return 'taskCompleted';
  }
}

export function createA2AEventStreamSubscribeTool(
  deps: EventStreamToolDependencies = { taskManager: defaultTaskManager, registry: defaultStreamRegistry },
): A2AMcpTool<A2AEventStreamSubscribeInput, A2AEventStreamSubscribeResult> {
  return {
    name: 'a2a_event_stream_subscribe',
    description:
      'Establish a live Server-Sent Events stream for brAInwav A2A task lifecycle updates.',
    inputSchema: A2AEventStreamSubscribeInputSchema,
    handler: async (input) =>
      withSpan({ name: 'a2a.mcp.eventStreamSubscribe' }, async () => {
        let params: A2AEventStreamSubscribeInput;
        try {
          params = A2AEventStreamSubscribeInputSchema.parse(input);
        } catch (e) {
          const err = buildError(
            'VALIDATION_ERROR',
            e instanceof Error ? e.message : 'Invalid input',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }

        const requestedEvents = params.events && params.events.length > 0
          ? params.events
          : ['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning'];
        const eventFilter = new Set(requestedEvents);

        const since = params.since ? new Date(params.since) : null;
        const tasks = await deps.taskManager.listTasks();
        const initialEvents: A2AEventStreamEvent[] = params.includeCurrent
          ? tasks
              .filter((task) => (since ? task.updatedAt > since : true))
              .map((task) => ({
                type: determineEventType(task.status),
                id: task.id,
                status: task.status,
                timestamp: task.updatedAt.toISOString(),
                error: task.error ? { code: task.error.code, message: task.error.message } : undefined,
              }))
              .filter((event) => eventFilter.has(event.type))
          : [];

        const subscriptionId = randomUUID();
        const stream = createTaskEventStream(deps.taskManager, {
          events: requestedEvents,
          heartbeatIntervalMs: deps.streamOptions?.heartbeatIntervalMs,
        });
        deps.registry.register(subscriptionId, stream, requestedEvents);

        let result: A2AEventStreamSubscribeResult;
        try {
          result = A2AEventStreamSubscribeResultSchema.parse({
            subscriptionId,
            events: initialEvents,
            note: `Streaming active via SSE at ${deps.registry.buildSsePath(subscriptionId)}. ` +
              'Connect using EventSource to receive real-time brAInwav task lifecycle updates.',
          });
        } catch (e) {
          const err = buildError(
            'RESULT_VALIDATION_ERROR',
            e instanceof Error ? e.message : 'Invalid result',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          raw: result,
        };
      }),
  };
}

// 3. Outbox/Data Synchronization Tool --------------------------------------
function createA2AOutboxSyncTool(deps: {
  outboxService?: OutboxService | null;
}): A2AMcpTool<A2AOutboxSyncInput, A2AOutboxSyncResult> {
  return {
    name: 'a2a_outbox_sync',
    description:
      'Perform outbox/data synchronization actions (processPending, processRetries, cleanup, dlqStats).',
    inputSchema: A2AOutboxSyncInputSchema,
    handler: (input) =>
      withSpan({ name: 'a2a.mcp.outboxSync' }, async () => {
        let params: A2AOutboxSyncInput;
        try {
          params = A2AOutboxSyncInputSchema.parse(input);
        } catch (e) {
          const err = buildError(
            'VALIDATION_ERROR',
            e instanceof Error ? e.message : 'Invalid input',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }
        const started = performance.now();
        const computeDynamic = async (): Promise<Record<string, unknown>> => {
          if (!deps.outboxService) return fallbackDynamic(params);
          switch (params.action) {
            case 'processPending':
              return (await deps.outboxService.processPending()) as unknown as Record<string, unknown>;
            case 'processRetries':
              return (await deps.outboxService.processRetries()) as unknown as Record<string, unknown>;
            case 'cleanup': {
              const r = await deps.outboxService.cleanup(params.olderThanDays);
              return { ...r, olderThanDays: params.olderThanDays ?? 30 };
            }
            case 'dlqStats': {
              const r = await deps.outboxService.dlqStats();
              return { dlqStats: r };
            }
            default:
              return {};
          }
        };

        const fallbackDynamic = (p: A2AOutboxSyncInput): Record<string, unknown> => {
          switch (p.action) {
            case 'processPending':
            case 'processRetries':
              return {
                processed: 0,
                successful: 0,
                failed: 0,
                deadLettered: 0,
              };
            case 'cleanup':
              return {
                cleanupDeleted: 0,
                olderThanDays: p.olderThanDays ?? 30,
              };
            case 'dlqStats':
              return { dlqStats: { size: 0 } };
            default:
              return {};
          }
        };

        let dynamic: Record<string, unknown> = {};
        try {
          dynamic = await computeDynamic();
        } catch (err) {
          const wrapped = buildError(
            'OUTBOX_OPERATION_FAILED',
            err instanceof Error ? err.message : 'Outbox operation failed',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(wrapped) }],
            isError: true,
          };
        }

        let payload: A2AOutboxSyncResult;
        try {
          payload = A2AOutboxSyncResultSchema.parse({
            action: params.action,
            ...dynamic,
            durationMs: Math.round(performance.now() - started),
            timestamp: new Date().toISOString(),
            note: deps.outboxService
              ? 'brAInwav OutboxService metrics generated from live processing.'
              : 'Outbox integration not yet wired. Metrics are placeholders.',
          });
        } catch (e) {
          const err = buildError(
            'RESULT_VALIDATION_ERROR',
            e instanceof Error ? e.message : 'Invalid result',
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(err) }],
            isError: true,
          };
        }
        await Promise.resolve();
        return {
          content: [{ type: 'text', text: JSON.stringify(payload) }],
          raw: payload,
        };
      }),
  };
}

// Return type is a readonly tuple of the concrete tool types to preserve specificity without using `any`.
export interface CreateA2AMcpToolsOptions {
  outboxService?: OutboxService | null;
  taskManager?: TaskManager;
  eventStreamRegistry?: TaskEventStreamRegistry;
  streamOptions?: TaskEventStreamOptions;
}

export const a2aQueueMessageTool = createQueueMessageTool({ taskManager: defaultTaskManager });
export const a2aEventStreamSubscribeTool = createA2AEventStreamSubscribeTool();

export function createA2AMcpTools(
  opts: CreateA2AMcpToolsOptions = {},
): ReadonlyArray<
  | ReturnType<typeof createQueueMessageTool>
  | ReturnType<typeof createA2AEventStreamSubscribeTool>
  | ReturnType<typeof createA2AOutboxSyncTool>
> {
  const manager = opts.taskManager ?? defaultTaskManager;
  const registry = opts.eventStreamRegistry ?? defaultStreamRegistry;

  const queueTool = createQueueMessageTool({ taskManager: manager });

  const streamTool = createA2AEventStreamSubscribeTool({
    taskManager: manager,
    registry,
    streamOptions: opts.streamOptions,
  });

  const outboxTool = createA2AOutboxSyncTool({
    outboxService: opts.outboxService,
  });

  return [queueTool, streamTool, outboxTool] as const;
}

// Export factory for targeted usage
export { createA2AOutboxSyncTool };
