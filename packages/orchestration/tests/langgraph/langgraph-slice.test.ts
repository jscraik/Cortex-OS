/**
 * LangGraph.js Slice Node Tests - TDD RED Phase
 *
 * These tests define the expected behavior of the LangGraph.js context slice node.
 * All tests should initially FAIL (RED) before implementation.
 *
 * Tests cover:
 * - Context slicing workflow integration
 * - Thermal-aware slicing with constraints
 * - Evidence gating validation
 * - Error handling and recovery
 * - Performance and budget compliance
 * - Integration with existing thermal management
 */

import * as crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type ContextGraphOrchestrator,
	createContextGraph,
} from '../../src/langgraph/context-graph/create-context-graph.js';

// Mock dependencies
vi.mock('@cortex-os/memory-core/src/context-graph/ContextSliceService.js', () => ({
	ContextSliceService: vi.fn().mockImplementation(() => ({
		slice: vi.fn(),
	})),
}));

vi.mock('@cortex-os/memory-core/src/context-graph/ContextPackService.js', () => ({
	ContextPackService: vi.fn().mockImplementation(() => ({
		pack: vi.fn(),
	})),
}));

vi.mock('@cortex-os/model-gateway/src/hybrid-router/HybridRoutingEngine.js', () => ({
	HybridRoutingEngine: vi.fn().mockImplementation(() => ({
		route: vi.fn(),
	})),
}));

vi.mock('@cortex-os/memory-core/src/thermal/ThermalMonitor.js', () => ({
  ThermalMonitor: vi.fn().mockImplementation(() => ({
    getCurrentTemperature: vi.fn(),
    getConstraints: vi.fn()
  }))
}));

vi.mock('@cortex-os/memory-core/src/context-graph/evidence/EvidenceGate.js', () => ({
	EvidenceGate: vi.fn().mockImplementation(() => ({
		validateAccess: vi.fn(),
	})),
}));

describe('LangGraph.js Context Slice Node', () => {
	let orchestrator: ContextGraphOrchestrator;
	let mockContextSliceService: any;
	let mockThermalMonitor: any;
	let mockEvidenceGate: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock services
		mockContextSliceService = {
			slice: vi.fn(),
		};

		mockThermalMonitor = {
			getCurrentTemperature: vi.fn(),
			getConstraints: vi.fn(),
		};

		mockEvidenceGate = {
			validateAccess: vi.fn(),
		};

		// Create orchestrator with mocked dependencies
		orchestrator = createContextGraph({
			contextSliceService: mockContextSliceService,
			contextPackService: {} as any,
			hybridRoutingEngine: {} as any,
			thermalMonitor: mockThermalMonitor,
			evidenceGate: mockEvidenceGate,
			maxTokens: 10000,
			maxCost: 1.0,
			enableThermalManagement: true,
			enableEvidenceGating: true,
		});
	});

	describe('Basic Context Slicing', () => {
		it('should execute context slicing workflow successfully', async () => {
			// Given
			const mockSubgraph = {
				nodes: [
					{
						id: 'node1',
						type: 'FUNCTION',
						key: 'test',
						label: 'Test Function',
						path: '/test.ts',
						content: 'function test() {}',
					},
				],
				edges: [],
				metadata: { focusNodes: 1, expandedNodes: 0, totalChunks: 1, edgesTraversed: 0 },
			};

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: mockSubgraph,
				metadata: { sliceDuration: 50, brainwavBranded: true },
			});

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			const initialState = {
				query: 'Test query',
				evidenceRequired: true,
				thermalConstraints: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.currentStep).toBe('slice');
			expect(result.subgraph).toEqual(mockSubgraph);
			expect(result.stepHistory).toContain('slice');
			expect(result.error).toBeUndefined();
			expect(result.metadata.sliceDuration).toBe(50);
			expect(result.metadata.brainwavThermalManaged).toBe(true);
		});

                it('should handle evidence validation before slicing', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 65,
				zone: 'optimal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				policiesApplied: ['evidence-required'],
				evidence: { evidenceValid: true },
			});

			const initialState = {
				query: 'Evidence test query',
				evidenceRequired: true,
				userId: 'user123',
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(mockEvidenceGate.validateAccess).toHaveBeenCalledWith({
				user: { id: 'user123', role: 'user' },
				resource: { id: expect.any(String), type: 'context_slice' },
				action: 'read',
				requestId: expect.any(String),
			});
			expect(result.stepHistory).toContain('slice');
		});

		it('should reject slicing when evidence validation fails', async () => {
			// Given
			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: false,
				reason: 'Access denied by evidence gate',
			});

			const initialState = {
				query: 'Unauthorized query',
				evidenceRequired: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.currentStep).toBe('error');
			expect(result.error).toContain('Evidence validation failed');
			expect(result.stepHistory).toContain('slice');
			expect(result.recoveryAttempts).toBe(1);
                });

                it('generates a secure ctx-prefixed request id when missing', async () => {
                        const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(
                                '12345678-1234-1234-1234-1234567890ab',
                        );

                        mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
                                currentTemp: 65,
                                zone: 'optimal',
                                critical: false,
                        });

                        mockEvidenceGate.validateAccess.mockResolvedValue({ granted: true });
                        mockContextSliceService.slice.mockResolvedValue({
                                subgraph: { nodes: [], edges: [], metadata: {} },
                                metadata: {},
                        });

                        const result = await orchestrator.execute({
                                query: 'Secure request id',
                                evidenceRequired: false,
                                thermalConstraints: false,
                        });

                        expect(result.metadata?.requestId).toBe('ctx-123456781234123412341234567890ab');

                        uuidSpy.mockRestore();
                });
        });

	describe('Thermal-Aware Slicing', () => {
		it('should apply thermal constraints when temperature is elevated', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 85,
				zone: 'elevated',
				critical: false,
			});

			mockThermalMonitor.getConstraints.mockResolvedValue({
				throttlingActive: true,
				maxDepth: 2, // Reduced from default
				maxNodes: 10, // Reduced from default
				throttlingLevel: 'moderate',
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: { nodes: [], edges: [], metadata: {} },
				metadata: { sliceDuration: 80 },
			});

			const initialState = {
				query: 'Thermal test query',
				evidenceRequired: true,
				thermalConstraints: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(mockThermalMonitor.getCurrentTemperature).toHaveBeenCalled();
			expect(mockThermalMonitor.getConstraints).toHaveBeenCalled();
			expect(mockContextSliceService.slice).toHaveBeenCalledWith(
				expect.objectContaining({
					maxDepth: 2,
					maxNodes: 10,
				}),
			);
			expect(result.thermalConstraints).toBe(true);
			expect(result.thermalStatus.zone).toBe('elevated');
		});

		it('should abort slicing when thermal shutdown is triggered', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 105,
				zone: 'shutdown',
				critical: true,
			});

			const initialState = {
				query: 'Thermal shutdown test',
				evidenceRequired: false,
				thermalConstraints: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.currentStep).toBe('error');
			expect(result.error).toContain('Thermal shutdown triggered');
			expect(result.stepHistory).toContain('slice');
			expect(result.metadata.sliceError).toBe(true);
		});

		it('should skip thermal constraints when disabled', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 95,
				zone: 'critical',
				critical: true,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: { nodes: [], edges: [], metadata: {} },
				metadata: { sliceDuration: 60 },
			});

			const initialState = {
				query: 'Thermal disabled test',
				evidenceRequired: true,
				thermalConstraints: false,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(mockThermalMonitor.getCurrentTemperature).not.toHaveBeenCalled();
			expect(result.currentStep).toBe('slice');
			expect(result.error).toBeUndefined();
		});
	});

	describe('Recipe Handling', () => {
		it('should create default recipe when none provided', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: { nodes: [], edges: [], metadata: {} },
				metadata: { sliceDuration: 45 },
			});

			const initialState = {
				query: 'Default recipe test',
				evidenceRequired: true,
			};

			// When
			const _result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(mockContextSliceService.slice).toHaveBeenCalledWith(
				expect.objectContaining({
					query: 'Default recipe test',
					maxDepth: 3,
					maxNodes: 20,
					allowedEdgeTypes: ['DEPENDS_ON', 'IMPLEMENTS_CONTRACT', 'CALLS_TOOL'],
					evidenceRequired: true,
					thermalConstraints: true,
				}),
			);
		});

		it('should use provided recipe when available', async () => {
			// Given
			const customRecipe = {
				query: 'Custom recipe query',
				maxDepth: 5,
				maxNodes: 50,
				allowedEdgeTypes: ['DEPENDS_ON'],
				filters: { type: 'test' },
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: { nodes: [], edges: [], metadata: {} },
				metadata: { sliceDuration: 55 },
			});

			const initialState = {
				query: 'Custom recipe test',
				recipe: customRecipe,
				evidenceRequired: true,
			};

			// When
			const _result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(mockContextSliceService.slice).toHaveBeenCalledWith(customRecipe);
		});
	});

	describe('Token Tracking', () => {
		it('should track tokens used during slicing', async () => {
			// Given
			const mockSubgraph = {
				nodes: [
					{ id: 'node1', content: 'A'.repeat(1000) }, // ~250 tokens
					{ id: 'node2', content: 'B'.repeat(1000) }, // ~250 tokens
				],
				edges: [],
				metadata: {},
			};

			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: mockSubgraph,
				metadata: { sliceDuration: 50 },
			});

			const initialState = {
				query: 'Token tracking test',
				evidenceRequired: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.tokensUsed).toBeGreaterThan(0);
			expect(result.tokensUsed).toBeGreaterThan(500); // Should account for subgraph JSON
			expect(result.costAccrued).toBe(0); // Local slicing has no cost
		});
	});

	describe('Error Handling', () => {
		it('should handle context slice service errors gracefully', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockRejectedValue(new Error('Slice service unavailable'));

			const initialState = {
				query: 'Error handling test',
				evidenceRequired: true,
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.currentStep).toBe('error');
			expect(result.error).toContain('Context graph execution failed');
			expect(result.stepHistory).toContain('slice');
			expect(result.recoveryAttempts).toBe(1);
		});

		it('should limit recovery attempts to prevent infinite loops', async () => {
			// Given
			mockContextSliceService.slice.mockRejectedValue(new Error('Persistent error'));

			const initialState = {
				query: 'Recovery limit test',
				evidenceRequired: false,
			};

			// When - Execute multiple times to test recovery limits
			const result1 = await orchestrator.execute(initialState);
			const result2 = await orchestrator.execute({ ...initialState, recoveryAttempts: 2 });

			// Then - This should FAIL until implementation
			expect(result1.recoveryAttempts).toBe(1);
			expect(result2.recoveryAttempts).toBe(3);
			// Should not continue attempting recovery after 3 attempts
		});
	});

	describe('Performance and Monitoring', () => {
		it('should track execution duration and metadata', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 70,
				zone: 'normal',
				critical: false,
			});

			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				evidence: { valid: true },
			});

			mockContextSliceService.slice.mockResolvedValue({
				subgraph: { nodes: [], edges: [], metadata: {} },
				metadata: { sliceDuration: 75 },
			});

			const initialState = {
				query: 'Performance test',
				evidenceRequired: true,
				requestId: 'test-123',
			};

			// When
			const result = await orchestrator.execute(initialState);

			// Then - This should FAIL until implementation
			expect(result.metadata.startTime).toBeDefined();
			expect(result.metadata.sliceDuration).toBe(75);
			expect(result.metadata.requestId).toBe('test-123');
			expect(result.metadata.brainwavOrchestrated).toBe(true);
		});
	});
});
