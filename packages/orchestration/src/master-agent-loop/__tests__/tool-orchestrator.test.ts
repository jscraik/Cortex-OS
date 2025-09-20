/**
 * @fileoverview Tool Orchestration Tests - Phase 3.6
 * @module ToolOrchestrator.test
 * @description Test-driven development for comprehensive tool orchestration across multiple layers
 * @author brAInwav Development Team
 * @version 3.6.0
 * @since 2024-12-09
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardToolLayer } from '../dashboard-tool-layer';
import { ExecutionToolLayer } from '../execution-tool-layer';
import { PrimitiveToolLayer } from '../primitive-tool-layer';
import { ToolOrchestrationError } from '../tool-orchestration-error';
import { ToolOrchestrator } from '../tool-orchestrator';

/**
 * Create mock tool layers for testing
 */
function createMockToolLayers() {
	return {
		dashboard: new DashboardToolLayer(),
		execution: new ExecutionToolLayer(),
		primitive: new PrimitiveToolLayer(),
	};
}

/**
 * Create multi-layer tool chain for testing
 */
function createMultiLayerToolChain() {
	return {
		id: 'data-processing-workflow',
		description: 'Complete data processing with visualization',
		steps: [
			{
				id: 'fetch-data',
				layer: 'execution' as const,
				tool: 'file-system-operation',
				input: { operation: 'read', path: '/data/input.csv' },
				dependencies: [],
				cacheable: false,
				batchable: false,
			},
			{
				id: 'validate-data',
				layer: 'primitive' as const,
				tool: 'atomic-operation',
				input: { operation: 'read', target: 'memory', key: 'validation-rules' },
				dependencies: ['fetch-data'],
				cacheable: false,
				batchable: false,
			},
			{
				id: 'process-data',
				layer: 'execution' as const,
				tool: 'process-management',
				input: { action: 'execute', command: 'data-processor' },
				dependencies: ['validate-data'],
				cacheable: false,
				batchable: false,
			},
			{
				id: 'visualize-results',
				layer: 'dashboard' as const,
				tool: 'visualize-execution-graph',
				input: { planId: 'data-processing', layout: 'hierarchical' },
				dependencies: ['process-data'],
				cacheable: false,
				batchable: false,
			},
		],
		parallelExecution: false,
		failFast: true,
		enableRollback: false,
		enableCaching: false,
		enableBatching: false,
		enableSecurity: false,
		adaptiveTimeouts: false,
		enableAnomalyDetection: false,
		enableCircuitBreaker: false,
		optimization: {
			enabled: true,
			cacheEnabled: true,
			parallelismHints: {
				'fetch-data': { parallel: false },
				'validate-data': { parallel: true, maxConcurrency: 3 },
			},
		},
	};
}

/**
 * Create orchestration performance configuration
 */
function createPerformanceConfig() {
	return {
		maxConcurrentTools: 10,
		defaultTimeout: 30000,
		enableCaching: true,
		enableMetrics: true,
		optimization: {
			enabled: true,
			batchSize: 5,
			parallelismThreshold: 3,
			resourceThreshold: 0.8,
		},
		monitoring: {
			enableRealTime: true,
			metricsInterval: 1000,
			healthCheckInterval: 5000,
		},
	};
}

describe('ToolOrchestrator', () => {
	let orchestrator: ToolOrchestrator;
	let mockLayers: ReturnType<typeof createMockToolLayers>;

	beforeEach(() => {
		mockLayers = createMockToolLayers();
		orchestrator = new ToolOrchestrator(mockLayers, createPerformanceConfig());
	});

	describe('Tool Orchestration Engine', () => {
		it('should create tool orchestration engine', () => {
			expect(orchestrator).toBeInstanceOf(ToolOrchestrator);
			expect(orchestrator.getLayerCount()).toBe(3);
		});

		it('should coordinate multi-layer tool execution', async () => {
			const toolChain = createMultiLayerToolChain();

			// Should fail until orchestration is implemented
			const result = await orchestrator.executeToolChain(toolChain);

			expect(result.success).toBeTruthy();
			expect(result.chainId).toBe('data-processing-workflow');
			expect(result.stepsExecuted).toBe(4);
			expect(result.layersUsed).toEqual(['execution', 'primitive', 'dashboard']);
		});

		it('should handle tool chain with dependencies', async () => {
			const toolChain = createMultiLayerToolChain();

			const result = await orchestrator.executeToolChain(toolChain);

			expect(result.executionOrder).toEqual([
				'fetch-data',
				'validate-data',
				'process-data',
				'visualize-results',
			]);
			expect(result.dependencyResolution).toBeTruthy();
		});

		it('should execute parallel tool chains when safe', async () => {
			const parallelChain = {
				...createMultiLayerToolChain(),
				parallelExecution: true,
				steps: [
					{
						id: 'parallel-task-1',
						layer: 'execution',
						tool: 'file-system-operation',
						input: { operation: 'read', path: '/data/file1.txt' },
						dependencies: [],
					},
					{
						id: 'parallel-task-2',
						layer: 'primitive',
						tool: 'atomic-operation',
						input: { operation: 'read', target: 'memory', key: 'config' },
						dependencies: [],
					},
					{
						id: 'merge-results',
						layer: 'dashboard',
						tool: 'visualize-execution-graph',
						input: { planId: 'parallel-merge' },
						dependencies: ['parallel-task-1', 'parallel-task-2'],
					},
				],
			};

			const result = await orchestrator.executeToolChain(parallelChain);

			expect(result.parallelExecuted).toBeTruthy();
			expect(result.concurrentSteps).toBeGreaterThan(1);
		});

		it('should handle tool execution failures with proper error handling', async () => {
			const failingChain = {
				...createMultiLayerToolChain(),
				steps: [
					{
						id: 'failing-step',
						layer: 'execution',
						tool: 'non-existent-tool',
						input: { operation: 'fail' },
						dependencies: [],
					},
				],
			};

			await expect(orchestrator.executeToolChain(failingChain)).rejects.toThrow(
				ToolOrchestrationError,
			);
		});
	});

	describe('Cross-Layer Tool Communication', () => {
		it('should enable tools to communicate between layers', async () => {
			const crossLayerChain = {
				id: 'cross-layer-communication',
				steps: [
					{
						id: 'execution-to-primitive',
						layer: 'execution',
						tool: 'file-system-operation',
						input: { operation: 'read', path: '/tmp/data.json' },
						output: { target: 'primitive', key: 'processed-data' },
						dependencies: [],
					},
					{
						id: 'primitive-to-dashboard',
						layer: 'primitive',
						tool: 'atomic-operation',
						input: { operation: 'read', target: 'memory', key: 'processed-data' },
						output: { target: 'dashboard', format: 'visualization-data' },
						dependencies: ['execution-to-primitive'],
					},
				],
			};

			const result = await orchestrator.executeToolChain(crossLayerChain);

			expect(result.crossLayerCommunication).toBeTruthy();
			expect(result.dataTransfers).toHaveLength(2);
		});

		it('should validate inter-layer data formats', async () => {
			const invalidCommunicationChain = {
				id: 'invalid-communication',
				steps: [
					{
						id: 'invalid-transfer',
						layer: 'execution',
						tool: 'file-system-operation',
						input: { operation: 'read', path: '/invalid' },
						output: { target: 'dashboard', format: 'unsupported-format' },
						dependencies: [],
					},
				],
			};

			await expect(orchestrator.executeToolChain(invalidCommunicationChain)).rejects.toThrow(
				/unsupported data format/i,
			);
		});

		it('should provide cross-layer context sharing', async () => {
			const contextSharingChain = {
				id: 'context-sharing',
				sharedContext: {
					userId: 'test-user-123',
					sessionId: 'session-456',
					operationId: 'op-789',
				},
				steps: [
					{
						id: 'context-aware-step',
						layer: 'execution',
						tool: 'file-system-operation',
						input: { operation: 'read', path: '/user/{{userId}}/data.txt' },
						dependencies: [],
					},
				],
			};

			const result = await orchestrator.executeToolChain(contextSharingChain);

			expect(result.contextSubstitutions).toBeTruthy();
			expect(result.resolvedInputs['context-aware-step'].path).toBe('/user/test-user-123/data.txt');
		});
	});

	describe('Tool Dependency Management', () => {
		it('should resolve complex tool dependencies', async () => {
			const complexDependencyChain = {
				id: 'complex-dependencies',
				steps: [
					{ id: 'step-a', layer: 'primitive', tool: 'atomic-operation', dependencies: [] },
					{
						id: 'step-b',
						layer: 'execution',
						tool: 'file-system-operation',
						dependencies: ['step-a'],
					},
					{
						id: 'step-c',
						layer: 'execution',
						tool: 'process-management',
						dependencies: ['step-a'],
					},
					{
						id: 'step-d',
						layer: 'dashboard',
						tool: 'visualize-execution-graph',
						dependencies: ['step-b', 'step-c'],
					},
					{ id: 'step-e', layer: 'primitive', tool: 'atomic-operation', dependencies: ['step-d'] },
				],
			};

			const dependencyGraph = await orchestrator.analyzeDependencies(complexDependencyChain);

			expect(dependencyGraph.hasCycles).toBeFalsy();
			expect(dependencyGraph.maxDepth).toBe(4);
			expect(dependencyGraph.parallelizable).toContain('step-b');
			expect(dependencyGraph.parallelizable).toContain('step-c');
		});

		it('should detect circular dependencies', async () => {
			const circularDependencyChain = {
				id: 'circular-dependencies',
				steps: [
					{
						id: 'step-a',
						layer: 'execution',
						tool: 'file-system-operation',
						dependencies: ['step-b'],
					},
					{ id: 'step-b', layer: 'primitive', tool: 'atomic-operation', dependencies: ['step-a'] },
				],
			};

			await expect(orchestrator.analyzeDependencies(circularDependencyChain)).rejects.toThrow(
				/circular dependency detected/i,
			);
		});

		it('should optimize execution order based on dependencies', async () => {
			const optimizableChain = createMultiLayerToolChain();

			const optimizedPlan = await orchestrator.optimizeExecutionPlan(optimizableChain);

			expect(optimizedPlan.executionOrder).toBeDefined();
			expect(optimizedPlan.parallelGroups).toBeDefined();
			expect(optimizedPlan.estimatedExecutionTime).toBeGreaterThan(0);
			expect(optimizedPlan.resourceRequirements).toBeDefined();
		});

		it('should handle dependency failures with rollback', async () => {
			const rollbackChain = {
				...createMultiLayerToolChain(),
				enableRollback: true,
				steps: [
					{
						id: 'successful-step',
						layer: 'primitive',
						tool: 'atomic-operation',
						input: { operation: 'write', target: 'memory', key: 'test', value: 'data' },
						rollback: { operation: 'delete', target: 'memory', key: 'test' },
						dependencies: [],
					},
					{
						id: 'failing-step',
						layer: 'execution',
						tool: 'non-existent-tool',
						input: { operation: 'fail' },
						dependencies: ['successful-step'],
					},
				],
			};

			const result = await orchestrator.executeToolChain(rollbackChain);

			expect(result.success).toBeFalsy();
			expect(result.rollbackExecuted).toBeTruthy();
			expect(result.rollbackSteps).toContain('successful-step');
		});
	});

	describe('Tool Execution Optimization', () => {
		it('should cache tool results for performance', async () => {
			const cacheableChain = {
				id: 'cacheable-operations',
				enableCaching: true,
				steps: [
					{
						id: 'expensive-operation',
						layer: 'execution',
						tool: 'process-management',
						input: { action: 'execute', command: 'expensive-computation' },
						cacheable: true,
						cacheKey: 'expensive-computation-v1',
						dependencies: [],
					},
				],
			};

			// First execution
			const result1 = await orchestrator.executeToolChain(cacheableChain);
			expect(result1.cacheHits).toBe(0);

			// Second execution should use cache
			const result2 = await orchestrator.executeToolChain(cacheableChain);
			expect(result2.cacheHits).toBe(1);
		});

		it('should implement resource-aware execution scheduling', async () => {
			const resourceIntensiveChain = {
				id: 'resource-intensive',
				steps: Array.from({ length: 10 }, (_, i) => ({
					id: `intensive-task-${i}`,
					layer: 'execution',
					tool: 'process-management',
					input: { action: 'execute', command: `task-${i}` },
					resourceRequirements: { cpu: 0.2, memory: 100 },
					dependencies: [],
				})),
			};

			const result = await orchestrator.executeToolChain(resourceIntensiveChain);

			expect(result.resourceOptimization).toBeTruthy();
			expect(result.maxConcurrentExecutions).toBeLessThanOrEqual(10);
			expect(result.resourceUtilization).toBeDefined();
		});

		it('should provide adaptive timeout management', async () => {
			const timeoutChain = {
				id: 'timeout-management',
				adaptiveTimeouts: true,
				steps: [
					{
						id: 'fast-operation',
						layer: 'primitive',
						tool: 'atomic-operation',
						input: { operation: 'read', target: 'memory', key: 'fast-data' },
						expectedDuration: 100,
						dependencies: [],
					},
					{
						id: 'slow-operation',
						layer: 'execution',
						tool: 'process-management',
						input: { action: 'execute', command: 'slow-computation' },
						expectedDuration: 5000,
						dependencies: [],
					},
				],
			};

			const result = await orchestrator.executeToolChain(timeoutChain);

			expect(result.adaptiveTimeouts).toBeTruthy();
			expect(result.timeoutAdjustments).toBeDefined();
		});

		it('should implement intelligent batching', async () => {
			const batchableChain = {
				id: 'batchable-operations',
				enableBatching: true,
				steps: Array.from({ length: 20 }, (_, i) => ({
					id: `batch-item-${i}`,
					layer: 'primitive',
					tool: 'atomic-operation',
					input: { operation: 'read', target: 'memory', key: `item-${i}` },
					batchable: true,
					batchGroup: 'memory-reads',
					dependencies: [],
				})),
			};

			const result = await orchestrator.executeToolChain(batchableChain);

			expect(result.batchesExecuted).toBeGreaterThan(0);
			expect(result.batchEfficiency).toBeGreaterThan(0.5);
		});
	});

	describe('Tool Performance Monitoring', () => {
		it('should collect comprehensive execution metrics', async () => {
			const monitoredChain = createMultiLayerToolChain();

			const result = await orchestrator.executeToolChain(monitoredChain);
			const metrics = await orchestrator.getExecutionMetrics(result.executionId);

			expect(metrics).toEqual(
				expect.objectContaining({
					executionId: result.executionId,
					totalDuration: expect.any(Number),
					stepsExecuted: expect.any(Number),
					layersUsed: expect.any(Array),
					performanceByLayer: expect.any(Object),
					resourceUsage: expect.any(Object),
					errorRate: expect.any(Number),
				}),
			);
		});

		it('should provide real-time execution monitoring', async () => {
			const monitoringEvents: any[] = [];
			orchestrator.on('execution-progress', (event) => monitoringEvents.push(event));

			const monitoredChain = createMultiLayerToolChain();
			await orchestrator.executeToolChain(monitoredChain);

			expect(monitoringEvents).toHaveLength(4); // One for each step
			expect(monitoringEvents[0]).toEqual(
				expect.objectContaining({
					stepId: 'fetch-data',
					status: 'completed',
					duration: expect.any(Number),
					layer: 'execution',
				}),
			);
		});

		it('should track tool usage analytics', async () => {
			// Execute multiple chains to generate analytics data
			const chain1 = createMultiLayerToolChain();
			const chain2 = { ...createMultiLayerToolChain(), id: 'analytics-test-2' };

			await orchestrator.executeToolChain(chain1);
			await orchestrator.executeToolChain(chain2);

			const analytics = await orchestrator.getToolAnalytics();

			expect(analytics.mostUsedTools).toBeDefined();
			expect(analytics.averageExecutionTimes).toBeDefined();
			expect(analytics.successRates).toBeDefined();
			expect(analytics.layerUtilization).toBeDefined();
		});

		it('should detect performance anomalies', async () => {
			// Create a simple test chain with proper schema compliance
			const anomalyDetectionChain = {
				id: 'anomaly-detection-test',
				steps: [
					{
						id: 'slow-operation',
						layer: 'execution' as const,
						tool: 'process-management',
						input: { action: 'execute', command: 'slow-test' },
						dependencies: [],
						cacheable: false,
						batchable: false,
					},
				],
				parallelExecution: false,
				failFast: true,
				enableRollback: false,
				enableCaching: false,
				enableBatching: false,
				enableSecurity: false,
				adaptiveTimeouts: false,
				enableAnomalyDetection: true, // This is what we're testing
				enableCircuitBreaker: false,
			};

			// Mock the execution layer to simulate slow performance
			const mockSpy = vi.spyOn(mockLayers.execution, 'invokeTool').mockImplementation(async () => {
				// Simulate slow operation (above 5-second threshold)
				await new Promise((resolve) => setTimeout(resolve, 5100));
				return { success: true };
			});

			const result = await orchestrator.executeToolChain(anomalyDetectionChain);

			expect(result.anomaliesDetected).toBeTruthy();
			expect(result.performanceWarnings).toContain('execution-layer-slow');

			// Clean up mock
			mockSpy.mockRestore();
		}, 15000); // Give 15 seconds timeout

		it('should provide optimization recommendations', async () => {
			// Execute several chains to build optimization data
			const chains = Array.from({ length: 5 }, (_, i) => ({
				...createMultiLayerToolChain(),
				id: `optimization-test-${i}`,
			}));

			for (const chain of chains) {
				await orchestrator.executeToolChain(chain);
			}

			const recommendations = await orchestrator.getOptimizationRecommendations();

			expect(recommendations).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: expect.any(String),
						description: expect.any(String),
						impact: expect.any(String),
						implementation: expect.any(String),
					}),
				]),
			);
		});
	});

	describe('Error Handling and Recovery', () => {
		it('should throw ToolOrchestrationError for orchestration failures', async () => {
			const invalidChain = {
				id: 'invalid-chain',
				steps: [
					{
						id: 'invalid-step',
						layer: 'non-existent-layer',
						tool: 'non-existent-tool',
						input: {},
						dependencies: [],
					},
				],
			};

			await expect(orchestrator.executeToolChain(invalidChain)).rejects.toThrow(
				ToolOrchestrationError,
			);
		});

		it('should provide detailed error context for debugging', async () => {
			try {
				await orchestrator.executeToolChain({
					id: 'error-context-test',
					steps: [
						{
							id: 'failing-step',
							layer: 'execution',
							tool: 'non-existent-tool',
							input: { operation: 'fail' },
							dependencies: [],
						},
					],
				});
				expect.fail('Should have thrown error');
			} catch (error) {
				expect(error).toBeInstanceOf(ToolOrchestrationError);
				expect(error.context).toEqual(
					expect.objectContaining({
						chainId: 'error-context-test',
						failedStep: 'failing-step',
						layer: 'execution',
						executionId: expect.any(String),
					}),
				);
			}
		});

		it('should implement circuit breaker for failing tools', async () => {
			const circuitBreakerChain = {
				id: 'circuit-breaker-test',
				enableCircuitBreaker: true,
				steps: Array.from({ length: 10 }, (_, i) => ({
					id: `failing-step-${i}`,
					layer: 'execution',
					tool: 'failing-tool',
					input: { operation: 'fail' },
					dependencies: [],
				})),
			};

			// Mock failing tool
			vi.spyOn(mockLayers.execution, 'invokeTool').mockRejectedValue(new Error('Tool failure'));

			const result = await orchestrator.executeToolChain(circuitBreakerChain);

			expect(result.circuitBreakerTriggered).toBeTruthy();
			expect(result.stepsExecuted).toBeLessThan(10); // Should stop after threshold
		});
	});

	describe('Integration and Lifecycle', () => {
		it('should integrate with ToolSecurityLayer for validation', async () => {
			const secureChain = {
				...createMultiLayerToolChain(),
				enableSecurity: true,
				securityContext: {
					userId: 'test-user',
					roles: ['user'],
					permissions: ['/data/*'],
				},
			};

			const result = await orchestrator.executeToolChain(secureChain);

			expect(result.securityValidation).toBeTruthy();
			expect(result.securityContext).toBeDefined();
		});

		it('should support graceful shutdown with active executions', async () => {
			const longRunningChain = {
				id: 'long-running',
				steps: [
					{
						id: 'long-step',
						layer: 'execution',
						tool: 'process-management',
						input: { action: 'execute', command: 'long-running-process' },
						dependencies: [],
					},
				],
			};

			// Start execution but don't wait
			const executionPromise = orchestrator.executeToolChain(longRunningChain);

			// Initiate shutdown
			const shutdownPromise = orchestrator.shutdown();

			// Both should complete without hanging
			await Promise.race([executionPromise, shutdownPromise]);

			const status = orchestrator.getStatus();
			expect(status.isShutdown).toBeTruthy();
		});

		it('should provide orchestrator status and health information', () => {
			const status = orchestrator.getStatus();

			expect(status).toEqual(
				expect.objectContaining({
					layerCount: 3,
					activeExecutions: expect.any(Number),
					totalExecutions: expect.any(Number),
					health: expect.objectContaining({
						status: expect.any(String),
						layerHealth: expect.any(Object),
						lastHealthCheck: expect.any(Date),
					}),
					performance: expect.objectContaining({
						averageExecutionTime: expect.any(Number),
						successRate: expect.any(Number),
						resourceUtilization: expect.any(Object),
					}),
				}),
			);
		});
	});
});
