/**
 * A2A Protocol Implementation
 * Following the official A2A protocol specification
 */

import { z } from 'zod';

// A2A Protocol Core Schemas
export const TaskIdSchema = z.string().min(1);

export const TaskStatusSchema = z.enum([
	'pending',
	'running',
	'completed',
	'failed',
	'cancelled',
]);

export const TaskSendParamsSchema = z.object({
	id: TaskIdSchema.optional(),
	message: z.object({
		role: z.enum(['user', 'assistant', 'system']),
		parts: z.array(
			z.object({
				text: z.string().optional(),
				data: z.unknown().optional(),
			}),
		),
	}),
	context: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant', 'system']),
				parts: z.array(
					z.object({
						text: z.string().optional(),
						data: z.unknown().optional(),
					}),
				),
			}),
		)
		.optional(),
});

export const TaskGetParamsSchema = z.object({
	id: TaskIdSchema,
});

export const TaskCancelParamsSchema = z.object({
	id: TaskIdSchema,
});

export const TaskResultSchema = z.object({
	id: TaskIdSchema,
	status: TaskStatusSchema,
	message: z
		.object({
			role: z.enum(['assistant']),
			parts: z.array(
				z.object({
					text: z.string().optional(),
					data: z.unknown().optional(),
				}),
			),
		})
		.optional(),
	artifacts: z
		.array(
			z.object({
				name: z.string(),
				mimeType: z.string(),
				parts: z.array(
					z.object({
						text: z.string().optional(),
						data: z.unknown().optional(),
					}),
				),
			}),
		)
		.optional(),
	error: z
		.object({
			code: z.number(),
			message: z.string(),
			data: z.unknown().optional(),
		})
		.optional(),
});

export const JsonRpcRequestSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number(), z.null()]),
	method: z.string(),
	params: z.unknown().optional(),
});

export const JsonRpcResponseSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number(), z.null()]),
	result: z.unknown().optional(),
	error: z
		.object({
			code: z.number(),
			message: z.string(),
			data: z.unknown().optional(),
		})
		.optional(),
});

// Type exports
export type TaskId = z.infer<typeof TaskIdSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskSendParams = z.infer<typeof TaskSendParamsSchema>;
export type TaskGetParams = z.infer<typeof TaskGetParamsSchema>;
export type TaskCancelParams = z.infer<typeof TaskCancelParamsSchema>;
export type TaskResult = z.infer<typeof TaskResultSchema>;
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

// A2A Protocol Error Codes
export const A2A_ERROR_CODES = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,
	TASK_NOT_FOUND: -32000,
	TASK_TIMEOUT: -32001,
	TASK_CANCELLED: -32002,
} as const;

export type A2AErrorCode =
	(typeof A2A_ERROR_CODES)[keyof typeof A2A_ERROR_CODES];
