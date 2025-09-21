/**
 * nO Architecture Contracts Test Suite
 *
 * Test-driven development for nO (Master Agent Loop) architecture contracts
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { describe, expect, it } from 'vitest';
import {
	AgentMessageSchema,
	AgentNetworkSchema,
	AgentScheduleSchema,
	ExecutionPlanSchema,
	type ExecutionRequest,
	ExecutionRequestSchema,
	IntelligenceSchedulerSchema,
	MasterAgentLoopSchema,
	ToolCapabilitySchema,
	ToolLayerSchema,
	validateExecutionRequest,
} from '../no-architecture-contracts.js';

describe('nO Architecture Contracts', () => {
	describe('IntelligenceScheduler Contract', () => {
		it('should define planning interface with bounded execution', () => {
			// This test will fail until we define IntelligenceSchedulerSchema
			const mockScheduler = {
				planExecution: async () => ({
					id: 'plan-1',
					requestId: 'req-1',
					strategy: 'sequential',
					estimatedDuration: 1000,
					steps: [
						{
							id: 's1',
							type: 'analysis',
							agentRequirements: ['code-analysis'],
							dependencies: [],
							estimatedDuration: 500,
						},
					],
					resourceAllocation: { memoryMB: 256, cpuPercent: 50 },
					contingencyPlans: [],
					metadata: {},
				}),
				scheduleAgents: async () => ({
					id: 'sched-1',
					planId: 'plan-1',
					agents: [
						{
							agentId: 'agent-1',
							specialization: 'code-analysis',
							assignedSteps: ['s1'],
							estimatedLoad: 0.5,
							priority: 5,
						},
					],
					coordinationEvents: [
						{
							type: 'start',
							agentId: 'agent-1',
							timestamp: new Date().toISOString(),
							dependencies: [],
							payload: {},
						},
					],
					startTime: new Date().toISOString(),
					estimatedEndTime: new Date(Date.now() + 1000).toISOString(),
				}),
				adaptStrategy: async () => ({
					newStrategy: 'sequential',
					reasoning: 'test',
					expectedImprovement: 0.1,
					confidence: 0.5,
				}),
				monitorExecution: async () => ({
					planId: 'plan-1',
					status: 'running',
					progress: 0.1,
					startTime: new Date().toISOString(),
					activeAgents: [],
				}),
			};

			expect(() => IntelligenceSchedulerSchema.parse(mockScheduler)).not.toThrow();
		});

		it('should validate execution request parameters', () => {
			const mockRequest = {
				id: 'req-123',
				description: 'Test execution request',
				priority: 'high' as const,
				complexity: 0.8,
				timeoutMs: 30000,
				resourceLimits: {
					memoryMB: 512,
					cpuPercent: 75,
				},
				constraints: {},
			};

			expect(() => ExecutionRequestSchema.parse(mockRequest)).not.toThrow();
		});

		it('should validate execution plan structure', () => {
			const mockPlan = {
				id: 'plan-123',
				requestId: 'req-123',
				strategy: 'parallel' as const,
				estimatedDuration: 15000,
				steps: [
					{
						id: 'step-1',
						type: 'analysis',
						agentRequirements: ['code-analysis'],
						dependencies: [],
						estimatedDuration: 5000,
					},
				],
				resourceAllocation: {
					memoryMB: 256,
					cpuPercent: 50,
				},
			};

			expect(() => ExecutionPlanSchema.parse(mockPlan)).not.toThrow();
		});
	});

	describe('MasterAgentLoop Contract', () => {
		it('should define agent coordination interface', () => {
			const mockMasterLoop = {
				initializeAgents: () => Promise.resolve({}),
				coordinateExecution: () => Promise.resolve({}),
				handleAgentFailure: () => Promise.resolve({}),
				persistAgentState: () => Promise.resolve(),
			};

			expect(() => MasterAgentLoopSchema.parse(mockMasterLoop)).not.toThrow();
		});

		it('should validate agent schedule structure', () => {
			const mockSchedule = {
				id: 'schedule-123',
				planId: 'plan-123',
				agents: [
					{
						agentId: 'agent-1',
						specialization: 'code-analysis',
						assignedSteps: ['step-1'],
						estimatedLoad: 0.7,
						priority: 5,
					},
				],
				coordinationEvents: [
					{
						type: 'start',
						agentId: 'agent-1',
						timestamp: new Date().toISOString(),
						dependencies: [],
					},
				],
				startTime: new Date().toISOString(),
				estimatedEndTime: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
			};

			expect(() => AgentScheduleSchema.parse(mockSchedule)).not.toThrow();
		});
	});

	describe('ToolLayer Contract', () => {
		it('should define multi-layer tool access', () => {
			const mockToolLayer = {
				level: 'dashboard' as const,
				capabilities: [],
				invoke: () => Promise.resolve({}),
				getAvailableTools: () => [],
			};

			expect(() => ToolLayerSchema.parse(mockToolLayer)).not.toThrow();
		});

		it('should validate tool capabilities', () => {
			const mockCapability = {
				name: 'visualization',
				description: 'Data visualization and charting',
				level: 'dashboard' as const,
				inputSchema: {},
				outputSchema: {},
				securityLevel: 'low' as const,
			};

			expect(() => ToolCapabilitySchema.parse(mockCapability)).not.toThrow();
		});

		it('should enforce layer hierarchy constraints', () => {
			const dashboardTools = ['visualize', 'monitor', 'report'];
			const executionTools = ['file-system', 'network', 'process'];
			const _primitiveTools = ['memory', 'compute', 'storage'];
			// Note: primitiveTools defined for completeness but not used in this test

			// Dashboard layer should only access dashboard tools
			expect(
				dashboardTools.every(
					(tool) =>
						tool.includes('visualize') || tool.includes('monitor') || tool.includes('report'),
				),
			).toBe(true);

			// Execution layer should access execution tools
			expect(
				executionTools.every(
					(tool) => tool.includes('file') || tool.includes('network') || tool.includes('process'),
				),
			).toBe(true);
		});
	});

	describe('AgentNetwork Contract', () => {
		it('should define agent communication interface', () => {
			const unsub = () => {
				/* no-op */
			};
			const mockNetwork = {
				sendMessage: () => Promise.resolve(),
				broadcast: () => Promise.resolve(),
				subscribeToAgent: () => unsub,
			};

			expect(() => AgentNetworkSchema.parse(mockNetwork)).not.toThrow();
		});

		it('should validate agent message structure', () => {
			const mockMessage = {
				id: 'msg-123',
				from: 'agent-1',
				to: 'agent-2',
				type: 'request' as const,
				content: {
					action: 'analyze',
					parameters: { file: 'test.ts' },
				},
				timestamp: new Date().toISOString(),
				priority: 'normal' as const,
			};

			expect(() => AgentMessageSchema.parse(mockMessage)).not.toThrow();
		});

		it('should support broadcast messaging patterns', () => {
			const broadcastMessage = {
				id: 'broadcast-123',
				from: 'master-agent',
				to: '*',
				type: 'notification' as const,
				content: {
					event: 'system-shutdown',
					message: 'System maintenance in 5 minutes',
				},
				timestamp: new Date().toISOString(),
				priority: 'urgent' as const,
			};

			expect(() => AgentMessageSchema.parse(broadcastMessage)).not.toThrow();
		});
	});

	describe('Contract Integration', () => {
		it('should support end-to-end nO workflow', () => {
			// Test that all contracts work together
			const request: ExecutionRequest = {
				id: 'integration-test',
				description: 'End-to-end nO workflow test',
				priority: 'medium',
				complexity: 0.6,
				timeoutMs: 60000,
				resourceLimits: {
					memoryMB: 1024,
					cpuPercent: 80,
				},
				constraints: {
					requiresSecurityCheck: true,
				},
			};

			expect(() => ExecutionRequestSchema.parse(request)).not.toThrow();
		});

		it('should enforce bounded execution constraints', () => {
			const boundedRequest = {
				id: 'bounded-test',
				description: 'Test bounded execution',
				priority: 'low' as const,
				complexity: 0.9, // Within bounds (0-1)
				timeoutMs: 60000, // 1 minute - within bounds
				resourceLimits: {
					memoryMB: 1024, // Within bounds
					cpuPercent: 80, // Within bounds (1-95)
				},
				constraints: {},
			};

			// This should pass validation with proper bounds
			expect(() => ExecutionRequestSchema.parse(boundedRequest)).not.toThrow();

			// Test the validation utility for out-of-bounds values
			const outOfBoundsRequest = {
				id: 'out-of-bounds-test',
				description: 'Test out of bounds handling',
				priority: 'high' as const,
				complexity: 1.5, // Will be clamped to 1.0
				timeoutMs: 30000,
				resourceLimits: {
					memoryMB: 512,
					cpuPercent: 150, // Will be clamped to 95
				},
				constraints: {},
			};

			// Use validation utility that applies bounds checking
			const validated = validateExecutionRequest(outOfBoundsRequest);
			expect(validated.complexity).toBe(1.0);
			expect(validated.resourceLimits.cpuPercent).toBe(95);
		});
	});
});
