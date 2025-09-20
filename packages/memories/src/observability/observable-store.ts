import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { createObservabilityProvider } from './provider.js';
import type {
  MemoryMetrics,
  MemoryObservability,
  MemorySpanAttributes,
  ObservabilityProvider,
} from './types.js';

/**
 * Observable Memory Store Wrapper
 *
 * Wraps a MemoryStore to add observability (tracing, metrics, logging)
 * to all operations.
 */
export class ObservableMemoryStore implements MemoryStore {
  private readonly provider: ObservabilityProvider;

  constructor(
    private readonly store: MemoryStore,
    provider?: ObservabilityProvider,
    config?: Parameters<typeof createObservabilityProvider>[0],
  ) {
    this.provider = provider || createObservabilityProvider(config);
  }

  /**
   * Get the observability provider
   */
  getObservabilityProvider(): ObservabilityProvider {
    return this.provider;
  }

  /**
   * Wrap store operations with observability
   */
  async wrapStoreOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    namespace: string,
    attributes?: MemorySpanAttributes,
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let memorySize: number | undefined;
    let error: Error | undefined;

    try {
      const result = await this.provider.createSpan<T>(
        `memories.${operation}`,
        async (span) => {
          span.setAttribute('memory.namespace', namespace);
          if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
              if (value !== undefined) {
                span.setAttribute(key, value);
              }
            });
          }
          return fn();
        },
        { 'memory.namespace': namespace, 'operation.type': operation, ...attributes },
      );

      success = true;

      // Extract memory size for metrics if applicable
      type HasMaybeText = { text?: unknown };
      if (
        operation === 'upsert' &&
        result &&
        typeof result === 'object' &&
        'text' in (result as HasMaybeText)
      ) {
        const textVal = (result as HasMaybeText).text;
        memorySize = Buffer.byteLength(
          typeof textVal === 'string' ? textVal : String(textVal ?? ''),
          'utf8',
        );
      }

      return result;
    } catch (err) {
      error = err as Error;
      throw error;
    } finally {
      // Record metrics
      this.provider.recordMetrics({
        operation,
        duration: Date.now() - startTime,
        success,
        memorySize,
        namespace,
        attributes: {
          ...(error ? { 'error.type': error.constructor.name } : {}),
          ...attributes,
        },
      });
    }
  }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    return this.wrapStoreOperation(
      'upsert',
      () => this.store.upsert(memory, namespace),
      namespace,
      {
        'memory.id': memory.id,
        'memory.kind': memory.kind,
        'operation.type': 'upsert',
        'memory.namespace': namespace,
      },
    );
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.wrapStoreOperation('get', () => this.store.get(id, namespace), namespace, {
      'memory.id': id,
      'operation.type': 'get',
      'memory.namespace': namespace,
    });
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    return this.wrapStoreOperation('delete', () => this.store.delete(id, namespace), namespace, {
      'memory.id': id,
      'operation.type': 'delete',
      'memory.namespace': namespace,
    });
  }

  async searchByText(query: TextQuery, namespace = 'default'): Promise<Memory[]> {
    return this.wrapStoreOperation(
      'searchByText',
      async () => {
        const results = await this.store.searchByText(query, namespace);
        return results;
      },
      namespace,
      {
        'operation.type': 'searchByText',
        'query.text': query.text,
        'query.limit': query.limit || query.topK || 10,
        'memory.namespace': namespace,
      },
    );
  }

  async searchByVector(query: VectorQuery, namespace = 'default'): Promise<Memory[]> {
    return this.wrapStoreOperation(
      'searchByVector',
      async () => {
        const results = await this.store.searchByVector(query, namespace);
        return results;
      },
      namespace,
      {
        'operation.type': 'searchByVector',
        'query.limit': query.limit || query.topK || 10,
        'memory.namespace': namespace,
      },
    );
  }

  async purgeExpired(nowISO: string, namespace = 'default'): Promise<number> {
    return this.wrapStoreOperation(
      'purgeExpired',
      async () => {
        const count = await this.store.purgeExpired(nowISO, namespace);
        return count;
      },
      namespace,
      {
        'operation.type': 'purgeExpired',
        'memory.namespace': namespace,
      },
    );
  }
}

/**
 * Create a memory observability wrapper
 */
export function createMemoryObservability(
  store: MemoryStore,
  config?: Parameters<typeof createObservabilityProvider>[0],
): MemoryObservability {
  const provider = createObservabilityProvider(config);
  const observableStore = new ObservableMemoryStore(store, provider);

  return {
    wrapStoreOperation: <T>(
      operation: string,
      fn: () => Promise<T>,
      namespace: string,
      attributes?: MemorySpanAttributes,
    ) => observableStore.wrapStoreOperation(operation, fn, namespace, attributes),

    recordMetrics: (metrics: MemoryMetrics) => provider.recordMetrics(metrics),

    getProvider: () => provider,
  };
}
