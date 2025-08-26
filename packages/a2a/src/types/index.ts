/**
 * @file A2A Types Index
 * @description Re-exports all A2A protocol types from organized modules
 * This replaces the massive external-types.ts file with better organization
 */

// Core agent types
export * from './core.js';

// Security and authentication types  
export * from './security.js';

// JSON-RPC base types
export * from './jsonrpc.js';

// Error types
export * from './errors.js';

// Re-export essential types from external-types.ts that haven't been migrated yet
// This maintains backward compatibility during the gradual migration
export type {
  SendMessageRequest,
  SendMessageSuccessResponse, 
  SendMessageResponse,
  Message,
  Task,
  TaskStatus,
  TaskState,
  MessageSendParams,
  Part,
  TextPart,
  FilePart,
  DataPart,
  PartBase,
  AgentCapabilities
} from '../external-types.js';

// Re-export AgentCapability from validation module
export type { AgentCapability } from '../validation.js';