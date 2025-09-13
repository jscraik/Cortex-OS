import { z } from 'zod';

// Agent toolkit events for A2A communication
export const toolExecutionStartedEventSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  operation: z.string(),
  inputs: z.record(z.any()),
  requestedBy: z.string(),
  sessionId: z.string().optional(),
});

export const toolExecutionCompletedEventSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  operation: z.string(),
  inputs: z.record(z.any()),
  results: z.any(),
  duration: z.number(),
  requestedBy: z.string(),
  sessionId: z.string().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const toolExecutionFailedEventSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  operation: z.string(),
  inputs: z.record(z.any()),
  error: z.string(),
  duration: z.number(),
  requestedBy: z.string(),
  sessionId: z.string().optional(),
});

// Type exports
export type ToolExecutionStartedEvent = z.infer<typeof toolExecutionStartedEventSchema>;
export type ToolExecutionCompletedEvent = z.infer<typeof toolExecutionCompletedEventSchema>;
export type ToolExecutionFailedEvent = z.infer<typeof toolExecutionFailedEventSchema>;