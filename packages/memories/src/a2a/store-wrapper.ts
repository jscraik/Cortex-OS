import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { MemoryA2AEventPublisher } from './event-publisher.js';
import type { A2AEventPublisherConfig } from './types.js';

/**
 * A2A-aware Memory Store Wrapper
 *
 * Wraps a MemoryStore to automatically publish A2A events for all operations.
 */
export class A2AAwareMemoryStore implements MemoryStore {
  private eventPublisher: MemoryA2AEventPublisher;

  constructor(
    private store: MemoryStore,
    config: A2AEventPublisherConfig,
  ) {
    this.eventPublisher = new MemoryA2AEventPublisher(config);
  }

  /**
   * Get the event publisher
   */
  getEventPublisher(): MemoryA2AEventPublisher {
    return this.eventPublisher;
  }

  /**
   * Set the A2A outbox integration
   */
  setOutbox(outbox: any): void {
    this.eventPublisher.setOutbox(outbox);
  }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    const startTime = Date.now();

    try {
      // Get the existing memory to detect if this is an update
      const existing = await this.store.get(memory.id, namespace);
      const isUpdate = !!existing;

      const result = await this.store.upsert(memory, namespace);

      // Publish appropriate event
      if (isUpdate) {
        await this.eventPublisher.publishMemoryUpdated(memory.id, namespace, {
          memory: result,
          changes: {
            old: existing!,
            new: result,
          },
        });
      } else {
        await this.eventPublisher.publishMemoryCreated(memory.id, namespace, {
          memory: result,
        });
      }

      return result;
    } catch (err) {
      const error = err as Error;
      await this.eventPublisher.publishMemoryError(memory.id, namespace, {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
        operation: 'upsert',
        context: {
          namespace,
          memoryId: memory.id,
          executionTimeMs: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.store.get(id, namespace);
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    try {
      await this.store.delete(id, namespace);

      await this.eventPublisher.publishMemoryDeleted(id, namespace, {
        memoryId: id,
        reason: 'manual',
      });
    } catch (err) {
      const error = err as Error;
      await this.eventPublisher.publishMemoryError(id, namespace, {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
        operation: 'delete',
        context: {
          namespace,
          memoryId: id,
        },
      });
      throw error;
    }
  }

  async searchByText(query: TextQuery, namespace = 'default'): Promise<Memory[]> {
    const startTime = Date.now();

    try {
      const results = await this.store.searchByText(query, namespace);

      await this.eventPublisher.publishMemorySearched(`search-${Date.now()}`, namespace, {
        query: {
          text: query.text,
          limit: query.limit || query.topK || 10,
        },
        results: {
          count: results.length,
          memories: results,
          executionTimeMs: Date.now() - startTime,
        },
      });

      return results;
    } catch (err) {
      const error = err as Error;
      await this.eventPublisher.publishMemoryError('search-error', namespace, {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
        operation: 'searchByText',
        context: {
          namespace,
          query,
          executionTimeMs: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  async searchByVector(
    query: VectorQuery,
    namespace = 'default',
  ): Promise<(Memory & { score: number })[]> {
    const startTime = Date.now();

    try {
      const results = await this.store.searchByVector(query, namespace);

      await this.eventPublisher.publishMemorySearched(`search-${Date.now()}`, namespace, {
        query: {
          vector: query.vector || query.embedding,
          limit: query.limit || query.topK || 10,
        },
        results: {
          count: results.length,
          memories: results,
          executionTimeMs: Date.now() - startTime,
        },
      });

      return results;
    } catch (err) {
      const error = err as Error;
      await this.eventPublisher.publishMemoryError('search-error', namespace, {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
        operation: 'searchByVector',
        context: {
          namespace,
          query,
          executionTimeMs: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  async purgeExpired(nowISO: string, namespace = 'default'): Promise<number> {
    try {
      const count = await this.store.purgeExpired(nowISO, namespace);

      if (count > 0) {
        await this.eventPublisher.publishMemoryPurged(`purge-${Date.now()}`, namespace, {
          namespace,
          count,
          timestamp: nowISO,
        });
      }

      return count;
    } catch (err) {
      const error = err as Error;
      await this.eventPublisher.publishMemoryError('purge-error', namespace, {
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        },
        operation: 'purgeExpired',
        context: {
          namespace,
          timestamp: nowISO,
        },
      });
      throw error;
    }
  }
}
