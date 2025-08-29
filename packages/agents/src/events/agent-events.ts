/**
 * Agent Event Schemas and Types
 *
 * CloudEvents 1.0 compatible event definitions for agent lifecycle,
 * provider interactions, and system monitoring.
 */

import { z } from 'zod';

// Base event structure following CloudEvents 1.0 spec
export const baseEventSchema = z.object({
  type: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().optional(),
  source: z.string().optional(),
  id: z.string().optional(),
});

// Agent lifecycle events
export const agentStartedEventSchema = z.object({
  type: z.literal('agent.started'),
  data: z.object({
    agentId: z.string(),
    traceId: z.string(),
    capability: z.string(),
    input: z.any(),
    timestamp: z.string(),
  }),
});

export const agentCompletedEventSchema = z.object({
  type: z.literal('agent.completed'),
  data: z.object({
    agentId: z.string(),
    traceId: z.string(),
    capability: z.string(),
    metrics: z.object({
      latencyMs: z.number(),
      tokensUsed: z.number().optional(),
      testCount: z.number().optional(),
    }),
    timestamp: z.string(),
  }),
});

export const agentFailedEventSchema = z.object({
  type: z.literal('agent.failed'),
  data: z.object({
    agentId: z.string(),
    traceId: z.string(),
    capability: z.string(),
    error: z.string(),
    metrics: z.object({
      latencyMs: z.number(),
    }),
    timestamp: z.string(),
  }),
});

// Provider events
export const providerSuccessEventSchema = z.object({
  type: z.literal('provider.success'),
  data: z.object({
    providerId: z.string(),
    modelId: z.string(),
    latencyMs: z.number(),
    tokensUsed: z.number(),
    timestamp: z.string(),
  }),
});

export const providerFailbackEventSchema = z.object({
  type: z.literal('provider.fallback'),
  data: z.object({
    fromProvider: z.string(),
    toProvider: z.string(),
    reason: z.string(),
    timestamp: z.string(),
  }),
});

// System monitoring events
export const thermalThrottleEventSchema = z.object({
  type: z.literal('system.thermal_throttle'),
  data: z.object({
    temperature: z.number(),
    throttleLevel: z.enum(['none', 'light', 'moderate', 'severe']),
    timestamp: z.string(),
  }),
});

export const memoryPressureEventSchema = z.object({
  type: z.literal('system.memory_pressure'),
  data: z.object({
    memoryUsage: z.number(),
    pressureLevel: z.enum(['normal', 'warning', 'critical']),
    timestamp: z.string(),
  }),
});

// MCP events
export const mcpServerConnectedEventSchema = z.object({
  type: z.literal('mcp.server_connected'),
  data: z.object({
    serverId: z.string(),
    serverName: z.string(),
    capabilities: z.array(z.string()),
    timestamp: z.string(),
  }),
});

export const mcpServerDisconnectedEventSchema = z.object({
  type: z.literal('mcp.server_disconnected'),
  data: z.object({
    serverId: z.string(),
    reason: z.string(),
    timestamp: z.string(),
  }),
});

// Type exports
export type AgentStartedEvent = z.infer<typeof agentStartedEventSchema>;
export type AgentCompletedEvent = z.infer<typeof agentCompletedEventSchema>;
export type AgentFailedEvent = z.infer<typeof agentFailedEventSchema>;
export type ProviderSuccessEvent = z.infer<typeof providerSuccessEventSchema>;
export type ProviderFallbackEvent = z.infer<typeof providerFailbackEventSchema>;
export type ThermalThrottleEvent = z.infer<typeof thermalThrottleEventSchema>;
export type MemoryPressureEvent = z.infer<typeof memoryPressureEventSchema>;
export type MCPServerConnectedEvent = z.infer<typeof mcpServerConnectedEventSchema>;
export type MCPServerDisconnectedEvent = z.infer<typeof mcpServerDisconnectedEventSchema>;

export type EventType =
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'provider.success'
  | 'provider.fallback'
  | 'system.thermal_throttle'
  | 'system.memory_pressure'
  | 'mcp.server_connected'
  | 'mcp.server_disconnected';

// Agent event catalog for discovery and documentation
export const agentEventCatalog = {
  'agent.started': agentStartedEventSchema,
  'agent.completed': agentCompletedEventSchema,
  'agent.failed': agentFailedEventSchema,
  'provider.success': providerSuccessEventSchema,
  'provider.fallback': providerFailbackEventSchema,
  'system.thermal_throttle': thermalThrottleEventSchema,
  'system.memory_pressure': memoryPressureEventSchema,
  'mcp.server_connected': mcpServerConnectedEventSchema,
  'mcp.server_disconnected': mcpServerDisconnectedEventSchema,
} as const;
