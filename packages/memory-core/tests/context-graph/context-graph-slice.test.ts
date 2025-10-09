/**
 * Context Graph Slice Tests - TDD RED Phase
 *
 * These tests define the expected behavior of the Context Graph Slice API.
 * All tests should initially FAIL (RED) before implementation.
 *
 * Tests cover:
 * - Context slicing with various depth and breadth configurations
 * - Topology-bounded context extraction
 * - Integration with GraphRAG service
 * - Evidence filtering and ABAC compliance
 * - Performance targets and error handling
 */

import { GraphEdgeType, GraphNodeType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextSliceService } from '../../src/context-graph/ContextSliceService.js';
import { GraphRAGService } from '../../src/services/GraphRAGService.js';

// Mock Prisma client
vi.mock('@prisma/client', () => ({
	PrismaClient: vi.fn(),
	GraphNodeType: {
		FUNCTION: 'FUNCTION',
		CLASS: 'CLASS',
		DOC: 'DOC',
	},
	GraphEdgeType: {
		DEPENDS_ON: 'DEPENDS_ON',
		IMPLEMENTS_CONTRACT: 'IMPLEMENTS_CONTRACT',
		CALLS_TOOL: 'CALLS_TOOL',
	},
}));

// Mock GraphRAG service
vi.mock('../../src/services/GraphRAGService.js', () => ({
	GraphRAGService: vi.fn().mockImplementation(() => ({
		query: vi.fn(),
		healthCheck: vi.fn(),
		getStats: vi.fn(),
		close: vi.fn(),
	})),
}));

// Mock EvidenceGate and ThermalMonitor
vi.mock('../../src/context-graph/evidence/EvidenceGate.js', () => ({
	EvidenceGate: vi.fn().mockImplementation(() => ({
		validateAccess: vi.fn(),
		generateEvidence: vi.fn(),
		createAuditEntry: vi.fn(),
		verifyEvidenceChain: vi.fn(),
		validateCompliance: vi.fn(),
		performSecurityCheck: vi.fn(),
	})),
}));

vi.mock('../../src/context-graph/thermal/ThermalMonitor.js', () => ({
	ThermalMonitor: vi.fn().mockImplementation(() => ({
		getCurrentTemperature: vi.fn(),
		getThermalTrend: vi.fn(),
		getThermalZone: vi.fn(),
		startMonitoring: vi.fn(),
		stopMonitoring: vi.fn(),
		onTemperatureChange: vi.fn(),
	})),
}));

describe('ContextSliceService', () => {
	let contextSliceService: ContextSliceService;
	let mockGraphRAGService: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGraphRAGService = new GraphRAGService({} as any);
		contextSliceService = new ContextSliceService(mockGraphRAGService);
	});

	describe('slice', () => {
		it('should slice context with default parameters', async () => {
			// Given
			const recipe = {
				query: 'test query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: ['DEPENDS_ON', 'IMPLEMENTS_CONTRACT'],
				filters: {},
			};

			const mockGraphRAGResult = {
				sources: [
					{
						id: 'chunk1',
						nodeId: 'node1',
						path: '/path/to/file1.ts',
						content: 'test content 1',
						score: 0.9,
						nodeType: GraphNodeType.FUNCTION,
						nodeKey: 'function1',
					},
				],
				graphContext: {
					focusNodes: 1,
					expandedNodes: 2,
					totalChunks: 1,
					edgesTraversed: 2,
				},
				metadata: {
					brainwavPowered: true,
					retrievalDurationMs: 50,
					queryTimestamp: '2025-01-09T10:00:00Z',
					brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				},
			};

			mockGraphRAGService.query.mockResolvedValue(mockGraphRAGResult);

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result).toBeDefined();
			expect(result.subgraph).toBeDefined();
			expect(result.subgraph.nodes).toHaveLength(1);
			expect(result.subgraph.edges).toHaveLength(0);
			expect(result.metadata.sliceDuration).toBeLessThan(100);
			expect(result.metadata.brainwavBranded).toBe(true);
		});

		it('should slice context with custom depth and breadth limits', async () => {
			// Given
			const recipe = {
				query: 'test query with depth',
				maxDepth: 3,
				maxNodes: 20,
				allowedEdgeTypes: [GraphEdgeType.IMPORTS, GraphEdgeType.CALLS_TOOL],
				filters: { nodeType: GraphNodeType.CLASS },
			};

			const mockGraphRAGResult = {
				sources: [
					{
						id: 'chunk1',
						nodeId: 'node1',
						path: '/path/to/class1.ts',
						content: 'class definition',
						score: 0.95,
						nodeType: GraphNodeType.CLASS,
						nodeKey: 'Class1',
					},
					{
						id: 'chunk2',
						nodeId: 'node2',
						path: '/path/to/class2.ts',
						content: 'another class',
						score: 0.85,
						nodeType: GraphNodeType.CLASS,
						nodeKey: 'Class2',
					},
				],
				graphContext: {
					focusNodes: 2,
					expandedNodes: 4,
					totalChunks: 2,
					edgesTraversed: 3,
				},
				metadata: {
					brainwavPowered: true,
					retrievalDurationMs: 80,
					queryTimestamp: '2025-01-09T10:00:00Z',
					brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				},
			};

			mockGraphRAGService.query.mockResolvedValue(mockGraphRAGResult);

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result.subgraph.nodes).toHaveLength(2);
			expect(result.subgraph.edges).toHaveLengthGreaterThan(0);
			expect(result.metadata.sliceDuration).toBeLessThan(150);
			expect(result.metadata.depthUsed).toBeLessThanOrEqual(3);
			expect(result.metadata.nodesExplored).toBeLessThanOrEqual(20);
		});

		it('should handle empty results gracefully', async () => {
			// Given
			const recipe = {
				query: 'nonexistent query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			const mockGraphRAGResult = {
				sources: [],
				graphContext: {
					focusNodes: 0,
					expandedNodes: 0,
					totalChunks: 0,
					edgesTraversed: 0,
				},
				metadata: {
					brainwavPowered: true,
					retrievalDurationMs: 20,
					queryTimestamp: '2025-01-09T10:00:00Z',
					brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				},
			};

			mockGraphRAGService.query.mockResolvedValue(mockGraphRAGResult);

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result.subgraph.nodes).toHaveLength(0);
			expect(result.subgraph.edges).toHaveLength(0);
			expect(result.metadata.sliceDuration).toBeLessThan(50);
			expect(result.metadata.brainwavBranded).toBe(true);
		});

		it('should apply evidence filtering before slicing', async () => {
			// Given
			const recipe = {
				query: 'sensitive query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: { sensitivity: 'high' },
				evidenceRequired: true,
			};

			// Mock evidence gate filtering
			const _mockEvidenceGate = vi.fn().mockResolvedValue(false); // Deny access

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result).toBeDefined();
			expect(result.subgraph.nodes).toHaveLength(0);
			expect(result.metadata.evidenceFiltered).toBe(true);
			expect(result.metadata.evidenceReason).toContain('Access denied');
		});

		it('should enforce thermal constraints during slicing', async () => {
			// Given
			const recipe = {
				query: 'large query',
				maxDepth: 5,
				maxNodes: 100,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			// Mock thermal policy
			const _mockThermalPolicy = vi.fn().mockReturnValue({
				allowed: true,
				maxDepth: 2, // Reduced from 5
				maxNodes: 20, // Reduced from 100
			});

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result.metadata.thermalConstrained).toBe(true);
			expect(result.metadata.depthUsed).toBeLessThanOrEqual(2);
			expect(result.metadata.nodesExplored).toBeLessThanOrEqual(20);
		});

		it('should handle GraphRAG service errors gracefully', async () => {
			// Given
			const recipe = {
				query: 'error query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			mockGraphRAGService.query.mockRejectedValue(new Error('GraphRAG service unavailable'));

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result).toBeDefined();
			expect(result.subgraph.nodes).toHaveLength(0);
			expect(result.metadata.error).toContain('brAInwav GraphRAG service error');
			expect(result.metadata.brainwavBranded).toBe(true);
		});

		it('should validate input parameters', async () => {
			// Given
			const invalidRecipe = {
				query: '', // Invalid empty query
				maxDepth: -1, // Invalid negative depth
				maxNodes: 0, // Invalid zero nodes
				allowedEdgeTypes: [], // Invalid empty edge types
				filters: {},
			};

			// When
			const result = await contextSliceService.slice(invalidRecipe);

			// Then - This should FAIL until implementation
			expect(result).toBeDefined();
			expect(result.metadata.error).toContain('Invalid input parameters');
			expect(result.metadata.brainwavBranded).toBe(true);
		});

		it('should track slicing metrics for observability', async () => {
			// Given
			const recipe = {
				query: 'metric tracking query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			const mockGraphRAGResult = {
				sources: [
					{
						id: 'chunk1',
						nodeId: 'node1',
						path: '/path/to/file1.ts',
						content: 'test content',
						score: 0.9,
						nodeType: GraphNodeType.FUNCTION,
						nodeKey: 'function1',
					},
				],
				graphContext: {
					focusNodes: 1,
					expandedNodes: 2,
					totalChunks: 1,
					edgesTraversed: 2,
				},
				metadata: {
					brainwavPowered: true,
					retrievalDurationMs: 50,
					queryTimestamp: '2025-01-09T10:00:00Z',
					brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				},
			};

			mockGraphRAGService.query.mockResolvedValue(mockGraphRAGResult);

			// Mock metrics collection
			const _mockMetrics = vi.fn();

			// When
			const result = await contextSliceService.slice(recipe);

			// Then - This should FAIL until implementation
			expect(result.metrics).toBeDefined();
			expect(result.metrics.nodesProcessed).toBeGreaterThan(0);
			expect(result.metrics.edgesProcessed).toBeGreaterThan(0);
			expect(result.metrics.sliceDuration).toBeGreaterThan(0);
			expect(result.metrics.brainwavOperationId).toMatch(/^cortex-slice-/);
		});
	});

	describe('validateRecipe', () => {
		it('should validate recipe schema', async () => {
			// Given
			const validRecipe = {
				query: 'test query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			// When
			const result = await contextSliceService.validateRecipe(validRecipe);

			// Then - This should FAIL until implementation
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject invalid recipe schema', async () => {
			// Given
			const invalidRecipe = {
				query: '',
				maxDepth: -1,
				maxNodes: 0,
				allowedEdgeTypes: ['INVALID_EDGE_TYPE'],
				filters: null,
			};

			// When
			const result = await contextSliceService.validateRecipe(invalidRecipe);

			// Then - This should FAIL until implementation
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors).toContain('Query cannot be empty');
			expect(result.errors).toContain('Max depth must be positive');
		});
	});

	describe('performance', () => {
		it('should complete slicing within performance targets', async () => {
			// Given
			const recipe = {
				query: 'performance test query',
				maxDepth: 2,
				maxNodes: 10,
				allowedEdgeTypes: [GraphEdgeType.DEPENDS_ON],
				filters: {},
			};

			const mockGraphRAGResult = {
				sources: [
					{
						id: 'chunk1',
						nodeId: 'node1',
						path: '/path/to/file1.ts',
						content: 'test content',
						score: 0.9,
						nodeType: GraphNodeType.FUNCTION,
						nodeKey: 'function1',
					},
				],
				graphContext: {
					focusNodes: 1,
					expandedNodes: 2,
					totalChunks: 1,
					edgesTraversed: 2,
				},
				metadata: {
					brainwavPowered: true,
					retrievalDurationMs: 30,
					queryTimestamp: '2025-01-09T10:00:00Z',
					brainwavSource: 'brAInwav Cortex-OS GraphRAG',
				},
			};

			mockGraphRAGService.query.mockResolvedValue(mockGraphRAGResult);

			const startTime = Date.now();

			// When
			await contextSliceService.slice(recipe);

			const duration = Date.now() - startTime;

			// Then - This should FAIL until implementation
			expect(duration).toBeLessThan(100); // Performance target: <100ms
		});
	});
});
