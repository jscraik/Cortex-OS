/**
 * A2A (Agent-to-Agent) Protocol Implementation
 * 
 * This package implements the official A2A protocol specification with:
 * - JSON-RPC 2.0 compliant message handling
 * - Standard A2A methods (tasks/send, tasks/get, tasks/cancel)
 * - Proper error codes and responses
 * - Task lifecycle management
 * 
 * Usage:
 *   import { handleA2A } from '@cortex-os/a2a';
 *   const response = await handleA2A(jsonRpcRequest);
 */

// Main handler
export { handleA2A } from './rpc-handler.js';

// Re-export core types and schemas
export type {
  TaskId,
  TaskStatus,
  TaskSendParams,
  TaskGetParams,
  TaskCancelParams,
  TaskResult,
  JsonRpcRequest,
  JsonRpcResponse,
  A2AErrorCode,
} from './protocol.js';

export {
  TaskIdSchema,
  TaskStatusSchema,
  TaskSendParamsSchema,
  TaskGetParamsSchema,
  TaskCancelParamsSchema,
  TaskResultSchema,
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  A2A_ERROR_CODES,
} from './protocol.js';

// Re-export task management
export type { Task, TaskStore, TaskProcessor } from './task-manager.js';
export { 
  TaskManager,
  InMemoryTaskStore,
  EchoTaskProcessor,
  createTaskManager,
} from './task-manager.js';

// Re-export RPC handling
export type { RpcHandler } from './rpc-handler.js';
export { A2ARpcHandler, createA2ARpcHandler } from './rpc-handler.js';

// Default export for convenience  
import { handleA2A } from './rpc-handler.js';
export default { handleA2A };
