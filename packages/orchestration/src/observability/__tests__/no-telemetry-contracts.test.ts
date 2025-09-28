/**
 * nO Telemetry & Observability Contracts Test Suite
 *
 * Test-driven development for nO (Master Agent Loop) telemetry contracts
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { describe, expect, it } from 'vitest';
import {
	NO_METRIC_NAMES,
	NO_SPAN_OPERATIONS,
	NO_TELEMETRY_EVENT_TYPES,
	type NoAuditEntry,
	NoAuditTrailSchema,
	type NoMetricContract,
	NoMetricContractsSchema,
	type NoSpanDefinition,
	NoSpanDefinitionsSchema,
	type NoTelemetryEvent,
	NoTelemetrySchema,
} from '../no-telemetry-contracts.js';

describe('nO Telemetry & Observability Contracts', () => {
	describe('NoTelemetrySchema', () => {
		it('should emit structured telemetry for all decisions', () => {
			const mockTelemetryEvent: NoTelemetryEvent = {
				eventId: 'telemetry-001',
				timestamp: new Date().toISOString(),
				source: 'intelligence-scheduler',
				eventType: 'decision_made',
				operation: 'strategy_selection',
				context: {
					planId: 'plan-123',
					agentId: 'agent-1',
					correlationId: 'correlation-456',
					traceId: 'trace-789',
					spanId: 'span-abc',
				},
				payload: {
					decision: {
						selectedStrategy: 'parallel',
						confidence: 0.85,
						alternatives: ['sequential', 'hierarchical'],
						reasoning: 'High parallelization potential detected',
					},
					metrics: {
						executionTimeMs: 150,
						memoryUsageMB: 64,
						cpuUtilizationPercent: 45,
					},
					tags: {
						complexity: 'medium',
						priority: 'high',
						environment: 'production',
					},
				},
                                metadata: {
                                        version: '1.0.0',
                                        component: 'nO-architecture',
                                        createdBy: 'brAInwav',
                                        brainwav_component: 'orchestration.core',
                                },
                        };

			// This will fail until we implement the schema
			expect(() => NoTelemetrySchema.parse(mockTelemetryEvent)).not.toThrow();
		});

		it('should validate required telemetry fields', () => {
			const incompleteTelemetry = {
				eventId: 'telemetry-002',
				timestamp: new Date().toISOString(),
				// Missing source, eventType, operation
			};

			expect(() => NoTelemetrySchema.parse(incompleteTelemetry)).toThrow();
		});

		it('should enforce telemetry event type constraints', () => {
			const invalidEventType = {
				eventId: 'telemetry-003',
				timestamp: new Date().toISOString(),
				source: 'master-agent-loop',
				eventType: 'invalid_event_type', // Should fail
				operation: 'agent_coordination',
				context: {},
				payload: {},
			};

			expect(() => NoTelemetrySchema.parse(invalidEventType)).toThrow();
		});
	});

	describe('NoSpanDefinitionsSchema', () => {
		it('should validate OpenTelemetry span definitions for nO operations', () => {
			const mockSpanDefinition: NoSpanDefinition = {
				operationName: 'nO.intelligence_scheduler.plan_execution',
				spanKind: 'internal',
				component: 'intelligence-scheduler',
				layer: 'intelligence',
				attributes: {
					required: [
						'no.plan.id',
						'no.request.complexity',
						'no.agent.count',
						'no.strategy.selected',
					],
					optional: [
						'no.execution.timeout_ms',
						'no.resource.memory_limit_mb',
						'no.coordination.pattern',
					],
				},
				events: [
					{
						name: 'planning.started',
						attributes: ['no.request.received_at', 'no.request.size'],
					},
					{
						name: 'strategy.selected',
						attributes: ['no.strategy.name', 'no.strategy.confidence'],
					},
					{
						name: 'planning.completed',
						attributes: ['no.plan.steps_count', 'no.plan.estimated_duration'],
					},
				],
				sampleRate: 1.0,
				criticality: 'high',
				documentation: {
					description: 'Tracks execution planning in the Intelligence Scheduler',
					examples: ['Complex multi-agent coordination', 'Adaptive strategy selection'],
					troubleshooting: ['Check plan complexity metrics', 'Verify agent availability'],
				},
			};

			// This will fail until we implement the schema
			expect(() => NoSpanDefinitionsSchema.parse(mockSpanDefinition)).not.toThrow();
		});

		it('should validate span kind enumeration', () => {
			const invalidSpanKind = {
				operationName: 'nO.test.operation',
				spanKind: 'invalid_kind', // Should fail
				component: 'test-component',
				layer: 'execution',
				attributes: { required: [], optional: [] },
				events: [],
			};

			expect(() => NoSpanDefinitionsSchema.parse(invalidSpanKind)).toThrow();
		});
	});

	describe('NoMetricContractsSchema', () => {
		it('should validate performance metric contracts for nO operations', () => {
			const mockMetricContract: NoMetricContract = {
				metricName: 'no_agent_coordination_duration_ms',
				metricType: 'histogram',
				description: 'Duration of agent coordination operations in milliseconds',
				unit: 'milliseconds',
				labels: {
					required: ['coordination_strategy', 'agent_count', 'plan_id'],
					optional: ['priority_level', 'complexity_score', 'environment'],
				},
				buckets: [10, 50, 100, 500, 1000, 5000, 10000],
				sampleRate: 1.0,
				aggregation: {
					method: 'histogram',
					windowMs: 60000,
					retention: '7d',
				},
				alerts: [
					{
						condition: 'p95 > 5000',
						severity: 'warning',
						description: 'Agent coordination taking longer than expected',
					},
					{
						condition: 'p99 > 10000',
						severity: 'critical',
						description: 'Agent coordination severely degraded',
					},
				],
				dashboard: {
					panels: ['coordination_performance', 'agent_utilization'],
					queries: [
						'rate(no_agent_coordination_duration_ms_count[5m])',
						'histogram_quantile(0.95, no_agent_coordination_duration_ms_bucket)',
					],
				},
			};

			// This will fail until we implement the schema
			expect(() => NoMetricContractsSchema.parse(mockMetricContract)).not.toThrow();
		});

		it('should enforce metric type constraints', () => {
			const invalidMetricType = {
				metricName: 'test_metric',
				metricType: 'invalid_type', // Should fail
				description: 'Test metric',
				unit: 'count',
				labels: { required: [], optional: [] },
			};

			expect(() => NoMetricContractsSchema.parse(invalidMetricType)).toThrow();
		});
	});

	describe('NoAuditTrailSchema', () => {
		it('should validate audit trail specifications for nO operations', () => {
			const mockAuditEntry: NoAuditEntry = {
				auditId: 'audit-001',
				timestamp: new Date().toISOString(),
				operation: 'agent_schedule_adjustment',
				actor: {
					type: 'system',
					identifier: 'intelligence-scheduler-v1.0.0',
					context: {
						planId: 'plan-123',
						triggeredBy: 'performance_degradation',
					},
				},
				resource: {
					type: 'agent_schedule',
					identifier: 'schedule-456',
					namespace: 'nO.coordination',
				},
				action: {
					type: 'update',
					description: 'Adjusted agent allocation due to performance metrics',
					previousState: {
						totalAgents: 3,
						coordinationStrategy: 'parallel',
						estimatedCompletion: '2025-01-19T02:10:00Z',
					},
					newState: {
						totalAgents: 4,
						coordinationStrategy: 'hierarchical',
						estimatedCompletion: '2025-01-19T02:08:00Z',
					},
					reason: 'Adaptive optimization based on load metrics',
				},
				compliance: {
					level: 'high',
					requirements: ['BVOO_bounded_execution', 'nO_audit_trail'],
					retentionPeriod: '30d',
				},
				metadata: {
					correlationId: 'correlation-789',
					traceId: 'trace-abc',
					severity: 'info',
					tags: {
						component: 'nO-architecture',
						version: '1.0.0',
						environment: 'production',
					},
				},
			};

			// This will fail until we implement the schema
			expect(() => NoAuditTrailSchema.parse(mockAuditEntry)).not.toThrow();
		});

		it('should validate actor type constraints', () => {
			const invalidActorType = {
				auditId: 'audit-002',
				timestamp: new Date().toISOString(),
				operation: 'test_operation',
				actor: {
					type: 'invalid_actor_type', // Should fail
					identifier: 'test-actor',
				},
				resource: { type: 'test', identifier: 'test-resource' },
				action: { type: 'read', description: 'Test action' },
			};

			expect(() => NoAuditTrailSchema.parse(invalidActorType)).toThrow();
		});
	});

	describe('Telemetry Constants', () => {
		it('should define telemetry event types', () => {
			// This will fail until we define the constants
			expect(NO_TELEMETRY_EVENT_TYPES.DECISION_MADE).toBe('decision_made');
			expect(NO_TELEMETRY_EVENT_TYPES.AGENT_COORDINATION_STARTED).toBe(
				'agent_coordination_started',
			);
			expect(NO_TELEMETRY_EVENT_TYPES.SCHEDULE_ADJUSTED).toBe('schedule_adjusted');
			expect(NO_TELEMETRY_EVENT_TYPES.TOOL_LAYER_INVOKED).toBe('tool_layer_invoked');
			expect(NO_TELEMETRY_EVENT_TYPES.PERFORMANCE_METRIC_RECORDED).toBe(
				'performance_metric_recorded',
			);
		});

		it('should define span operation names', () => {
			// This will fail until we define the constants
			expect(NO_SPAN_OPERATIONS.PLAN_EXECUTION).toBe('nO.intelligence_scheduler.plan_execution');
			expect(NO_SPAN_OPERATIONS.AGENT_COORDINATION).toBe('nO.master_agent_loop.agent_coordination');
			expect(NO_SPAN_OPERATIONS.STRATEGY_SELECTION).toBe(
				'nO.intelligence_scheduler.strategy_selection',
			);
			expect(NO_SPAN_OPERATIONS.TOOL_LAYER_INVOCATION).toBe('nO.tool_layer.invocation');
		});

		it('should define metric names', () => {
			// This will fail until we define the constants
			expect(NO_METRIC_NAMES.COORDINATION_DURATION).toBe('no_agent_coordination_duration_ms');
			expect(NO_METRIC_NAMES.PLAN_EXECUTION_TIME).toBe('no_plan_execution_time_ms');
			expect(NO_METRIC_NAMES.AGENT_UTILIZATION).toBe('no_agent_utilization_ratio');
			expect(NO_METRIC_NAMES.STRATEGY_SELECTION_CONFIDENCE).toBe(
				'no_strategy_selection_confidence',
			);
		});
	});

	describe('Integration with nO Architecture', () => {
		it('should support telemetry for complex nO coordination workflows', () => {
			const complexCoordinationTelemetry: NoTelemetryEvent = {
				eventId: 'telemetry-complex-001',
				timestamp: new Date().toISOString(),
				source: 'master-agent-loop',
				eventType: 'agent_coordination_started',
				operation: 'complex_multi_agent_coordination',
				context: {
					planId: 'complex-plan-789',
					agentId: 'cerebrum-master',
					correlationId: 'correlation-complex-123',
					traceId: 'trace-complex-456',
					spanId: 'span-complex-abc',
				},
				payload: {
					coordination: {
						strategy: 'hierarchical',
						totalAgents: 5,
						layers: ['intelligence', 'execution', 'coordination'],
						estimatedDuration: 300000,
					},
					agents: [
						{
							agentId: 'intelligence-scheduler',
							specialization: 'planning',
							assignedTasks: ['analyze-complexity', 'create-execution-plan'],
							estimatedLoad: 0.8,
						},
						{
							agentId: 'tool-layer-agent-1',
							specialization: 'execution',
							assignedTasks: ['execute-analysis-tools'],
							estimatedLoad: 0.6,
						},
					],
					metrics: {
						coordinationSetupTimeMs: 250,
						agentAllocationTimeMs: 100,
						totalMemoryAllocationMB: 512,
					},
					tags: {
						complexity: 'high',
						priority: 'critical',
						coordinationType: 'adaptive',
					},
				},
				metadata: {
					version: '1.0.0',
					component: 'nO-architecture',
					createdBy: 'brAInwav',
				},
			};

			expect(() => NoTelemetrySchema.parse(complexCoordinationTelemetry)).not.toThrow();
		});

		it('should support audit trail for adaptive schedule adjustments', () => {
			const scheduleAdjustmentAudit: NoAuditEntry = {
				auditId: 'audit-schedule-001',
				timestamp: new Date().toISOString(),
				operation: 'adaptive_schedule_optimization',
				actor: {
					type: 'system',
					identifier: 'adaptive-decision-engine-v1.0.0',
					context: {
						planId: 'adaptive-plan-123',
						triggeredBy: 'performance_feedback',
						confidenceScore: 0.92,
					},
				},
				resource: {
					type: 'execution_schedule',
					identifier: 'schedule-adaptive-456',
					namespace: 'nO.intelligence_scheduler',
				},
				action: {
					type: 'optimize',
					description: 'Optimized schedule based on real-time performance feedback',
					previousState: {
						coordinationStrategy: 'parallel',
						totalAgents: 3,
						estimatedCompletion: '2025-01-19T02:15:00Z',
						resourceAllocation: { memoryMB: 768, cpuPercent: 70 },
					},
					newState: {
						coordinationStrategy: 'hierarchical',
						totalAgents: 4,
						estimatedCompletion: '2025-01-19T02:12:00Z',
						resourceAllocation: { memoryMB: 1024, cpuPercent: 80 },
					},
					reason: 'Adaptive optimization: detected coordination bottleneck in parallel execution',
				},
				compliance: {
					level: 'high',
					requirements: ['BVOO_bounded_execution', 'nO_adaptive_audit', 'brAInwav_governance'],
					retentionPeriod: '90d',
				},
				metadata: {
					correlationId: 'correlation-adaptive-789',
					traceId: 'trace-adaptive-abc',
					severity: 'info',
					tags: {
						component: 'nO-architecture',
						version: '1.0.0',
						environment: 'production',
						optimization: 'adaptive',
						branding: 'brAInwav',
					},
				},
			};

			expect(() => NoAuditTrailSchema.parse(scheduleAdjustmentAudit)).not.toThrow();
		});
	});
});
