/**
 * nO (Master Agent Loop) Telemetry & Observability Contracts
 *
 * Defines structured logging schemas, OpenTelemetry span definitions,
 * performance metric contracts, and audit trail specifications for nO operations.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { z } from 'zod';

// ================================
// Telemetry Event Schemas
// ================================

export const NoTelemetryContextSchema = z.object({
	planId: z.string().min(1),
	agentId: z.string().min(1),
	correlationId: z.string().min(1),
	traceId: z.string().min(1),
	spanId: z.string().min(1),
	parentSpanId: z.string().optional(),
});

export const NoTelemetryPayloadSchema = z.object({
	decision: z
		.object({
			selectedStrategy: z.string(),
			confidence: z.number().min(0).max(1),
			alternatives: z.array(z.string()).default([]),
			reasoning: z.string(),
		})
		.optional(),
	coordination: z
		.object({
			strategy: z.enum(['parallel', 'sequential', 'hierarchical', 'adaptive']),
			totalAgents: z.number().int().positive(),
			layers: z.array(z.enum(['intelligence', 'execution', 'coordination', 'observation'])),
			estimatedDuration: z.number().positive(),
		})
		.optional(),
	agents: z
		.array(
			z.object({
				agentId: z.string().min(1),
				specialization: z.string().min(1),
				assignedTasks: z.array(z.string()),
				estimatedLoad: z.number().min(0).max(1),
			}),
		)
		.optional(),
	metrics: z
		.object({
			executionTimeMs: z.number().min(0).optional(),
			memoryUsageMB: z.number().min(0).optional(),
			cpuUtilizationPercent: z.number().min(0).max(100).optional(),
			coordinationSetupTimeMs: z.number().min(0).optional(),
			agentAllocationTimeMs: z.number().min(0).optional(),
			totalMemoryAllocationMB: z.number().min(0).optional(),
		})
		.default({}),
	tags: z.record(z.string(), z.string()).default({}),
});

export const NoTelemetrySchema = z.object({
	eventId: z.string().min(1),
	timestamp: z.string().datetime(),
	source: z.enum([
		'intelligence-scheduler',
		'master-agent-loop',
		'tool-layer',
		'agent-network',
		'adaptive-decision-engine',
		'resource-manager',
		'execution-planner',
	]),
	eventType: z.enum([
		'decision_made',
		'agent_coordination_started',
		'schedule_adjusted',
		'tool_layer_invoked',
		'performance_metric_recorded',
		'resource_allocated',
		'strategy_adapted',
		'execution_completed',
	]),
	operation: z.string().min(1),
	context: NoTelemetryContextSchema,
	payload: NoTelemetryPayloadSchema,
	metadata: z.object({
		version: z.string().min(1),
		component: z.string().min(1),
		createdBy: z.string().min(1),
		severity: z
			.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
			.optional()
			.default('info'),
		environment: z.enum(['development', 'staging', 'production']).optional(),
	}),
});

// ================================
// OpenTelemetry Span Definitions
// ================================

export const NoSpanEventSchema = z.object({
	name: z.string().min(1),
	attributes: z.array(z.string()).default([]),
});

export const NoSpanAttributesSchema = z.object({
	required: z.array(z.string()),
	optional: z.array(z.string()).default([]),
});

export const NoSpanDefinitionsSchema = z.object({
	operationName: z.string().min(1),
	spanKind: z.enum(['internal', 'server', 'client', 'producer', 'consumer']),
	component: z.string().min(1),
	layer: z.enum(['intelligence', 'execution', 'coordination', 'observation']),
	attributes: NoSpanAttributesSchema,
	events: z.array(NoSpanEventSchema).default([]),
	sampleRate: z.number().min(0).max(1).default(1.0),
	criticality: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
	documentation: z
		.object({
			description: z.string().min(1),
			examples: z.array(z.string()).default([]),
			troubleshooting: z.array(z.string()).default([]),
		})
		.optional(),
});

// ================================
// Performance Metric Contracts
// ================================

export const NoMetricLabelsSchema = z.object({
	required: z.array(z.string()),
	optional: z.array(z.string()).default([]),
});

export const NoMetricAlertSchema = z.object({
	condition: z.string().min(1),
	severity: z.enum(['info', 'warning', 'critical']),
	description: z.string().min(1),
});

export const NoMetricAggregationSchema = z.object({
	method: z.enum(['histogram', 'counter', 'gauge', 'summary']),
	windowMs: z.number().int().positive(),
	retention: z.string().min(1), // e.g., "7d", "30d", "90d"
});

export const NoMetricDashboardSchema = z.object({
	panels: z.array(z.string()).default([]),
	queries: z.array(z.string()).default([]),
});

export const NoMetricContractsSchema = z.object({
	metricName: z.string().min(1),
	metricType: z.enum(['counter', 'gauge', 'histogram', 'summary']),
	description: z.string().min(1),
	unit: z.string().min(1),
	labels: NoMetricLabelsSchema,
	buckets: z.array(z.number()).optional(), // For histograms
	quantiles: z.array(z.number().min(0).max(1)).optional(), // For summaries
	sampleRate: z.number().min(0).max(1).default(1.0),
	aggregation: NoMetricAggregationSchema,
	alerts: z.array(NoMetricAlertSchema).default([]),
	dashboard: NoMetricDashboardSchema.optional(),
});

// ================================
// Audit Trail Specifications
// ================================

export const NoAuditActorSchema = z.object({
	type: z.enum(['user', 'system', 'agent', 'service']),
	identifier: z.string().min(1),
	context: z.record(z.string(), z.unknown()).default({}),
});

export const NoAuditResourceSchema = z.object({
	type: z.string().min(1),
	identifier: z.string().min(1),
	namespace: z.string().min(1).optional(),
});

export const NoAuditActionSchema = z.object({
	type: z.enum(['create', 'read', 'update', 'delete', 'execute', 'optimize', 'coordinate']),
	description: z.string().min(1),
	previousState: z.record(z.string(), z.unknown()).optional(),
	newState: z.record(z.string(), z.unknown()).optional(),
	reason: z.string().min(1).optional(),
});

export const NoAuditComplianceSchema = z.object({
	level: z.enum(['low', 'medium', 'high', 'critical']),
	requirements: z.array(z.string()),
	retentionPeriod: z.string().min(1), // e.g., "30d", "90d", "1y"
});

export const NoAuditTrailSchema = z.object({
	auditId: z.string().min(1),
	timestamp: z.string().datetime(),
	operation: z.string().min(1),
	actor: NoAuditActorSchema,
	resource: NoAuditResourceSchema,
	action: NoAuditActionSchema,
	compliance: NoAuditComplianceSchema,
	metadata: z.object({
		correlationId: z.string().min(1),
		traceId: z.string().min(1),
		severity: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
		tags: z.record(z.string(), z.string()).default({}),
	}),
});

// ================================
// Type Exports
// ================================

export type NoTelemetryEvent = z.infer<typeof NoTelemetrySchema>;
export type NoTelemetryContext = z.infer<typeof NoTelemetryContextSchema>;
export type NoTelemetryPayload = z.infer<typeof NoTelemetryPayloadSchema>;

export type NoSpanDefinition = z.infer<typeof NoSpanDefinitionsSchema>;
export type NoSpanEvent = z.infer<typeof NoSpanEventSchema>;
export type NoSpanAttributes = z.infer<typeof NoSpanAttributesSchema>;

export type NoMetricContract = z.infer<typeof NoMetricContractsSchema>;
export type NoMetricLabels = z.infer<typeof NoMetricLabelsSchema>;
export type NoMetricAlert = z.infer<typeof NoMetricAlertSchema>;
export type NoMetricAggregation = z.infer<typeof NoMetricAggregationSchema>;
export type NoMetricDashboard = z.infer<typeof NoMetricDashboardSchema>;

export type NoAuditEntry = z.infer<typeof NoAuditTrailSchema>;
export type NoAuditActor = z.infer<typeof NoAuditActorSchema>;
export type NoAuditResource = z.infer<typeof NoAuditResourceSchema>;
export type NoAuditAction = z.infer<typeof NoAuditActionSchema>;
export type NoAuditCompliance = z.infer<typeof NoAuditComplianceSchema>;

// ================================
// Constants and Enumerations
// ================================

export const NO_TELEMETRY_EVENT_TYPES = {
	DECISION_MADE: 'decision_made',
	AGENT_COORDINATION_STARTED: 'agent_coordination_started',
	SCHEDULE_ADJUSTED: 'schedule_adjusted',
	TOOL_LAYER_INVOKED: 'tool_layer_invoked',
	PERFORMANCE_METRIC_RECORDED: 'performance_metric_recorded',
	RESOURCE_ALLOCATED: 'resource_allocated',
	STRATEGY_ADAPTED: 'strategy_adapted',
	EXECUTION_COMPLETED: 'execution_completed',
} as const;

export const NO_SPAN_OPERATIONS = {
	PLAN_EXECUTION: 'nO.intelligence_scheduler.plan_execution',
	AGENT_COORDINATION: 'nO.master_agent_loop.agent_coordination',
	STRATEGY_SELECTION: 'nO.intelligence_scheduler.strategy_selection',
	TOOL_LAYER_INVOCATION: 'nO.tool_layer.invocation',
	RESOURCE_ALLOCATION: 'nO.resource_manager.allocation',
	ADAPTIVE_DECISION: 'nO.adaptive_decision_engine.decision',
	AGENT_POOL_MANAGEMENT: 'nO.master_agent_loop.pool_management',
	EXECUTION_PLANNING: 'nO.execution_planner.planning',
} as const;

export const NO_METRIC_NAMES = {
	COORDINATION_DURATION: 'no_agent_coordination_duration_ms',
	PLAN_EXECUTION_TIME: 'no_plan_execution_time_ms',
	AGENT_UTILIZATION: 'no_agent_utilization_ratio',
	STRATEGY_SELECTION_CONFIDENCE: 'no_strategy_selection_confidence',
	RESOURCE_ALLOCATION_TIME: 'no_resource_allocation_time_ms',
	DECISION_ADAPTATION_COUNT: 'no_decision_adaptation_total',
	TOOL_LAYER_INVOCATION_COUNT: 'no_tool_layer_invocation_total',
	EXECUTION_SUCCESS_RATE: 'no_execution_success_rate',
} as const;

// ================================
// Utility Functions
// ================================

/**
 * Create a structured telemetry event for nO operations
 */
export function createNoTelemetryEvent(
	source: NoTelemetryEvent['source'],
	eventType: NoTelemetryEvent['eventType'],
	operation: string,
	context: NoTelemetryContext,
	payload: NoTelemetryPayload,
	metadata?: Partial<NoTelemetryEvent['metadata']>,
): NoTelemetryEvent {
	return NoTelemetrySchema.parse({
		eventId: `telemetry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		source,
		eventType,
		operation,
		context,
		payload,
		metadata: {
			version: '1.0.0',
			component: 'nO-architecture',
			createdBy: 'brAInwav',
			...metadata,
		},
	});
}

/**
 * Create an audit trail entry for nO operations
 */
export function createNoAuditEntry(
	operation: string,
	actor: NoAuditActor,
	resource: NoAuditResource,
	action: NoAuditAction,
	compliance: NoAuditCompliance,
	metadata?: Partial<NoAuditEntry['metadata']>,
): NoAuditEntry {
	return NoAuditTrailSchema.parse({
		auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		operation,
		actor,
		resource,
		action,
		compliance,
		metadata: {
			correlationId: `correlation-${Date.now()}`,
			traceId: `trace-${Date.now()}`,
			severity: 'info',
			tags: {
				component: 'nO-architecture',
				version: '1.0.0',
				branding: 'brAInwav',
			},
			...metadata,
		},
	});
}

/**
 * Validate telemetry event against schema
 */
export function validateNoTelemetryEvent(event: unknown): NoTelemetryEvent {
	return NoTelemetrySchema.parse(event);
}

/**
 * Validate span definition against schema
 */
export function validateNoSpanDefinition(spanDef: unknown): NoSpanDefinition {
	return NoSpanDefinitionsSchema.parse(spanDef);
}

/**
 * Validate metric contract against schema
 */
export function validateNoMetricContract(metric: unknown): NoMetricContract {
	return NoMetricContractsSchema.parse(metric);
}

/**
 * Validate audit entry against schema
 */
export function validateNoAuditEntry(audit: unknown): NoAuditEntry {
	return NoAuditTrailSchema.parse(audit);
}
