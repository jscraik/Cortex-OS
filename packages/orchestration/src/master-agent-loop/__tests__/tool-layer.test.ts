/**
 * @fileoverview Test suite for Tool Layer Abstraction
 * @module ToolLayer.test
 * @description TDD tests for nO architecture multi-layer tool system - Phase 3.1
 * @author brAInwav Development Team
 * @version 3.1.0
 * @since 2024-12-09
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolLayer } from '../tool-layer.js';

describe('ToolLayer', () => {
	let dashboardLayer: ToolLayer;
	let executionLayer: ToolLayer;
	let primitiveLayer: ToolLayer;

	beforeEach(() => {
		dashboardLayer = new ToolLayer('dashboard');
		executionLayer = new ToolLayer('execution');
		primitiveLayer = new ToolLayer('primitive');
	});

	afterEach(async () => {
		await dashboardLayer.shutdown();
		await executionLayer.shutdown();
		await primitiveLayer.shutdown();
	});

	describe('Layer Initialization and Configuration', () => {
		it('should provide level-appropriate tool access', async () => {
			// Dashboard layer should have visualization capabilities
			expect(dashboardLayer.getCapabilities()).toContain('visualization');
			expect(dashboardLayer.getCapabilities()).toContain('monitoring');
			expect(dashboardLayer.getCapabilities()).toContain('reporting');

			// Execution layer should have file system capabilities
			expect(executionLayer.getCapabilities()).toContain('file-system');
			expect(executionLayer.getCapabilities()).toContain('process-management');
			expect(executionLayer.getCapabilities()).toContain('network-operations');

			// Primitive layer should have atomic operations
			expect(primitiveLayer.getCapabilities()).toContain('memory-operations');
			expect(primitiveLayer.getCapabilities()).toContain('basic-io');
			expect(primitiveLayer.getCapabilities()).toContain('calculations');
		});

		it('should initialize with correct layer type', () => {
			expect(dashboardLayer.getLayerType()).toBe('dashboard');
			expect(executionLayer.getLayerType()).toBe('execution');
			expect(primitiveLayer.getLayerType()).toBe('primitive');
		});

		it('should validate layer type during construction', () => {
			expect(() => new ToolLayer('invalid-layer' as any)).toThrow('Invalid layer type');
		});

		it('should have proper capability boundaries', () => {
			// Dashboard layer should NOT have low-level capabilities
			expect(dashboardLayer.getCapabilities()).not.toContain('memory-operations');
			expect(dashboardLayer.getCapabilities()).not.toContain('file-system');

			// Primitive layer should NOT have high-level capabilities
			expect(primitiveLayer.getCapabilities()).not.toContain('visualization');
			expect(primitiveLayer.getCapabilities()).not.toContain('process-management');

			// Execution layer should be between dashboard and primitive
			expect(executionLayer.getCapabilities()).not.toContain('visualization');
			expect(executionLayer.getCapabilities()).not.toContain('memory-operations');
		});
	});

	describe('Tool Registration and Discovery', () => {
		it('should allow tool registration with validation', async () => {
			const visualizationTool = {
				id: 'execution-graph-viz',
				name: 'Execution Graph Visualizer',
				capabilities: ['visualization'],
				execute: vi.fn().mockResolvedValue({ type: 'graph', data: {} }),
				validate: vi.fn().mockReturnValue(true),
			};

			await dashboardLayer.registerTool(visualizationTool);

			const registeredTools = dashboardLayer.getRegisteredTools();
			expect(registeredTools).toHaveLength(1);
			expect(registeredTools[0].id).toBe('execution-graph-viz');
		});

		it('should prevent registration of incompatible tools', async () => {
			const memoryTool = {
				id: 'memory-allocator',
				name: 'Memory Allocator',
				capabilities: ['memory-operations'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			await expect(dashboardLayer.registerTool(memoryTool)).rejects.toThrow(
				'Tool capabilities not compatible with dashboard layer',
			);
		});

		it('should discover tools by capability', async () => {
			const tool1 = {
				id: 'file-reader',
				name: 'File Reader',
				capabilities: ['file-system', 'basic-io'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			const tool2 = {
				id: 'process-manager',
				name: 'Process Manager',
				capabilities: ['process-management'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			await executionLayer.registerTool(tool1);
			await executionLayer.registerTool(tool2);

			const fileSystemTools = await executionLayer.discoverTools('file-system');
			expect(fileSystemTools).toHaveLength(1);
			expect(fileSystemTools[0].id).toBe('file-reader');

			const processTools = await executionLayer.discoverTools('process-management');
			expect(processTools).toHaveLength(1);
			expect(processTools[0].id).toBe('process-manager');
		});

		it('should handle tool discovery with multiple capabilities', async () => {
			const multiCapTool = {
				id: 'multi-cap-tool',
				name: 'Multi Capability Tool',
				capabilities: ['file-system', 'network-operations'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			await executionLayer.registerTool(multiCapTool);

			const fileTools = await executionLayer.discoverTools('file-system');
			const networkTools = await executionLayer.discoverTools('network-operations');

			expect(fileTools).toContainEqual(multiCapTool);
			expect(networkTools).toContainEqual(multiCapTool);
		});
	});

	describe('Tool Validation and Security', () => {
		it('should validate tool inputs before execution', async () => {
			const secureTool = {
				id: 'secure-file-reader',
				name: 'Secure File Reader',
				capabilities: ['file-system'],
				execute: vi.fn().mockResolvedValue({ content: 'file data' }),
				validate: vi.fn().mockImplementation((input) => {
					return input.path && !input.path.includes('..');
				}),
			};

			await executionLayer.registerTool(secureTool);

			// Valid input should succeed
			await expect(
				executionLayer.invokeTool('secure-file-reader', { path: '/safe/path/file.txt' }),
			).resolves.toEqual({ content: 'file data' });

			// Invalid input should be rejected
			await expect(
				executionLayer.invokeTool('secure-file-reader', { path: '../../../etc/passwd' }),
			).rejects.toThrow('Tool input validation failed');
		});

		it('should enforce capability-based access control', async () => {
			const restrictedTool = {
				id: 'admin-tool',
				name: 'Admin Tool',
				capabilities: ['system-admin'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			// Should fail to register on any layer (system-admin not in any layer capabilities)
			await expect(dashboardLayer.registerTool(restrictedTool)).rejects.toThrow();
			await expect(executionLayer.registerTool(restrictedTool)).rejects.toThrow();
			await expect(primitiveLayer.registerTool(restrictedTool)).rejects.toThrow();
		});

		it('should audit tool usage', async () => {
			const auditedTool = {
				id: 'audited-calculator',
				name: 'Audited Calculator',
				capabilities: ['calculations'],
				execute: vi.fn().mockResolvedValue({ result: 42 }),
				validate: vi.fn().mockReturnValue(true),
			};

			await primitiveLayer.registerTool(auditedTool);

			const auditEvents: any[] = [];
			primitiveLayer.on('tool-executed', (event) => auditEvents.push(event));

			await primitiveLayer.invokeTool('audited-calculator', { operation: 'add', a: 20, b: 22 });

			expect(auditEvents).toHaveLength(1);
			expect(auditEvents[0]).toEqual(
				expect.objectContaining({
					toolId: 'audited-calculator',
					layerType: 'primitive',
					timestamp: expect.any(Date),
					inputHash: expect.any(String),
					executionTime: expect.any(Number),
				}),
			);
		});
	});

	describe('Tool Execution and Error Handling', () => {
		it('should execute tools with proper context', async () => {
			const contextAwareTool = {
				id: 'context-tool',
				name: 'Context Aware Tool',
				capabilities: ['calculations'],
				execute: vi.fn().mockImplementation(async (input, context) => {
					expect(context).toEqual(
						expect.objectContaining({
							layerType: 'primitive',
							toolId: 'context-tool',
							executionId: expect.any(String),
							timestamp: expect.any(Date),
						}),
					);
					return { result: input.value * 2 };
				}),
				validate: vi.fn().mockReturnValue(true),
			};

			await primitiveLayer.registerTool(contextAwareTool);

			const result = await primitiveLayer.invokeTool('context-tool', { value: 10 });
			expect(result).toEqual({ result: 20 });
			expect(contextAwareTool.execute).toHaveBeenCalledWith(
				{ value: 10 },
				expect.objectContaining({
					layerType: 'primitive',
					toolId: 'context-tool',
				}),
			);
		});

		it('should handle tool execution errors gracefully', async () => {
			const flakyTool = {
				id: 'flaky-tool',
				name: 'Flaky Tool',
				capabilities: ['calculations'],
				execute: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
				validate: vi.fn().mockReturnValue(true),
			};

			await primitiveLayer.registerTool(flakyTool);

			await expect(primitiveLayer.invokeTool('flaky-tool', { input: 'test' })).rejects.toThrow(
				'Tool execution failed',
			);

			// Verify error was logged for audit
			const errorEvents: any[] = [];
			primitiveLayer.on('tool-error', (event) => errorEvents.push(event));

			try {
				await primitiveLayer.invokeTool('flaky-tool', { input: 'test2' });
			} catch {
				// Expected to fail
			}

			expect(errorEvents).toHaveLength(1);
			expect(errorEvents[0].error.message).toBe('Tool execution failed');
		});

		it('should provide tool execution metrics', async () => {
			const metricsTool = {
				id: 'metrics-tool',
				name: 'Metrics Tool',
				capabilities: ['calculations'],
				execute: vi.fn().mockImplementation(async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					return { result: 'success' };
				}),
				validate: vi.fn().mockReturnValue(true),
			};

			await primitiveLayer.registerTool(metricsTool);

			const startTime = Date.now();
			await primitiveLayer.invokeTool('metrics-tool', {});
			const endTime = Date.now();

			const metrics = primitiveLayer.getToolMetrics('metrics-tool');
			expect(metrics).toEqual(
				expect.objectContaining({
					totalExecutions: 1,
					successfulExecutions: 1,
					failedExecutions: 0,
					averageExecutionTime: expect.any(Number),
					lastExecutionTime: expect.any(Date),
				}),
			);

			expect(metrics.averageExecutionTime).toBeGreaterThan(90);
			expect(metrics.averageExecutionTime).toBeLessThan(endTime - startTime + 50);
		});
	});

	describe('Layer Health and Monitoring', () => {
		it('should report layer health status', () => {
			const health = dashboardLayer.getLayerHealth();

			expect(health).toEqual(
				expect.objectContaining({
					layerType: 'dashboard',
					status: 'healthy',
					registeredTools: 0,
					activeExecutions: 0,
					totalExecutions: 0,
					errorRate: 0,
					lastHealthCheck: expect.any(Date),
				}),
			);
		});

		it('should update health status based on tool execution', async () => {
			const healthTool = {
				id: 'health-tool',
				name: 'Health Tool',
				capabilities: ['monitoring'],
				execute: vi.fn().mockResolvedValue({ status: 'ok' }),
				validate: vi.fn().mockReturnValue(true),
			};

			await dashboardLayer.registerTool(healthTool);

			const initialHealth = dashboardLayer.getLayerHealth();
			expect(initialHealth.registeredTools).toBe(1);

			await dashboardLayer.invokeTool('health-tool', {});

			const updatedHealth = dashboardLayer.getLayerHealth();
			expect(updatedHealth.totalExecutions).toBe(1);
			expect(updatedHealth.errorRate).toBe(0);
		});
	});

	describe('Graceful Shutdown', () => {
		it('should shutdown gracefully with cleanup', async () => {
			const shutdownTool = {
				id: 'shutdown-tool',
				name: 'Shutdown Tool',
				capabilities: ['basic-io'],
				execute: vi.fn().mockResolvedValue({}),
				validate: vi.fn().mockReturnValue(true),
			};

			await primitiveLayer.registerTool(shutdownTool);

			const shutdownEvents: any[] = [];
			primitiveLayer.on('layer-shutdown', (event) => shutdownEvents.push(event));

			await primitiveLayer.shutdown();

			expect(shutdownEvents).toHaveLength(1);
			expect(shutdownEvents[0]).toEqual(
				expect.objectContaining({
					layerType: 'primitive',
					registeredTools: 1,
					timestamp: expect.any(Date),
				}),
			);

			// Verify layer is no longer accepting new tool registrations
			const newTool = {
				id: 'post-shutdown-tool',
				name: 'Post Shutdown Tool',
				capabilities: ['basic-io'],
				execute: vi.fn(),
				validate: vi.fn(),
			};

			await expect(primitiveLayer.registerTool(newTool)).rejects.toThrow(
				'Cannot register tools on shutdown layer',
			);
		});
	});
});
