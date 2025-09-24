/**
 * @fileoverview Simplified Tool Orchestration Tests - TDD Approach
 * @module SimplifiedToolOrchestrationTests
 * @description Clean, focused tests following CODESTYLE.md and TDD principles
 * @author brAInwav Development Team
 * @version 3.6.1
 * @since 2024-12-21
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SimplifiedToolOrchestrator } from '../simplified-tool-orchestrator.js';
import type { ToolChain } from '../tool-orchestration-contracts.js';

// Simple test helper - functional approach (≤40 lines)
const createSimpleToolChain = (id: string, toolCount: number = 2): ToolChain => ({
	id,
	name: `Test Chain ${id}`,
	tools: Array.from({ length: toolCount }, (_, i) => ({
		id: `tool-${i}`,
		layer: 'execution' as const,
		operation: `operation-${i}`,
		dependencies: [],
		parallelizable: false,
		cacheable: false,
		retryable: false,
		optimizable: false,
		parameters: {},
	})),
	executionStrategy: 'sequential',
	timeout: 5000,
	dynamicDependencies: false,
	metadata: {},
});

describe('Simplified Tool Orchestration - TDD', () => {
	let orchestrator: SimplifiedToolOrchestrator;

	beforeEach(() => {
		orchestrator = new SimplifiedToolOrchestrator();
	});

	afterEach(async () => {
		await orchestrator.shutdown();
	});

	describe('Basic Functionality', () => {
		it('should execute a simple tool chain successfully', async () => {
			// Arrange
			const chain = createSimpleToolChain('test-basic');

			// Act
			const result = await orchestrator.executeChain(chain);

			// Assert
			expect(result.success).toBe(true);
			expect(result.chainId).toBe('test-basic');
			expect(result.totalTools).toBe(2);
			expect(result.toolResults).toHaveLength(2);
			expect(result.executionOrder).toEqual(['tool-0', 'tool-1']);
			expect(result.totalExecutionTime).toBeGreaterThan(0);
		});

		it('should handle empty tool chains', async () => {
			// Arrange
			const invalidChain = createSimpleToolChain('test-empty', 0);

			// Act & Assert - empty chains should be rejected as invalid
			await expect(orchestrator.executeChain(invalidChain)).rejects.toThrow('Invalid tool chain');
		});

		it('should reject invalid tool chains', async () => {
			// Arrange
			const invalidChain = {
				...createSimpleToolChain('test-invalid'),
				tools: [], // Invalid: must have at least one tool
			};

			// Act & Assert
			await expect(orchestrator.executeChain(invalidChain)).rejects.toThrow('Invalid tool chain');
		});
	});

	describe('Execution Status', () => {
		it('should provide execution status during execution', async () => {
			// Arrange
			const chain = createSimpleToolChain('test-status');

			// Act
			const executionPromise = orchestrator.executeChain(chain);

			// Check status immediately (might be running or completed)
			let status: any;
			try {
				status = await orchestrator.getExecutionStatus('test-status');
				expect(status.chainId).toBe('test-status');
				expect(status.totalTools).toBe(2);
			} catch (error) {
				// Status might not be available if execution is very fast
				expect((error as Error).message).toContain('No execution found');
			}

			// Wait for completion
			const result = await executionPromise;
			expect(result.success).toBe(true);
		});

		it('should throw error for non-existent execution status', async () => {
			// Act & Assert
			await expect(orchestrator.getExecutionStatus('non-existent')).rejects.toThrow(
				'No execution found for chain ID: non-existent',
			);
		});
	});

	describe('Event Emission', () => {
		it('should emit start and completion events with brAInwav branding', async () => {
			// Arrange
			const chain = createSimpleToolChain('test-events');
			const events: any[] = [];

			orchestrator.on('toolExecutionStarted', (event) => events.push(event));
			orchestrator.on('toolExecutionCompleted', (event) => events.push(event));

			// Act
			await orchestrator.executeChain(chain);

			// Assert
			expect(events).toHaveLength(2);

			const startEvent = events[0];
			expect(startEvent.type).toBe('toolExecutionStarted');
			expect(startEvent.chainId).toBe('test-events');
			expect(startEvent.organization).toBe('brAInwav');

			const completeEvent = events[1];
			expect(completeEvent.type).toBe('toolExecutionCompleted');
			expect(completeEvent.success).toBe(true);
			expect(completeEvent.organization).toBe('brAInwav');
		});
	});

	describe('Shutdown Behavior', () => {
		it('should shutdown gracefully with brAInwav branding', async () => {
			// Arrange
			const events: any[] = [];
			orchestrator.on('orchestratorShutdown', (event) => events.push(event));

			// Act
			await orchestrator.shutdown();

			// Assert
			expect(events).toHaveLength(1);
			expect(events[0].message).toContain('brAInwav Simplified Tool Orchestrator');
			expect(events[0].organization).toBe('brAInwav');
		});

		it('should handle multiple shutdown calls', async () => {
			// Act - multiple shutdowns should not cause issues
			await Promise.all([
				orchestrator.shutdown(),
				orchestrator.shutdown(),
				orchestrator.shutdown(),
			]);

			// Assert - no exception thrown
			expect(true).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should prevent concurrent execution of same chain', async () => {
			// Arrange
			const chain = createSimpleToolChain('test-concurrent');

			// Act - start first execution
			const execution1 = orchestrator.executeChain(chain);

			// Act & Assert - second execution should fail
			await expect(orchestrator.executeChain(chain)).rejects.toThrow(
				'Tool chain test-concurrent is already executing',
			);

			// Cleanup
			await execution1;
		});
	});
});
