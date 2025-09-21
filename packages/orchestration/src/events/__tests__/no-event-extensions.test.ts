/**
 * nO Event Schema Extensions Test Suite
 *
 * Test-driven development for nO (Master Agent Loop) event schema extensions
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { describe, expect, it } from 'vitest';
import {
	type AgentCoordinationStartedEvent,
	ORCHESTRATION_EVENT_SCHEMAS,
	OrchestrationEventTypes,
	type ScheduleAdjustedEvent,
	type ToolLayerInvokedEvent,
} from '../orchestration-events.js';

describe('nO Event Schema Extensions', () => {
	describe('AgentCoordinationStarted Event', () => {
		it('should validate agent coordination started event', () => {
			const mockEvent: AgentCoordinationStartedEvent = {
				type: 'agent_coordination_started',
				timestamp: new Date().toISOString(),
				planId: 'plan-123',
				masterAgentId: 'master-agent-1',
				coordinatedAgents: [
					{
						agentId: 'agent-1',
						specialization: 'code-analysis',
						assignedTasks: ['analyze-code'],
						priority: 5,
					},
					{
						agentId: 'agent-2',
						specialization: 'test-generation',
						assignedTasks: ['generate-tests'],
						priority: 3,
					},
				],
				coordinationStrategy: 'parallel',
				estimatedDuration: 300000, // 5 minutes
				metadata: {
					initiatedBy: 'intelligence-scheduler',
					reason: 'complex-task-delegation',
				},
			};

			// This will fail until we implement the schema
			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.agent_coordination_started.parse(mockEvent),
			).not.toThrow();
		});

		it('should require essential fields for coordination event', () => {
			const incompleteEvent = {
				type: 'agent_coordination_started',
				timestamp: new Date().toISOString(),
				// Missing planId, masterAgentId, coordinatedAgents
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.agent_coordination_started.parse(incompleteEvent),
			).toThrow();
		});

		it('should validate coordination strategy values', () => {
			const invalidStrategyEvent = {
				type: 'agent_coordination_started',
				timestamp: new Date().toISOString(),
				planId: 'plan-123',
				masterAgentId: 'master-1',
				coordinatedAgents: [],
				coordinationStrategy: 'invalid-strategy', // Should fail
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.agent_coordination_started.parse(invalidStrategyEvent),
			).toThrow();
		});
	});

	describe('ScheduleAdjusted Event', () => {
		it('should validate schedule adjustment event', () => {
			const mockEvent: ScheduleAdjustedEvent = {
				type: 'schedule_adjusted',
				timestamp: new Date().toISOString(),
				scheduleId: 'schedule-123',
				planId: 'plan-123',
				adjustmentType: 'resource_reallocation',
				previousSchedule: {
					totalAgents: 3,
					estimatedCompletion: new Date(Date.now() + 600000).toISOString(),
					resourceAllocation: {
						memoryMB: 1024,
						cpuPercent: 75,
					},
				},
				newSchedule: {
					totalAgents: 4,
					estimatedCompletion: new Date(Date.now() + 450000).toISOString(),
					resourceAllocation: {
						memoryMB: 1536,
						cpuPercent: 85,
					},
				},
				adjustmentReason: 'performance_optimization',
				triggeringMetrics: {
					currentLoad: 0.9,
					averageResponseTime: 2500,
					errorRate: 0.02,
				},
				expectedImprovement: {
					loadReduction: 0.3,
					responseTimeImprovement: 0.4,
					errorRateReduction: 0.5,
				},
			};

			// This will fail until we implement the schema
			expect(() => ORCHESTRATION_EVENT_SCHEMAS.schedule_adjusted.parse(mockEvent)).not.toThrow();
		});

		it('should validate adjustment types', () => {
			const invalidAdjustmentEvent = {
				type: 'schedule_adjusted',
				timestamp: new Date().toISOString(),
				scheduleId: 'schedule-123',
				planId: 'plan-123',
				adjustmentType: 'invalid_type', // Should fail
				previousSchedule: {},
				newSchedule: {},
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.schedule_adjusted.parse(invalidAdjustmentEvent),
			).toThrow();
		});
	});

	describe('ToolLayerInvoked Event', () => {
		it('should validate tool layer invocation event', () => {
			const mockEvent: ToolLayerInvokedEvent = {
				type: 'tool_layer_invoked',
				timestamp: new Date().toISOString(),
				invocationId: 'invoke-123',
				agentId: 'agent-1',
				toolLayer: 'execution',
				toolsInvoked: [
					{
						toolName: 'file-system-read',
						parameters: { path: '/tmp/test.txt' },
						estimatedDuration: 100,
					},
					{
						toolName: 'network-request',
						parameters: { url: 'https://api.example.com' },
						estimatedDuration: 2000,
					},
				],
				invocationContext: {
					taskId: 'task-456',
					stepId: 'step-2',
					priority: 'high',
				},
				parallelExecution: true,
				timeoutMs: 30000,
				securityContext: {
					permissionLevel: 'medium',
					allowedDomains: ['api.example.com'],
					restrictedOperations: ['file-delete'],
				},
			};

			// This will fail until we implement the schema
			expect(() => ORCHESTRATION_EVENT_SCHEMAS.tool_layer_invoked.parse(mockEvent)).not.toThrow();
		});

		it('should validate tool layer types', () => {
			const invalidLayerEvent = {
				type: 'tool_layer_invoked',
				timestamp: new Date().toISOString(),
				invocationId: 'invoke-123',
				agentId: 'agent-1',
				toolLayer: 'invalid_layer', // Should fail
				toolsInvoked: [],
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.tool_layer_invoked.parse(invalidLayerEvent),
			).toThrow();
		});

		it('should require essential tool invocation fields', () => {
			const incompleteEvent = {
				type: 'tool_layer_invoked',
				timestamp: new Date().toISOString(),
				// Missing invocationId, agentId, toolLayer, toolsInvoked
			};

			expect(() => ORCHESTRATION_EVENT_SCHEMAS.tool_layer_invoked.parse(incompleteEvent)).toThrow();
		});
	});

	describe('Event Type Registration', () => {
		it('should register new event types in OrchestrationEventTypes', () => {
			// This will fail until we add the new event types
			expect(OrchestrationEventTypes.AgentCoordinationStarted).toBe('agent_coordination_started');
			expect(OrchestrationEventTypes.ScheduleAdjusted).toBe('schedule_adjusted');
			expect(OrchestrationEventTypes.ToolLayerInvoked).toBe('tool_layer_invoked');
		});

		it('should include new events in ORCHESTRATION_EVENT_SCHEMAS', () => {
			// This will fail until we add the schemas
			expect(ORCHESTRATION_EVENT_SCHEMAS.agent_coordination_started).toBeDefined();
			expect(ORCHESTRATION_EVENT_SCHEMAS.schedule_adjusted).toBeDefined();
			expect(ORCHESTRATION_EVENT_SCHEMAS.tool_layer_invoked).toBeDefined();
		});
	});

	describe('Event Integration with nO Architecture', () => {
		it('should support event emission for nO coordination workflows', () => {
			// Test that events can be used in coordination scenarios
			const coordinationEvent: AgentCoordinationStartedEvent = {
				type: 'agent_coordination_started',
				timestamp: new Date().toISOString(),
				planId: 'complex-analysis-plan',
				masterAgentId: 'cerebrum-master',
				coordinatedAgents: [
					{
						agentId: 'intelligence-scheduler',
						specialization: 'intelligence-scheduler',
						assignedTasks: ['analyze-complexity', 'create-execution-plan'],
						priority: 10,
					},
					{
						agentId: 'tool-layer-agent',
						specialization: 'tool-layer',
						assignedTasks: ['execute-analysis-tools', 'update-dashboard'],
						priority: 8,
					},
				],
				coordinationStrategy: 'hierarchical',
				estimatedDuration: 180000,
				metadata: {
					initiatedBy: 'user-request',
					complexity: 0.8,
					resourcesRequired: ['code-analysis', 'visualization'],
				},
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.agent_coordination_started.parse(coordinationEvent),
			).not.toThrow();
		});

		it('should support schedule adjustment events for adaptive orchestration', () => {
			const adjustmentEvent: ScheduleAdjustedEvent = {
				type: 'schedule_adjusted',
				timestamp: new Date().toISOString(),
				scheduleId: 'adaptive-schedule-1',
				planId: 'complex-analysis-plan',
				adjustmentType: 'agent_reallocation',
				previousSchedule: {
					totalAgents: 2,
					estimatedCompletion: new Date(Date.now() + 300000).toISOString(),
					resourceAllocation: { memoryMB: 512, cpuPercent: 60 },
				},
				newSchedule: {
					totalAgents: 3,
					estimatedCompletion: new Date(Date.now() + 200000).toISOString(),
					resourceAllocation: { memoryMB: 768, cpuPercent: 75 },
				},
				adjustmentReason: 'adaptive_optimization',
				triggeringMetrics: {
					currentLoad: 0.95,
					averageResponseTime: 5000,
					errorRate: 0.1,
				},
				expectedImprovement: {
					loadReduction: 0.4,
					responseTimeImprovement: 0.6,
					errorRateReduction: 0.8,
				},
			};

			expect(() =>
				ORCHESTRATION_EVENT_SCHEMAS.schedule_adjusted.parse(adjustmentEvent),
			).not.toThrow();
		});
	});
});
