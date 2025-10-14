/**
 * @fileoverview GraphRAG Service GPU Shutdown Integration Tests - RED Phase
 * 
 * Tests to ensure GraphRAGService.close() properly shuts down GPU acceleration manager.
 * These tests are designed to FAIL initially to drive TDD implementation.
 * 
 * @requires vitest
 * @requires GraphRAGService module
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock heavy dependencies to focus on GPU shutdown integration
vi.mock('../../src/retrieval/QdrantHybrid.js', () => ({
  QdrantHybridSearch: class MockQdrantSearch {
    constructor() {}
    async close() { 
      console.info('[brAInwav] Mock Qdrant closed');
    }
    async search() { return { results: [], totalCount: 0 }; }
    async healthCheck() { return true; }
  },
  QdrantConfigSchema: vi.fn()
}));

vi.mock('../../src/db/prismaClient.js', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    // Add minimal stubs for GraphRAG operations
    graphNode: { findMany: vi.fn().mockResolvedValue([]) },
    graphEdge: { findMany: vi.fn().mockResolvedValue([]) }
  },
  shutdownPrisma: vi.fn().mockResolvedValue(void 0)
}));

vi.mock('../../src/precomputation/QueryPrecomputer.js', () => ({
  getQueryPrecomputer: vi.fn(() => ({
    precompute: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../../src/streaming/StreamingResponse.js', () => ({
  getStreamingResponse: vi.fn(() => ({
    stream: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../../src/scaling/AutoScalingManager.js', () => ({
  getAutoScalingManager: vi.fn(() => ({
    scale: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../../src/ml/MLOptimizationManager.js', () => ({
  getMLOptimizationManager: vi.fn(() => ({
    optimize: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('../../src/cdn/CDNCacheManager.js', () => ({
  getCDNCacheManager: vi.fn(() => ({
    cache: vi.fn(),
    stop: vi.fn()
  }))
}));

// Mock GPU acceleration with spy capabilities
const mockStopGPUAccelerationManager = vi.fn().mockResolvedValue(void 0);
const mockGetGPUAccelerationManager = vi.fn(() => ({
  generateEmbeddings: vi.fn().mockResolvedValue([]),
  stop: vi.fn().mockResolvedValue(void 0),
  isEnabled: true
}));

vi.mock('../../src/acceleration/GPUAcceleration.js', () => ({
  getGPUAccelerationManager: mockGetGPUAccelerationManager,
  stopGPUAccelerationManager: mockStopGPUAccelerationManager
}));

// Import after mocking
import { GraphRAGService } from '../../src/services/GraphRAGService.js';
import { shutdownPrisma } from '../../src/db/prismaClient.js';

// Minimal service configuration for testing
const MINIMAL_CONFIG = {
  qdrant: {
    url: 'http://localhost:6333',
    collection: 'test_collection',
    timeout: 5000
  },
  gpu: {
    enabled: true,
    cuda: {
      enabled: true,
      deviceIds: [0],
      maxMemoryUsage: 1000,
      batchSize: 10,
      maxConcurrentBatches: 2,
      timeout: 30000
    },
    fallback: { enabled: true, cpuBatchSize: 5 },
    monitoring: { enabled: true, metricsInterval: 1000 }
  },
  external: {
    enabled: false,
    providers: []
  },
  precomputation: {
    enabled: false
  },
  streaming: {
    enabled: false
  },
  autoScaling: {
    enabled: false
  },
  mlOptimization: {
    enabled: false
  },
  cdn: {
    enabled: false
  }
};

describe('GraphRAG Service GPU Shutdown Integration - RED Phase (Failing Tests)', () => {
  let service: GraphRAGService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2025-10-12T22:00:00Z'));
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.close();
      } catch {
        // Ignore cleanup errors in tests
      }
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('GPU Manager Shutdown Integration', () => {
    test('should call stopGPUAccelerationManager during service close', async () => {
      // Setup: Create service with GPU acceleration enabled
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Verify service initialized properly
      expect(service).toBeDefined();
      
      // Action: Close the service
      await service.close();
      
      // ASSERTION: GPU shutdown function should be called exactly once
      // THIS WILL FAIL until stopGPUAccelerationManager is imported and called
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledTimes(1);
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledWith();
      
      console.info('[brAInwav] GPU shutdown integration test assertion', {
        brand: 'brAInwav',
        timestamp: new Date().toISOString(),
        expectedCalls: 1,
        actualCalls: mockStopGPUAccelerationManager.mock.calls.length,
        serviceCloseCompleted: true
      });
    });

    test('should call GPU shutdown before Prisma shutdown', async () => {
      // Setup: Track call order for proper shutdown sequence
      const callOrder: string[] = [];
      
      mockStopGPUAccelerationManager.mockImplementation(async () => {
        callOrder.push('gpu-shutdown');
      });
      
      (shutdownPrisma as any).mockImplementation(async () => {
        callOrder.push('prisma-shutdown');
      });
      
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Action: Close service and verify shutdown order
      await service.close();
      
      // ASSERTION: GPU should shutdown before Prisma for proper cleanup order
      // THIS WILL FAIL until GPU shutdown is added to close() method
      expect(callOrder).toContain('gpu-shutdown');
      expect(callOrder).toContain('prisma-shutdown');
      
      const gpuIndex = callOrder.indexOf('gpu-shutdown');
      const prismaIndex = callOrder.indexOf('prisma-shutdown');
      expect(gpuIndex).toBeGreaterThanOrEqual(0);
      expect(prismaIndex).toBeGreaterThan(gpuIndex);
    });

    test('should continue shutdown even if GPU stop fails', async () => {
      // Setup: Mock GPU shutdown to throw error
      const shutdownError = new Error('brAInwav: GPU shutdown failed');
      mockStopGPUAccelerationManager.mockRejectedValueOnce(shutdownError);
      
      // Spy on console.error to verify error logging
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Action: Close service despite GPU shutdown failure
      await expect(service.close()).resolves.not.toThrow();
      
      // ASSERTION: Should log error but continue with Prisma shutdown
      // THIS WILL FAIL until error handling is implemented in close()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[brAInwav]'),
        expect.objectContaining({
          brand: 'brAInwav',
          error: 'brAInwav: GPU shutdown failed',
          context: 'GraphRAGService.close'
        })
      );
      
      // Prisma shutdown should still be called
      expect(shutdownPrisma).toHaveBeenCalledTimes(1);
      
      errorSpy.mockRestore();
    });

    test('should handle GPU disabled mode gracefully', async () => {
      // Setup: Service with GPU disabled
      const configWithoutGPU = {
        ...MINIMAL_CONFIG,
        gpu: {
          ...MINIMAL_CONFIG.gpu,
          enabled: false
        }
      };
      
      service = new GraphRAGService(configWithoutGPU);
      
      // Action: Close service with GPU disabled
      await service.close();
      
      // ASSERTION: GPU shutdown should still be called (should no-op gracefully)
      // THIS WILL FAIL until GPU shutdown is added to close() method
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledTimes(1);
      
      // Prisma shutdown should proceed normally
      expect(shutdownPrisma).toHaveBeenCalledTimes(1);
    });

    test('should include GPU shutdown in service close timing', async () => {
      // Setup: Add timing to GPU shutdown
      let gpuShutdownDuration = 0;
      mockStopGPUAccelerationManager.mockImplementation(async () => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms simulated shutdown
        gpuShutdownDuration = Date.now() - start;
      });
      
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      const startTime = Date.now();
      
      // Action: Close service and measure timing
      await service.close();
      
      const totalTime = Date.now() - startTime;
      
      // ASSERTION: GPU shutdown should be included in total close time
      // THIS WILL FAIL until GPU shutdown is called during close()
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledTimes(1);
      expect(gpuShutdownDuration).toBeGreaterThan(0);
      expect(totalTime).toBeGreaterThanOrEqual(gpuShutdownDuration);
      
      console.info('[brAInwav] Service shutdown timing', {
        brand: 'brAInwav',
        timestamp: new Date().toISOString(),
        totalShutdownMs: totalTime,
        gpuShutdownMs: gpuShutdownDuration,
        gpuShutdownCalled: mockStopGPUAccelerationManager.mock.calls.length > 0
      });
    });
  });

  describe('Integration Error Scenarios', () => {
    test('should handle multiple close() calls safely', async () => {
      // Setup: Service that might be closed multiple times
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Action: Call close() multiple times
      await service.close();
      await service.close();
      await service.close();
      
      // ASSERTION: GPU shutdown should be called only once (idempotent)
      // This tests the robustness of the shutdown implementation
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledTimes(1);
      expect(shutdownPrisma).toHaveBeenCalledTimes(1);
    });

    test('should log brAInwav-branded shutdown completion', async () => {
      // Setup: Spy on console.info for shutdown completion logs
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Action: Close service
      await service.close();
      
      // ASSERTION: Should log completion with brAInwav branding
      const shutdownLogs = infoSpy.mock.calls.filter(call => 
        call[0]?.includes?.('brAInwav') && 
        call[1]?.status === 'shutdown'
      );
      
      expect(shutdownLogs.length).toBeGreaterThan(0);
      expect(shutdownLogs[0][1]).toEqual(
        expect.objectContaining({
          brand: 'brAInwav',
          status: 'shutdown'
        })
      );
      
      infoSpy.mockRestore();
    });
  });

  describe('GPU Manager Lifecycle Validation', () => {
    test('should verify GPU manager is accessible before shutdown', async () => {
      // Setup: Service with GPU enabled
      service = new GraphRAGService(MINIMAL_CONFIG);
      
      // Verify GPU manager was initialized
      expect(mockGetGPUAccelerationManager).toHaveBeenCalled();
      
      // Action: Use GPU manager then close service
      // (In real usage, embeddings would be generated before shutdown)
      await service.close();
      
      // ASSERTION: GPU shutdown should be called after manager was used
      expect(mockStopGPUAccelerationManager).toHaveBeenCalledTimes(1);
    });
  });
});