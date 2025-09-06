/**
 * Agent Event Schemas and Types
 *
 * CloudEvents 1.0 compatible event definitions for agent lifecycle,
 * provider interactions, and system monitoring.
 */

import { z } from "zod";

// Base event structure following CloudEvents 1.0 spec
export const baseEventSchema = z.object({
        specversion: z.literal("1.0"),
        type: z.string(),
        data: z.record(z.any()),
        timestamp: z.string().datetime().optional(),
        source: z.string().optional(),
        id: z.string().optional(),
});

// Agent lifecycle events
export const agentStartedEventSchema = baseEventSchema.extend({
        type: z.literal("agent.started"),
        data: z.object({
                agentId: z.string(),
                traceId: z.string(),
                capability: z.string(),
                input: z.any(),
                timestamp: z.string().datetime(),
        }),
});

export const agentCompletedEventSchema = baseEventSchema.extend({
        type: z.literal("agent.completed"),
        data: z.object({
                agentId: z.string(),
                traceId: z.string(),
                capability: z.string(),
                result: z.unknown(),
                evidence: z.array(z.string()),
                metrics: z.object({
                        latencyMs: z.number(),
                        tokensUsed: z.number().optional(),
                        testCount: z.number().optional(),
                        suggestionsCount: z.number().optional(),
                }),
                timestamp: z.string().datetime(),
        }),
});

export const agentFailedEventSchema = baseEventSchema.extend({
        type: z.literal("agent.failed"),
        data: z.object({
                agentId: z.string(),
                traceId: z.string(),
                capability: z.string(),
                error: z.string(),
                errorCode: z.string().optional(),
                status: z.number().optional(),
                metrics: z.object({
                        latencyMs: z.number(),
                }),
                timestamp: z.string().datetime(),
        }),
});

// Provider events
export const providerSuccessEventSchema = baseEventSchema.extend({
        type: z.literal("provider.success"),
        data: z.object({
                providerId: z.string(),
                modelId: z.string(),
                latencyMs: z.number(),
                tokensUsed: z.number(),
                timestamp: z.string().datetime(),
        }),
});

export const providerFallbackEventSchema = baseEventSchema.extend({
        type: z.literal("provider.fallback"),
        data: z.object({
                fromProvider: z.string(),
                toProvider: z.string(),
                reason: z.string(),
                timestamp: z.string().datetime(),
        }),
});

// System monitoring events
export const thermalThrottleEventSchema = baseEventSchema.extend({
        type: z.literal("system.thermal_throttle"),
        data: z.object({
                temperature: z.number(),
                throttleLevel: z.enum(["none", "light", "moderate", "severe"]),
                timestamp: z.string().datetime(),
        }),
});

export const memoryPressureEventSchema = baseEventSchema.extend({
        type: z.literal("system.memory_pressure"),
        data: z.object({
                memoryUsage: z.number(),
                pressureLevel: z.enum(["normal", "warning", "critical"]),
                timestamp: z.string().datetime(),
        }),
});

// MCP events
export const mcpServerConnectedEventSchema = baseEventSchema.extend({
        type: z.literal("mcp.server_connected"),
        data: z.object({
                serverId: z.string(),
                serverName: z.string(),
                capabilities: z.array(z.string()),
                timestamp: z.string(),
        }),
});

export const mcpServerDisconnectedEventSchema = baseEventSchema.extend({
        type: z.literal("mcp.server_disconnected"),
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
export type ProviderFallbackEvent = z.infer<typeof providerFallbackEventSchema>;
export type ThermalThrottleEvent = z.infer<typeof thermalThrottleEventSchema>;
export type MemoryPressureEvent = z.infer<typeof memoryPressureEventSchema>;
export type MCPServerConnectedEvent = z.infer<
	typeof mcpServerConnectedEventSchema
>;
export type MCPServerDisconnectedEvent = z.infer<
	typeof mcpServerDisconnectedEventSchema
>;

export type EventType =
	| "agent.started"
	| "agent.completed"
	| "agent.failed"
	| "provider.success"
	| "provider.fallback"
	| "system.thermal_throttle"
	| "system.memory_pressure"
	| "mcp.server_connected"
	| "mcp.server_disconnected"
	| "workflow.started"
	| "workflow.completed"
	| "workflow.cancelled"
	| "security.dependabot_config_loaded"
	| "security.dependabot_assessed";

// Agent event catalog for discovery and documentation
export const agentEventCatalog = {
	"agent.started": agentStartedEventSchema,
	"agent.completed": agentCompletedEventSchema,
	"agent.failed": agentFailedEventSchema,
	"provider.success": providerSuccessEventSchema,
	"provider.fallback": providerFallbackEventSchema,
	"system.thermal_throttle": thermalThrottleEventSchema,
	"system.memory_pressure": memoryPressureEventSchema,
	"mcp.server_connected": mcpServerConnectedEventSchema,
	"mcp.server_disconnected": mcpServerDisconnectedEventSchema,
        "workflow.started": baseEventSchema.extend({
                type: z.literal("workflow.started"),
                data: z.object({
                        workflowId: z.string(),
                        name: z.string(),
                        tasksCount: z.number(),
                        timestamp: z.string().datetime(),
                }),
        }),
        "workflow.completed": baseEventSchema.extend({
                type: z.literal("workflow.completed"),
                data: z.object({
                        workflowId: z.string(),
                        status: z.enum(["completed", "failed", "timeout", "cancelled"]),
                        metrics: z.object({
                                totalTime: z.number(),
                                tasksCompleted: z.number(),
                                tasksTotal: z.number(),
                                agentsUsed: z.array(z.string()),
                        }),
                        timestamp: z.string().datetime(),
                }),
        }),
        "workflow.cancelled": baseEventSchema.extend({
                type: z.literal("workflow.cancelled"),
                data: z.object({
                        workflowId: z.string(),
                        timestamp: z.string().datetime(),
                }),
        }),
        "security.dependabot_config_loaded": baseEventSchema.extend({
                type: z.literal("security.dependabot_config_loaded"),
                data: z.object({
                        path: z.string(),
                        projects: z.array(
                                z.object({
                                        packageEcosystem: z.string(),
                                        directory: z.string(),
                                        scheduleInterval: z.string().optional(),
                                }),
                        ),
                        timestamp: z.string(),
                }),
        }),
        "security.dependabot_assessed": baseEventSchema.extend({
                type: z.literal("security.dependabot_assessed"),
                data: z.object({
                        path: z.string(),
                        totalProjects: z.number(),
                        dailyOrWeekly: z.number(),
                        monthlyOrOther: z.number(),
                        hasGithubActions: z.boolean(),
                        hasJsEcosystem: z.boolean(),
                        weakProjects: z.array(
                                z.object({
                                        packageEcosystem: z.string(),
                                        directory: z.string(),
                                        scheduleInterval: z.string().optional(),
                                }),
                        ),
                        score: z.number(),
                        timestamp: z.string(),
                }),
        }),
} as const;

// Unified AgentEvent union for event bus typing
export type AgentEvent =
	| AgentStartedEvent
	| AgentCompletedEvent
	| AgentFailedEvent
	| ProviderSuccessEvent
	| ProviderFallbackEvent
	| ThermalThrottleEvent
	| MemoryPressureEvent
	| MCPServerConnectedEvent
	| MCPServerDisconnectedEvent
	| z.infer<(typeof agentEventCatalog)["security.dependabot_config_loaded"]>
	| z.infer<(typeof agentEventCatalog)["security.dependabot_assessed"]>
	| z.infer<(typeof agentEventCatalog)["workflow.started"]>
	| z.infer<(typeof agentEventCatalog)["workflow.completed"]>
	| z.infer<(typeof agentEventCatalog)["workflow.cancelled"]>;
