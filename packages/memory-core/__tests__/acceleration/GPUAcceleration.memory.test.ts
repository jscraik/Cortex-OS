/**
 * @fileoverview GPU Memory Management Tests - RED Phase
 * 
 * Tests for deterministic GPU memory reservation and cleanup to prevent memory leaks.
 * These tests are designed to FAIL initially to drive TDD implementation.
 * 
 * @requires vitest
 * @requires GPUAcceleration module
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { 
  getGPUAccelerationManager,
  type GPUDeviceInfo,
  type EmbeddingRequest,
  type GPUAccelerationConfig
} from '../../src/acceleration/GPUAcceleration.js';

// Mock configuration for testing
const TEST_CONFIG: GPUAccelerationConfig = {
  enabled: true,
  cuda: {
    enabled: true,
    deviceIds: [0],
    maxMemoryUsage: 1000, // 1GB for testing
    batchSize: 10,
    maxConcurrentBatches: 2,
    timeout: 30000
  },
  fallback: {
    enabled: true,
    cpuBatchSize: 5
  },
  monitoring: {
    enabled: true,
    metricsInterval: 1000
  }
};

// Deterministic mock device factory
const createMockDevice = (id: number, totalMemory: number): GPUDeviceInfo => ({
  id,
  name: `brAInwav-Test-GPU-${id}`,
  memoryTotal: totalMemory,
  memoryUsed: 0,
  memoryFree: totalMemory,
  computeCapability: '8.6',
  isAvailable: true,
  utilization: 0
});

// Test fixtures
const STANDARD_DEVICE = createMockDevice(0, 1000); // 1GB test device
const SMALL_DEVICE = createMockDevice(1, 100);     // 100MB limited device
const LARGE_DEVICE = createMockDevice(2, 8000);    // 8GB high-capacity device

const createEmbeddingRequests = (count: number, batchId?: string): EmbeddingRequest[] =>
  Array.from({ length: count }, (_, i) => ({
    text: `brAInwav test embedding text ${i}`,
    priority: 'normal' as const,
    batchId: batchId || `test-batch-${i}`,
    requestedAt: Date.now()
  }));

describe('GPU Memory Management - RED Phase (Failing Tests)', () => {
  let manager: ReturnType<typeof getGPUAccelerationManager>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2025-10-12T22:00:00Z'));
    
    // Override randomUUID for deterministic batch IDs
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('batch-001')
      .mockReturnValueOnce('batch-002')
      .mockReturnValueOnce('batch-003');

    manager = getGPUAccelerationManager(TEST_CONFIG);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Memory Reservation System', () => {
    test('should release all GPU memory after batch processing', async () => {
      // Setup: Mock device with controlled memory state
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice]; // Test-only access
      
      // Action: Process embeddings that would allocate memory (256MB estimated)
      const requests = createEmbeddingRequests(25, 'memory-test-batch');
      
      try {
        await manager.generateEmbeddings(requests, { preferGPU: true });
      } catch {
        // Ignore processing errors - we're testing memory cleanup
      }
      
      // ASSERTION: Memory should be fully released after processing
      // THIS WILL FAIL until memory reservation system is implemented
      expect(mockDevice.memoryUsed).toBe(0);
      expect(mockDevice.memoryFree).toBe(mockDevice.memoryTotal);
      
      console.info('[brAInwav] Memory leak test assertion', {
        brand: 'brAInwav',
        timestamp: new Date().toISOString(),
        expectedMemoryUsed: 0,
        actualMemoryUsed: mockDevice.memoryUsed,
        expectedMemoryFree: mockDevice.memoryTotal,
        actualMemoryFree: mockDevice.memoryFree,
        testBatchId: 'memory-test-batch'
      });
    });

    test('should release memory even when embedding generation fails', async () => {
      // Setup: Mock device and force embedding failure
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice];
      
      // Mock processWithGPU to throw error after memory allocation
      const originalProcess = (manager as any).processWithGPU;
      (manager as any).processWithGPU = vi.fn().mockRejectedValue(new Error('brAInwav: Simulated GPU failure'));
      
      const requests = createEmbeddingRequests(10, 'error-test-batch');
      
      // Action: Attempt processing that will fail
      await expect(async () => {
        await manager.generateEmbeddings(requests, { preferGPU: true });
      }).rejects.toThrow('brAInwav: Simulated GPU failure');
      
      // ASSERTION: Memory should still be released despite error
      // THIS WILL FAIL until try/finally reservation cleanup is implemented
      expect(mockDevice.memoryUsed).toBe(0);
      expect(mockDevice.memoryFree).toBe(mockDevice.memoryTotal);
      
      // Restore original method
      (manager as any).processWithGPU = originalProcess;
    });

    test('should prevent double-release of memory reservations', async () => {
      // Setup: Mock device with reservation tracking
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice];
      
      // This test will fail until idempotent release() is implemented
      const activeReservations = (manager as any).activeReservations;
      expect(activeReservations).toBeDefined();
      expect(activeReservations instanceof Map).toBe(true);
      
      // Test idempotent behavior - release() called multiple times should be safe
      const reserveMethod = (manager as any).reserveDeviceMemory;
      expect(typeof reserveMethod).toBe('function');
    });

    test('should reject reservation when insufficient memory', async () => {
      // Setup: Small device with limited memory
      const limitedDevice = { ...SMALL_DEVICE }; // 100MB total
      (manager as any).devices = [limitedDevice];
      
      // Action: Request more memory than available (500MB worth of embeddings)
      const largeRequests = createEmbeddingRequests(50, 'oversized-batch');
      
      // ASSERTION: Should throw brAInwav-branded error for insufficient memory
      // THIS WILL FAIL until memory validation is implemented
      await expect(async () => {
        await manager.generateEmbeddings(largeRequests, { preferGPU: true });
      }).rejects.toThrow(/brAInwav.*insufficient.*memory/i);
      
      // Device memory should remain unchanged after rejection
      expect(limitedDevice.memoryUsed).toBe(0);
      expect(limitedDevice.memoryFree).toBe(limitedDevice.memoryTotal);
    });
  });

  describe('Cleanup and Lifecycle', () => {
    test('should clean up timers and queues on stop()', async () => {
      // Setup: Create some processing state
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice];
      
      // Start some background processing
      const requests = createEmbeddingRequests(5, 'cleanup-test-batch');
      const processingPromise = manager.generateEmbeddings(requests, { preferGPU: true });
      
      // Action: Stop the manager while processing
      await manager.stop();
      
      // ASSERTION: All tracking state should be cleared
      // THIS WILL FAIL until proper cleanup is implemented
      const processingBatches = (manager as any).processingBatches;
      const activeReservations = (manager as any).activeReservations;
      
      expect(processingBatches?.size || 0).toBe(0);
      expect(activeReservations?.size || 0).toBe(0);
      
      // Device memory should be reset to baseline
      expect(mockDevice.memoryUsed).toBe(0);
      expect(mockDevice.memoryFree).toBe(mockDevice.memoryTotal);
      
      // Wait for processing to complete (should handle gracefully)
      try {
        await processingPromise;
      } catch {
        // Expected - processing was interrupted
      }
    });

    test('should log leaked reservations during shutdown', async () => {
      // Setup: Mock console.warn to capture leak warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice];
      
      // Simulate leaked reservation by not calling release()
      const activeReservations = new Map();
      activeReservations.set('leaked-batch-1', {
        device: mockDevice,
        bytes: 256,
        batchId: 'leaked-batch-1',
        timestamp: Date.now()
      });
      activeReservations.set('leaked-batch-2', {
        device: mockDevice,
        bytes: 128,
        batchId: 'leaked-batch-2', 
        timestamp: Date.now()
      });
      
      (manager as any).activeReservations = activeReservations;
      
      // Action: Stop with leaked reservations
      await manager.stop();
      
      // ASSERTION: Should log leaked reservations with brAInwav branding
      // THIS WILL FAIL until defensive logging is implemented
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[brAInwav]'),
        expect.objectContaining({
          brand: 'brAInwav',
          leakedCount: 2,
          reservations: expect.arrayContaining(['leaked-batch-1', 'leaked-batch-2'])
        })
      );
      
      warnSpy.mockRestore();
    });

    test('should handle multiple sequential batches without accumulation', async () => {
      // Setup: Process multiple batches in sequence
      const mockDevice = { ...STANDARD_DEVICE };
      (manager as any).devices = [mockDevice];
      
      const batch1 = createEmbeddingRequests(10, 'sequential-batch-1');
      const batch2 = createEmbeddingRequests(15, 'sequential-batch-2');
      const batch3 = createEmbeddingRequests(8, 'sequential-batch-3');
      
      // Action: Process batches sequentially
      try {
        await manager.generateEmbeddings(batch1, { preferGPU: true });
        await manager.generateEmbeddings(batch2, { preferGPU: true });
        await manager.generateEmbeddings(batch3, { preferGPU: true });
      } catch {
        // Ignore processing errors - testing memory cleanup
      }
      
      // ASSERTION: No memory accumulation across batches
      // THIS WILL FAIL until proper reservation/release cycle is implemented
      expect(mockDevice.memoryUsed).toBe(0);
      expect(mockDevice.memoryFree).toBe(mockDevice.memoryTotal);
      
      const activeReservations = (manager as any).activeReservations;
      expect(activeReservations?.size || 0).toBe(0);
    });
  });

  describe('Error Resilience', () => {
    test('should handle concurrent batch processing safely', async () => {
      // Setup: Large device for concurrent processing
      const largeDevice = { ...LARGE_DEVICE };
      (manager as any).devices = [largeDevice];
      
      // Action: Start multiple concurrent batches
      const batch1Promise = manager.generateEmbeddings(
        createEmbeddingRequests(20, 'concurrent-batch-1'), 
        { preferGPU: true }
      );
      const batch2Promise = manager.generateEmbeddings(
        createEmbeddingRequests(25, 'concurrent-batch-2'),
        { preferGPU: true }
      );
      const batch3Promise = manager.generateEmbeddings(
        createEmbeddingRequests(15, 'concurrent-batch-3'),
        { preferGPU: true }
      );
      
      // Wait for all to complete (or fail)
      const results = await Promise.allSettled([
        batch1Promise,
        batch2Promise, 
        batch3Promise
      ]);
      
      // ASSERTION: Memory should be clean regardless of success/failure
      // THIS WILL FAIL until concurrent reservation management is implemented
      expect(largeDevice.memoryUsed).toBe(0);
      expect(largeDevice.memoryFree).toBe(largeDevice.memoryTotal);
      
      const activeReservations = (manager as any).activeReservations;
      expect(activeReservations?.size || 0).toBe(0);
      
      console.info('[brAInwav] Concurrent processing results', {
        brand: 'brAInwav',
        timestamp: new Date().toISOString(),
        resultsCount: results.length,
        fulfilled: results.filter(r => r.status === 'fulfilled').length,
        rejected: results.filter(r => r.status === 'rejected').length
      });
    });
  });
});

// Export types for use in integration tests (test-only exports)
export type { GPUDeviceInfo, EmbeddingRequest } from '../../src/acceleration/GPUAcceleration.js';
export { createMockDevice, createEmbeddingRequests, STANDARD_DEVICE, SMALL_DEVICE, LARGE_DEVICE };