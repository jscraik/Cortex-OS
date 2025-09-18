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

/**
 * Simple MCP Tool interface (aligned with other packages)‏‏‎
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

// Internal singleton task manager (will be replaced by DI in integration phase)
const taskManager: TaskManager = createTaskManager();

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
async function withSpan<T>(
	opts: SpanOptions,
	fn: () => Promise<T>,
): Promise<T> {
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
export const a2aQueueMessageTool: A2AMcpTool<
	A2AQueueMessageInput,
	A2AQueueMessageResult
> = {
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

				const resultRaw = await taskManager.sendTask({
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

// 2. Event Stream (Subscribe) Tool -----------------------------------------
export const a2aEventStreamSubscribeTool: A2AMcpTool<
	A2AEventStreamSubscribeInput,
	A2AEventStreamSubscribeResult
> = {
	name: 'a2a_event_stream_subscribe',
	description:
		'Establish an event stream subscription for A2A task lifecycle events (currently returns snapshot; streaming TODO).',
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
			const tasks = await taskManager.listTasks();

			function mapTaskStatus(status: string): A2AEventStreamEvent['type'] {
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

			const events: A2AEventStreamEvent[] = params.includeCurrent
				? tasks.map((t) => ({
						type: mapTaskStatus(t.status),
						id: t.id,
						status: t.status,
						timestamp: t.updatedAt.toISOString(),
						error: t.error
							? { code: t.error.code, message: t.error.message }
							: undefined,
					}))
				: [];

			let result: A2AEventStreamSubscribeResult;
			try {
				result = A2AEventStreamSubscribeResultSchema.parse({
					subscriptionId: randomUUID(),
					events,
					note: 'Streaming over MCP not yet implemented; returning snapshot only.',
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

// 3. Outbox/Data Synchronization Tool --------------------------------------
// NOTE(outbox-integration): Pending wiring to real persistent outbox & DLQ subsystem (see OUTBOX_INTEGRATION_ISSUE_TEMPLATE.md).
// Planned steps:
// 1. Inject an OutboxService (domain) via factory/DI instead of using inline placeholder logic.
// 2. Implement actions:
//    - processPending: dequeue and dispatch pending envelopes (respecting retry/backoff policy).
//    - processRetries: reprocess failed entries with exponential backoff windows.
//    - cleanup: purge succeeded + aged failed entries older than olderThanDays (default 30).
//    - dlqStats: aggregate DLQ metrics (count, oldestAgeMs, recentFailureCodes histogram).
// 3. Emit telemetry (OpenTelemetry spans + counters) for each action with success/failure tags.
// 4. Add contract tests once real metrics are returned (update A2AOutboxSyncResultSchema if needed with OPTIONAL new fields only).
// 5. Add negative path tests simulating transient storage errors (map to RESULT_VALIDATION_ERROR vs QUEUE_SEND_FAILED taxonomy if refined).
// 6. Replace placeholder note with dynamic note summarizing processing outcome.
// 7. Link follow-up issue ID here once created (e.g., cortex-os#<issue-number>).
function createA2AOutboxSyncTool(deps: {
	outboxService?: OutboxService | null;
}): A2AMcpTool<A2AOutboxSyncInput, A2AOutboxSyncResult> {
	return {
		name: 'a2a_outbox_sync',
		description:
			'Perform outbox/data synchronization actions (processPending, processRetries, cleanup, dlqStats). Uses injected OutboxService when available, else returns stub metrics.',
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
							return (await deps.outboxService.processPending()) as unknown as Record<
								string,
								unknown
							>;
						case 'processRetries':
							return (await deps.outboxService.processRetries()) as unknown as Record<
								string,
								unknown
							>;
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

				const fallbackDynamic = (
					p: A2AOutboxSyncInput,
				): Record<string, unknown> => {
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
							? 'OutboxService metrics (may be partial until full integration).'
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
}

export function createA2AMcpTools(
	opts: CreateA2AMcpToolsOptions = {},
): ReadonlyArray<
	| typeof a2aQueueMessageTool
	| typeof a2aEventStreamSubscribeTool
	| ReturnType<typeof createA2AOutboxSyncTool>
> {
	const outboxTool = createA2AOutboxSyncTool({
		outboxService: opts.outboxService,
	});
	return [
		a2aQueueMessageTool,
		a2aEventStreamSubscribeTool,
		outboxTool,
	] as const;
}

// Export factory for targeted usage
export { createA2AOutboxSyncTool };
