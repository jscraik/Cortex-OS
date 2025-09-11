/**
 * JSON-RPC 2.0 Handler for A2A Protocol
 * Implements proper JSON-RPC message handling with A2A methods
 */

import { z } from 'zod';
import {
	A2A_ERROR_CODES,
	type JsonRpcRequest,
	JsonRpcRequestSchema,
	type JsonRpcResponse,
	TaskCancelParamsSchema,
	TaskGetParamsSchema,
	TaskSendParamsSchema,
} from './protocol.js';
import { TaskManager } from './task-manager.js';

// Simple implementations for dependencies that don't exist yet
class StructuredError extends Error {
	constructor(
		public code: string,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'StructuredError';
	}
}

const createJsonOutput = (data: unknown): string =>
	JSON.stringify(data, null, 2);

export interface RpcHandler {
	handle(request: JsonRpcRequest): Promise<JsonRpcResponse>;
}

export class A2ARpcHandler implements RpcHandler {
	constructor(private readonly taskManager: TaskManager) {}

	async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
		try {
			const result = await this.dispatchMethod(request);
			return {
				jsonrpc: '2.0',
				id: request.id,
				result,
			};
		} catch (error) {
			return this.createErrorResponse(request.id, error);
		}
	}

	private async dispatchMethod(request: JsonRpcRequest): Promise<unknown> {
		switch (request.method) {
			case 'tasks/send': {
				const params = TaskSendParamsSchema.parse(request.params);
				return this.taskManager.sendTask(params);
			}

			case 'tasks/get': {
				const params = TaskGetParamsSchema.parse(request.params);
				return this.taskManager.getTask(params);
			}

			case 'tasks/cancel': {
				const params = TaskCancelParamsSchema.parse(request.params);
				await this.taskManager.cancelTask(params);
				return { success: true };
			}

			case 'tasks/list': {
				// Utility method for debugging
				const status =
					request.params &&
					typeof request.params === 'object' &&
					'status' in request.params
						? (request.params.status as any)
						: undefined;
				return this.taskManager.listTasks(status);
			}

			default:
				throw new StructuredError(
					'METHOD_NOT_FOUND',
					`Method '${request.method}' not found`,
					{
						method: request.method,
						code: A2A_ERROR_CODES.METHOD_NOT_FOUND,
					},
				);
		}
	}

	private createErrorResponse(
		id: JsonRpcRequest['id'],
		error: unknown,
	): JsonRpcResponse {
		if (error instanceof z.ZodError) {
			return {
				jsonrpc: '2.0',
				id,
				error: {
					code: A2A_ERROR_CODES.INVALID_PARAMS,
					message: 'Invalid parameters',
					data: { issues: error.issues },
				},
			};
		}

		// Handle StructuredError - check by name to avoid instanceof issues
		if (error instanceof Error && error.name === 'StructuredError') {
			const structuredError = error as any; // Cast to access custom properties

			// Map StructuredError codes to A2A error codes
			let errorCode: number = A2A_ERROR_CODES.INTERNAL_ERROR;
			if (structuredError.code === 'TASK_NOT_FOUND') {
				errorCode = A2A_ERROR_CODES.TASK_NOT_FOUND;
			} else if (structuredError.code === 'METHOD_NOT_FOUND') {
				errorCode = A2A_ERROR_CODES.METHOD_NOT_FOUND;
			}

			return {
				jsonrpc: '2.0',
				id,
				error: {
					code: errorCode,
					message: error.message,
					data: structuredError.details,
				},
			};
		}

		return {
			jsonrpc: '2.0',
			id,
			error: {
				code: A2A_ERROR_CODES.INTERNAL_ERROR,
				message: error instanceof Error ? error.message : 'Internal error',
				data: error instanceof Error ? { stack: error.stack } : error,
			},
		};
	}
}

// Global task manager instance for stateful operations
let globalTaskManager: TaskManager | undefined;

// Main handler function for the package
export async function handleA2A(input: unknown): Promise<string> {
	try {
		// Parse JSON-RPC request
		const parseResult = JsonRpcRequestSchema.safeParse(input);
		if (!parseResult.success) {
			const errorResponse: JsonRpcResponse = {
				jsonrpc: '2.0',
				id: null,
				error: {
					code: A2A_ERROR_CODES.INVALID_REQUEST,
					message: 'Invalid JSON-RPC request',
					data: { issues: parseResult.error.issues },
				},
			};
			return createJsonOutput(errorResponse);
		}

		const request = parseResult.data;

		// Use global task manager to maintain state across requests
		if (!globalTaskManager) {
			globalTaskManager = new TaskManager();
		}
		const rpcHandler = new A2ARpcHandler(globalTaskManager);

		// Handle the request
		const response = await rpcHandler.handle(request);

		return createJsonOutput(response);
	} catch (error) {
		// Fallback error response
		const errorResponse: JsonRpcResponse = {
			jsonrpc: '2.0',
			id: null,
			error: {
				code: A2A_ERROR_CODES.INTERNAL_ERROR,
				message: error instanceof Error ? error.message : 'Unknown error',
				data: error instanceof Error ? { stack: error.stack } : error,
			},
		};

		return createJsonOutput(errorResponse);
	}
}

// Factory function
export const createA2ARpcHandler = (
	taskManager?: TaskManager,
): A2ARpcHandler => {
	return new A2ARpcHandler(taskManager || new TaskManager());
};
