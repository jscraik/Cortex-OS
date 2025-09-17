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
export declare const A2AMessagePartSchema: z.ZodObject<
	{
		text: z.ZodOptional<z.ZodString>;
		data: z.ZodOptional<z.ZodUnknown>;
	},
	'strip',
	z.ZodTypeAny,
	{
		text?: string | undefined;
		data?: unknown;
	},
	{
		text?: string | undefined;
		data?: unknown;
	}
>;
export declare const A2AQueueMessageInputSchema: z.ZodObject<
	{
		id: z.ZodOptional<z.ZodString>;
		message: z.ZodObject<
			{
				role: z.ZodEnum<['user', 'assistant', 'system']>;
				parts: z.ZodArray<
					z.ZodObject<
						{
							text: z.ZodOptional<z.ZodString>;
							data: z.ZodOptional<z.ZodUnknown>;
						},
						'strip',
						z.ZodTypeAny,
						{
							text?: string | undefined;
							data?: unknown;
						},
						{
							text?: string | undefined;
							data?: unknown;
						}
					>,
					'many'
				>;
			},
			'strip',
			z.ZodTypeAny,
			{
				role: 'user' | 'assistant' | 'system';
				parts: {
					text?: string | undefined;
					data?: unknown;
				}[];
			},
			{
				role: 'user' | 'assistant' | 'system';
				parts: {
					text?: string | undefined;
					data?: unknown;
				}[];
			}
		>;
		context: z.ZodOptional<
			z.ZodArray<
				z.ZodObject<
					{
						role: z.ZodEnum<['user', 'assistant', 'system']>;
						parts: z.ZodArray<
							z.ZodObject<
								{
									text: z.ZodOptional<z.ZodString>;
									data: z.ZodOptional<z.ZodUnknown>;
								},
								'strip',
								z.ZodTypeAny,
								{
									text?: string | undefined;
									data?: unknown;
								},
								{
									text?: string | undefined;
									data?: unknown;
								}
							>,
							'many'
						>;
					},
					'strip',
					z.ZodTypeAny,
					{
						role: 'user' | 'assistant' | 'system';
						parts: {
							text?: string | undefined;
							data?: unknown;
						}[];
					},
					{
						role: 'user' | 'assistant' | 'system';
						parts: {
							text?: string | undefined;
							data?: unknown;
						}[];
					}
				>,
				'many'
			>
		>;
		timeoutMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		message: {
			role: 'user' | 'assistant' | 'system';
			parts: {
				text?: string | undefined;
				data?: unknown;
			}[];
		};
		id?: string | undefined;
		context?:
			| {
					role: 'user' | 'assistant' | 'system';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
			  }[]
			| undefined;
		timeoutMs?: number | undefined;
	},
	{
		message: {
			role: 'user' | 'assistant' | 'system';
			parts: {
				text?: string | undefined;
				data?: unknown;
			}[];
		};
		id?: string | undefined;
		context?:
			| {
					role: 'user' | 'assistant' | 'system';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
			  }[]
			| undefined;
		timeoutMs?: number | undefined;
	}
>;
export type A2AQueueMessageInput = z.infer<typeof A2AQueueMessageInputSchema>;
export declare const A2AQueueMessageResultSchema: z.ZodObject<
	{
		id: z.ZodString;
		status: z.ZodEnum<
			['pending', 'running', 'completed', 'failed', 'cancelled']
		>;
		message: z.ZodOptional<
			z.ZodObject<
				{
					role: z.ZodEnum<['assistant']>;
					parts: z.ZodArray<
						z.ZodObject<
							{
								text: z.ZodOptional<z.ZodString>;
								data: z.ZodOptional<z.ZodUnknown>;
							},
							'strip',
							z.ZodTypeAny,
							{
								text?: string | undefined;
								data?: unknown;
							},
							{
								text?: string | undefined;
								data?: unknown;
							}
						>,
						'many'
					>;
				},
				'strip',
				z.ZodTypeAny,
				{
					role: 'assistant';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
				},
				{
					role: 'assistant';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
				}
			>
		>;
		error: z.ZodOptional<
			z.ZodObject<
				{
					code: z.ZodNumber;
					message: z.ZodString;
					data: z.ZodOptional<z.ZodUnknown>;
				},
				'strip',
				z.ZodTypeAny,
				{
					code: number;
					message: string;
					data?: unknown;
				},
				{
					code: number;
					message: string;
					data?: unknown;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
		id: string;
		message?:
			| {
					role: 'assistant';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
			  }
			| undefined;
		error?:
			| {
					code: number;
					message: string;
					data?: unknown;
			  }
			| undefined;
	},
	{
		status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
		id: string;
		message?:
			| {
					role: 'assistant';
					parts: {
						text?: string | undefined;
						data?: unknown;
					}[];
			  }
			| undefined;
		error?:
			| {
					code: number;
					message: string;
					data?: unknown;
			  }
			| undefined;
	}
>;
export type A2AQueueMessageResult = z.infer<typeof A2AQueueMessageResultSchema>;
export declare const A2AEventStreamSubscribeInputSchema: z.ZodObject<
	{
		events: z.ZodOptional<
			z.ZodDefault<
				z.ZodArray<
					z.ZodEnum<
						['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']
					>,
					'many'
				>
			>
		>;
		since: z.ZodOptional<z.ZodString>;
		includeCurrent: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		events?:
			| ('taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning')[]
			| undefined;
		since?: string | undefined;
		includeCurrent?: boolean | undefined;
	},
	{
		events?:
			| ('taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning')[]
			| undefined;
		since?: string | undefined;
		includeCurrent?: boolean | undefined;
	}
>;
export type A2AEventStreamSubscribeInput = z.infer<
	typeof A2AEventStreamSubscribeInputSchema
>;
export declare const A2AEventStreamEventSchema: z.ZodObject<
	{
		type: z.ZodEnum<
			['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']
		>;
		id: z.ZodString;
		status: z.ZodEnum<
			['pending', 'running', 'completed', 'failed', 'cancelled']
		>;
		timestamp: z.ZodString;
		error: z.ZodOptional<
			z.ZodObject<
				{
					code: z.ZodNumber;
					message: z.ZodString;
				},
				'strip',
				z.ZodTypeAny,
				{
					code: number;
					message: string;
				},
				{
					code: number;
					message: string;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning';
		status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
		id: string;
		timestamp: string;
		error?:
			| {
					code: number;
					message: string;
			  }
			| undefined;
	},
	{
		type: 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning';
		status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
		id: string;
		timestamp: string;
		error?:
			| {
					code: number;
					message: string;
			  }
			| undefined;
	}
>;
export type A2AEventStreamEvent = z.infer<typeof A2AEventStreamEventSchema>;
export declare const A2AEventStreamSubscribeResultSchema: z.ZodObject<
	{
		subscriptionId: z.ZodString;
		events: z.ZodOptional<
			z.ZodArray<
				z.ZodObject<
					{
						type: z.ZodEnum<
							['taskCompleted', 'taskFailed', 'taskCancelled', 'taskRunning']
						>;
						id: z.ZodString;
						status: z.ZodEnum<
							['pending', 'running', 'completed', 'failed', 'cancelled']
						>;
						timestamp: z.ZodString;
						error: z.ZodOptional<
							z.ZodObject<
								{
									code: z.ZodNumber;
									message: z.ZodString;
								},
								'strip',
								z.ZodTypeAny,
								{
									code: number;
									message: string;
								},
								{
									code: number;
									message: string;
								}
							>
						>;
					},
					'strip',
					z.ZodTypeAny,
					{
						type:
							| 'taskCompleted'
							| 'taskFailed'
							| 'taskCancelled'
							| 'taskRunning';
						status:
							| 'pending'
							| 'running'
							| 'completed'
							| 'failed'
							| 'cancelled';
						id: string;
						timestamp: string;
						error?:
							| {
									code: number;
									message: string;
							  }
							| undefined;
					},
					{
						type:
							| 'taskCompleted'
							| 'taskFailed'
							| 'taskCancelled'
							| 'taskRunning';
						status:
							| 'pending'
							| 'running'
							| 'completed'
							| 'failed'
							| 'cancelled';
						id: string;
						timestamp: string;
						error?:
							| {
									code: number;
									message: string;
							  }
							| undefined;
					}
				>,
				'many'
			>
		>;
		note: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		subscriptionId: string;
		note: string;
		events?:
			| {
					type:
						| 'taskCompleted'
						| 'taskFailed'
						| 'taskCancelled'
						| 'taskRunning';
					status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
					id: string;
					timestamp: string;
					error?:
						| {
								code: number;
								message: string;
						  }
						| undefined;
			  }[]
			| undefined;
	},
	{
		subscriptionId: string;
		note: string;
		events?:
			| {
					type:
						| 'taskCompleted'
						| 'taskFailed'
						| 'taskCancelled'
						| 'taskRunning';
					status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
					id: string;
					timestamp: string;
					error?:
						| {
								code: number;
								message: string;
						  }
						| undefined;
			  }[]
			| undefined;
	}
>;
export type A2AEventStreamSubscribeResult = z.infer<
	typeof A2AEventStreamSubscribeResultSchema
>;
export declare const A2AOutboxSyncInputSchema: z.ZodObject<
	{
		action: z.ZodEnum<
			['processPending', 'processRetries', 'cleanup', 'dlqStats']
		>;
		olderThanDays: z.ZodOptional<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		action: 'processPending' | 'processRetries' | 'cleanup' | 'dlqStats';
		olderThanDays?: number | undefined;
	},
	{
		action: 'processPending' | 'processRetries' | 'cleanup' | 'dlqStats';
		olderThanDays?: number | undefined;
	}
>;
export type A2AOutboxSyncInput = z.infer<typeof A2AOutboxSyncInputSchema>;
export declare const A2AOutboxSyncResultSchema: z.ZodObject<
	{
		action: z.ZodString;
		processed: z.ZodOptional<z.ZodNumber>;
		successful: z.ZodOptional<z.ZodNumber>;
		failed: z.ZodOptional<z.ZodNumber>;
		deadLettered: z.ZodOptional<z.ZodNumber>;
		cleanupDeleted: z.ZodOptional<z.ZodNumber>;
		dlqStats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		durationMs: z.ZodOptional<z.ZodNumber>;
		timestamp: z.ZodString;
		note: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		timestamp: string;
		action: string;
		failed?: number | undefined;
		note?: string | undefined;
		dlqStats?: Record<string, unknown> | undefined;
		processed?: number | undefined;
		successful?: number | undefined;
		deadLettered?: number | undefined;
		cleanupDeleted?: number | undefined;
		durationMs?: number | undefined;
	},
	{
		timestamp: string;
		action: string;
		failed?: number | undefined;
		note?: string | undefined;
		dlqStats?: Record<string, unknown> | undefined;
		processed?: number | undefined;
		successful?: number | undefined;
		deadLettered?: number | undefined;
		cleanupDeleted?: number | undefined;
		durationMs?: number | undefined;
	}
>;
export type A2AOutboxSyncResult = z.infer<typeof A2AOutboxSyncResultSchema>;
export declare const A2AMcpErrorSchema: z.ZodObject<
	{
		error: z.ZodObject<
			{
				code: z.ZodString;
				message: z.ZodString;
				details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				code: string;
				message: string;
				details?: Record<string, unknown> | undefined;
			},
			{
				code: string;
				message: string;
				details?: Record<string, unknown> | undefined;
			}
		>;
		timestamp: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		error: {
			code: string;
			message: string;
			details?: Record<string, unknown> | undefined;
		};
		timestamp: string;
	},
	{
		error: {
			code: string;
			message: string;
			details?: Record<string, unknown> | undefined;
		};
		timestamp: string;
	}
>;
export type A2AMcpError = z.infer<typeof A2AMcpErrorSchema>;
export declare const A2AMcpToolNames: readonly [
	'a2a_event_stream_subscribe',
	'a2a_queue_message',
	'a2a_outbox_sync',
];
export type A2AMcpToolName = (typeof A2AMcpToolNames)[number];
//# sourceMappingURL=a2a-mcp.d.ts.map
