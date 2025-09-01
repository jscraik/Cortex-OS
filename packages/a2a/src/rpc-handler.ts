/**
 * JSON-RPC 2.0 Handler for A2A Protocol
 * Implements proper JSON-RPC message handling with A2A methods
 */

import { z } from 'zod';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcRequestSchema,
  TaskSendParamsSchema,
  TaskGetParamsSchema,
  TaskCancelParamsSchema,
  A2A_ERROR_CODES,
} from './protocol.js';
import { TaskManager } from './task-manager.js';

class StructuredError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'StructuredError';
  }
}

const createJsonOutput = (data: unknown): string => JSON.stringify(data, null, 2);

export interface RpcHandler {
  handle(request: JsonRpcRequest): Promise<JsonRpcResponse>;
}

export class A2ARpcHandler implements RpcHandler {
  constructor(private readonly taskManager: TaskManager) {}

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      const result = await dispatchMethod(this.taskManager, request);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (error) {
      return createErrorResponse(request.id, error);
    }
  }
}

const dispatchMethod = async (tm: TaskManager, request: JsonRpcRequest): Promise<unknown> => {
  switch (request.method) {
    case 'tasks/send':
      return tm.sendTask(TaskSendParamsSchema.parse(request.params));
    case 'tasks/get':
      return tm.getTask(TaskGetParamsSchema.parse(request.params));
    case 'tasks/cancel':
      await tm.cancelTask(TaskCancelParamsSchema.parse(request.params));
      return { success: true };
    case 'tasks/list':
      return tm.listTasks((request.params as any)?.status);
    default:
      throw new StructuredError(
        'METHOD_NOT_FOUND',
        `Method '${request.method}' not found`,
        { method: request.method, code: A2A_ERROR_CODES.METHOD_NOT_FOUND },
      );
  }
};

const createErrorResponse = (id: JsonRpcRequest['id'], error: unknown): JsonRpcResponse => {
  if (error instanceof z.ZodError) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: A2A_ERROR_CODES.INVALID_PARAMS, message: 'Invalid parameters', data: { issues: error.issues } },
    };
  }
  if (error instanceof Error && error.name === 'StructuredError') {
    const e: any = error;
    let code = A2A_ERROR_CODES.INTERNAL_ERROR;
    if (e.code === 'TASK_NOT_FOUND') code = A2A_ERROR_CODES.TASK_NOT_FOUND;
    else if (e.code === 'METHOD_NOT_FOUND') code = A2A_ERROR_CODES.METHOD_NOT_FOUND;
    return { jsonrpc: '2.0', id, error: { code, message: error.message, data: e.details } };
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
};

const parseRequest = (input: unknown): JsonRpcRequest | JsonRpcResponse => {
  const result = JsonRpcRequestSchema.safeParse(input);
  if (result.success) return result.data;
  return {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: A2A_ERROR_CODES.INVALID_REQUEST,
      message: 'Invalid JSON-RPC request',
      data: { issues: result.error.issues },
    },
  };
};

export async function handleA2A(input: unknown, taskManager: TaskManager = new TaskManager()): Promise<string> {
  try {
    const parsed = parseRequest(input);
    if ('method' in parsed) {
      const handler = new A2ARpcHandler(taskManager);
      const response = await handler.handle(parsed);
      return createJsonOutput(response);
    }
    return createJsonOutput(parsed);
  } catch (error) {
    return createJsonOutput({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: A2A_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: error instanceof Error ? { stack: error.stack } : error,
      },
    });
  }
}

export const createA2ARpcHandler = (taskManager?: TaskManager): A2ARpcHandler =>
  new A2ARpcHandler(taskManager || new TaskManager());
