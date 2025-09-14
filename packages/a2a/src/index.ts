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

// ACL, Redaction, Replay utilities
export { createTopicAcl, TopicAcl } from './acl.js';
// In-memory outbox repository
export { InMemoryOutboxRepository } from './in-memory-outbox-repository.js';
export type { A2AOutboxIntegration } from './outbox-integration.js';
// Outbox integration
export { createA2AOutboxIntegration } from './outbox-integration.js';
export type {
	A2AErrorCode,
	JsonRpcRequest,
	JsonRpcResponse,
	TaskCancelParams,
	TaskGetParams,
	TaskId,
	TaskResult,
	TaskSendParams,
	TaskStatus,
} from './protocol.js';
// Re-export core types and schemas
export {
	A2A_ERROR_CODES,
	JsonRpcRequestSchema,
	JsonRpcResponseSchema,
	TaskCancelParamsSchema,
	TaskGetParamsSchema,
	TaskIdSchema,
	TaskResultSchema,
	TaskSendParamsSchema,
	TaskStatusSchema,
} from './protocol.js';
export { createRedactor, Redactor } from './redaction.js';
export { replayPending } from './replay.js';
// Re-export RPC handling
export type { RpcHandler } from './rpc-handler.js';
// Main handler
export {
	A2ARpcHandler,
	createA2ARpcHandler,
	handleA2A,
} from './rpc-handler.js';
// SQLite outbox repository
export { SqliteOutboxRepository } from './sqlite-outbox-repository.js';
// Streaming utilities
export { createTaskEventStream } from './streaming.js';
export type { Task, TaskProcessor, TaskStore } from './task-manager.js';
// Re-export task management
export {
	createTaskManager,
	EchoTaskProcessor,
	InMemoryTaskStore,
	TaskManager,
} from './task-manager.js';

// handleA2A is already exported above in the main handler block
