/**
 * Shared utilities for task management operations
 * Following functional programming principles and DRY patterns
 */

import { z } from 'zod';

/**
 * Task Status Enum
 */
export const TASK_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

/**
 * Task Priority Enum
 */
export const TASK_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

/**
 * Task Send Parameters Schema
 */
export const TASK_SEND_PARAMS_SCHEMA = z.object({
  type: z.string(),
  data: z.unknown(),
  target: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  ttl: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Task Get Parameters Schema
 */
export const TASK_GET_PARAMS_SCHEMA = z.object({
  taskId: z.string(),
  includeData: z.boolean().default(true),
});

/**
 * Task Cancel Parameters Schema
 */
export const TASK_CANCEL_PARAMS_SCHEMA = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

/**
 * Task List Parameters Schema
 */
export const TASK_LIST_PARAMS_SCHEMA = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0),
  target: z.string().optional(),
});

/**
 * Task Status Parameters Schema
 */
export const TASK_STATUS_PARAMS_SCHEMA = z.object({
  taskId: z.string(),
});

/**
 * Task Response Schema
 */
export const TASK_RESPONSE_SCHEMA = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  type: z.string(),
  target: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  data: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Task List Response Schema
 */
export const TASK_LIST_RESPONSE_SCHEMA = z.object({
  tasks: z.array(TASK_RESPONSE_SCHEMA),
  total: z.number().int().min(0),
  limit: z.number().int().positive(),
  offset: z.number().int().min(0),
});

/**
 * Generate unique task ID
 */
export const generateTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Check if task is in terminal state
 */
export const isTaskTerminal = (status: string): boolean => {
  return ['completed', 'failed', 'cancelled'].includes(status);
};

/**
 * Check if task can be cancelled
 */
export const canCancelTask = (status: string): boolean => {
  return !isTaskTerminal(status);
};

/**
 * Validate task parameters
 */
export const validateTaskParams = {
  send: (params: unknown) => TASK_SEND_PARAMS_SCHEMA.safeParse(params),
  get: (params: unknown) => TASK_GET_PARAMS_SCHEMA.safeParse(params),
  cancel: (params: unknown) => TASK_CANCEL_PARAMS_SCHEMA.safeParse(params),
  list: (params: unknown) => TASK_LIST_PARAMS_SCHEMA.safeParse(params),
  status: (params: unknown) => TASK_STATUS_PARAMS_SCHEMA.safeParse(params),
};

/**
 * Create task response object
 */
export const createTaskResponse = (
  taskId: string,
  type: string,
  status: string = 'pending',
  options: {
    target?: string;
    data?: unknown;
    metadata?: Record<string, unknown>;
    error?: { code: string; message: string; details?: unknown };
    result?: unknown;
  } = {},
): z.infer<typeof TASK_RESPONSE_SCHEMA> => {
  const now = getCurrentTimestamp();

  return {
    taskId,
    status: status as any,
    type,
    target: options.target,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : undefined,
    data: options.data,
    result: options.result,
    error: options.error,
    metadata: options.metadata,
  };
};

/**
 * Update task response with new status
 */
export const updateTaskStatus = (
  task: z.infer<typeof TASK_RESPONSE_SCHEMA>,
  newStatus: string,
  options: {
    error?: { code: string; message: string; details?: unknown };
    result?: unknown;
  } = {},
): z.infer<typeof TASK_RESPONSE_SCHEMA> => {
  const now = getCurrentTimestamp();

  return {
    ...task,
    status: newStatus as any,
    updatedAt: now,
    completedAt: ['completed', 'failed', 'cancelled'].includes(newStatus) ? now : task.completedAt,
    error: options.error,
    result: options.result,
  };
};
