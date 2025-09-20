import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObservableMemoryStore, createMemoryObservability } from '../../src/observability/observable-store.js';
import { OpenTelemetryObservabilityProvider } from '../../src/observability/provider.js';
import { createMemory, TestMemoryStore } from '../test-utils.js';
import type { Memory, TextQuery } from '../../src/domain/types.js';

describe('Observable Memory Store', () => {
  let baseStore: TestMemoryStore;
  let observableStore: ObservableMemoryStore;
  let mockProvider: any;
  let testMemory: Memory;

  beforeEach(() => {
    baseStore = new TestMemoryStore();

    mockProvider = {
      createSpan: vi.fn().mockImplementation(async (name, fn) => {
        const mockSpan = {
          setAttribute: vi.fn(),
          setAttributes: vi.fn(),
          setStatus: vi.fn(),
          recordException: vi.fn(),
          end: vi.fn(),
        };
        return fn(mockSpan);
      }),
      recordMetrics: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    };

    observableStore = new ObservableMemoryStore(baseStore, mockProvider);
    testMemory = createMemory({
      text: 'Test memory for observability',
      tags: ['test', 'observability'],
    });
  });

  describe('Operation Wrapping', () => {
    it('should wrap upsert operation with observability', async () => {
      // When
      const result = await observableStore.upsert(testMemory, 'test-ns');

      // Then
      expect(result).toBeDefined();
      expect(mockProvider.createSpan).toHaveBeenCalledWith(
        'memories.upsert',
        expect.any(Function),
        {
          'memory.id': testMemory.id,
          'memory.kind': testMemory.kind,
          'operation.type': 'upsert',
          'memory.namespace': 'test-ns',
        }
      );
      expect(mockProvider.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'upsert',
          namespace: 'test-ns',
          success: true,
          duration: expect.any(Number),
        })
      );
    });

    it('should wrap get operation with observability', async () => {
      // Given
      await baseStore.upsert(testMemory, 'test-ns');

      // When
      const result = await observableStore.get(testMemory.id, 'test-ns');

      // Then
      expect(result).toEqual(testMemory);
      expect(mockProvider.createSpan).toHaveBeenCalledWith(
        'memories.get',
        expect.any(Function),
        {
          'memory.id': testMemory.id,
          'operation.type': 'get',
          'memory.namespace': 'test-ns',
        }
      );
    });

    it('should wrap delete operation with observability', async () => {
      // Given
      await baseStore.upsert(testMemory);

      // When
      await observableStore.delete(testMemory.id, 'test-ns');

      // Then
      expect(mockProvider.createSpan).toHaveBeenCalledWith(
        'memories.delete',
        expect.any(Function),
        {
          'memory.id': testMemory.id,
          'operation.type': 'delete',
          'memory.namespace': 'test-ns',
        }
      );
    });

    it('should wrap searchByText operation with observability', async () => {
      // Given
      await baseStore.upsert(testMemory, 'test-ns');
      const query: TextQuery = { text: 'test', limit: 5 };

      // When
      const results = await observableStore.searchByText(query, 'test-ns');

      // Then
      expect(results).toHaveLength(1);
      expect(mockProvider.createSpan).toHaveBeenCalledWith(
        'memories.searchByText',
        expect.any(Function),
        {
          'operation.type': 'searchByText',
          'query.text': 'test',
          'query.limit': 5,
          'result.count': undefined,
          'memory.namespace': 'test-ns',
        }
      );
    });

    it('should handle errors and record failure metrics', async () => {
      // Given
      const errorStore = new TestMemoryStore();
      errorStore.upsert = vi.fn().mockRejectedValue(new Error('Test error'));
      const errorObservableStore = new ObservableMemoryStore(errorStore, mockProvider);

      // When/Then
      await expect(errorObservableStore.upsert(testMemory)).rejects.toThrow('Test error');

      expect(mockProvider.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'upsert',
          success: false,
          attributes: expect.objectContaining({
            'error.type': 'Error',
          }),
        })
      );
    });

    it('should record memory size in metrics for upsert', async () => {
      // Given
      const largeMemory = createMemory({
        text: 'x'.repeat(1000), // 1KB
      });

      // When
      await observableStore.upsert(largeMemory, 'test-ns');

      // Then
      expect(mockProvider.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'upsert',
          memorySize: 1000,
        })
      );
    });
  });

  describe('Provider Access', () => {
    it('should provide access to the observability provider', () => {
      // When
      const provider = observableStore.getObservabilityProvider();

      // Then
      expect(provider).toBe(mockProvider);
    });
  });
});

describe('Memory Observability Factory', () => {
  it('should create memory observability wrapper', () => {
    // Given
    const store = new TestMemoryStore();

    // When
    const observability = createMemoryObservability(store, {
      tracing: true,
      metrics: true,
    });

    // Then
    expect(observability).toBeDefined();
    expect(observability.getProvider()).toBeDefined();
    expect(observability.wrapStoreOperation).toBeDefined();
    expect(observability.recordMetrics).toBeDefined();
  });
});