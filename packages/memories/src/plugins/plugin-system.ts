import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import type { MemoryPlugin, PurgeCriteria, QueryContext, StoreContext } from './types.js';

export class PluginAwareMemoryStore implements MemoryStore {
  private plugins = new Map<string, MemoryPlugin>();

  constructor(private store: MemoryStore) { }

  register(plugin: MemoryPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin with name "${plugin.name}" already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    let processed = memory;
    const context: StoreContext = { namespace, timestamp: Date.now() };

    // Execute before hooks in order
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforeStore) {
        try {
          processed = await plugin.onBeforeStore(processed, context);
        } catch (error) {
          // Log error but continue with other plugins
          console.error(`Plugin ${plugin.name} onBeforeStore failed:`, error);
        }
      }
    }

    const result = await this.store.upsert(processed, namespace);

    // Execute after hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterStore) {
        try {
          await plugin.onAfterStore(result, context);
        } catch (error) {
          // Log error but continue with other plugins
          console.error(`Plugin ${plugin.name} onAfterStore failed:`, error);
        }
      }
    }

    return result;
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.store.get(id, namespace);
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    return this.store.delete(id, namespace);
  }

  async searchByText(query: TextQuery, namespace = 'default'): Promise<Memory[]> {
    const context: QueryContext = { namespace, timestamp: Date.now() };

    // Execute before hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforeRetrieve) {
        try {
          await plugin.onBeforeRetrieve(query, context);
        } catch (error) {
          console.error(`Plugin ${plugin.name} onBeforeRetrieve failed:`, error);
        }
      }
    }

    let results = await this.store.searchByText(query, namespace);

    // Execute after hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterRetrieve) {
        try {
          results = await plugin.onAfterRetrieve(results, context);
        } catch (error) {
          console.error(`Plugin ${plugin.name} onAfterRetrieve failed:`, error);
        }
      }
    }

    return results;
  }

  async searchByVector(query: VectorQuery, namespace = 'default'): Promise<(Memory & { score: number })[]> {
    const context: QueryContext = { namespace, timestamp: Date.now() };

    // Execute before hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforeRetrieve) {
        try {
          await plugin.onBeforeRetrieve(query, context);
        } catch (error) {
          console.error(`Plugin ${plugin.name} onBeforeRetrieve failed:`, error);
        }
      }
    }

    let results = (await this.store.searchByVector(query, namespace)) as (Memory & { score: number })[];

    // Execute after hooks (plugin API expects Memory[]; allow plugins to mutate results)
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterRetrieve) {
        try {
          const pluginResult = await plugin.onAfterRetrieve(results, context);
          // Ensure a score field exists on all returned results
          results = pluginResult.map((r) => {
            const maybe = r as Partial<Memory> & Record<string, unknown>;
            const score = typeof maybe.score === 'number' ? maybe.score : 0;
            return { ...(maybe as Memory), score };
          });
        } catch (error) {
          console.error(`Plugin ${plugin.name} onAfterRetrieve failed:`, error);
        }
      }
    }

    return results;
  }

  async purgeExpired(nowISO: string, namespace = 'default'): Promise<number> {
    const criteria: PurgeCriteria = { namespace, timestamp: nowISO };

    // Execute before hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforePurge) {
        try {
          const shouldProceed = await plugin.onBeforePurge(criteria);
          if (!shouldProceed) {
            return 0; // Skip purge
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} onBeforePurge failed:`, error);
        }
      }
    }

    const count = await this.store.purgeExpired(nowISO, namespace);

    // Execute after hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterPurge) {
        try {
          await plugin.onAfterPurge(count, criteria);
        } catch (error) {
          console.error(`Plugin ${plugin.name} onAfterPurge failed:`, error);
        }
      }
    }

    return count;
  }

  list(namespace = 'default') {
    return this.store.list(namespace);
  }
}
