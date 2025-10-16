import { randomUUID } from 'node:crypto';
import type {
  DeleteMemoryInput,
  DeleteMemoryResult,
  GetMemoryInput,
  GetMemoryResult,
  HealthStatus,
  MemoryProvider,
  SearchMemoryInput,
  SearchMemoryResult,
  StoreMemoryInput,
  StoreMemoryResult,
} from '../provider/MemoryProvider.js';
import type { MemoryCoreConfig, QdrantConfig } from '../types.js';

export interface LocalMemoryProviderOptions {
  /** Maximum number of records to retain in memory. */
  maxRecords?: number;
  maxLimit?: number;
}

interface MemoryRecord {
  id: string;
  text: string;
  tags: string[];
  meta?: Record<string, unknown>;
  createdAt: string;
}

function normaliseTags(tags?: string[]): string[] {
  if (!tags) return [];
  return tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);
}

interface TaskQueue {
  add<T>(task: () => Promise<T>): Promise<T>;
}

export interface LocalMemoryProviderDependencies {
  databaseFactory?: (config: LocalMemoryProviderResolvedOptions) => unknown;
  qdrantFactory?: (config: QdrantConfig) => unknown;
  queueFactory?: (concurrency: number) => TaskQueue;
}

type LocalMemoryProviderResolvedOptions = LocalMemoryProviderOptions & Partial<MemoryCoreConfig>;

/**
 * Lightweight in-memory implementation of the memory provider interface.
 *
 * The previous implementation depended on a large number of unfinished integrations
 * (Prisma models, Qdrant clients, Pieces adapters, bespoke loggers, etc.). None of
 * those modules exist in the current workspace, which meant the TypeScript compiler
 * could not resolve dozens of imports and the provider class surfaced nearly one
 * hundred type errors.  To unblock development we provide a pragmatic in-memory
 * implementation that satisfies the exported API surface without pulling in the
 * missing dependencies.  The class focuses on deterministic, easily testable
 * behaviour while keeping the public contract identical to the original file.
 */
export class LocalMemoryProvider implements MemoryProvider {
  private readonly records: Map<string, MemoryRecord>;
  private readonly maxRecords: number;
  private readonly database: unknown;
  private readonly qdrant: unknown;
  private readonly queue: TaskQueue;

  constructor(
    options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig> = {},
    dependencies: LocalMemoryProviderDependencies = {},
  ) {
    const resolved = this.resolveOptions(options);
    this.records = this.initializeRecordStore();
    this.database = this.initializeDatabase(resolved, dependencies.databaseFactory);
    this.qdrant = this.initializeQdrant(resolved, dependencies.qdrantFactory);
    this.queue = this.initializeQueue(resolved, dependencies.queueFactory);
    this.maxRecords = this.resolveMaxRecords(resolved);
  }

  private resolveOptions(
    options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig>,
  ): LocalMemoryProviderResolvedOptions {
    return { ...options } as LocalMemoryProviderResolvedOptions;
  }

  private initializeRecordStore(): Map<string, MemoryRecord> {
    return new Map<string, MemoryRecord>();
  }

  private initializeDatabase(
    config: LocalMemoryProviderResolvedOptions,
    databaseFactory?: LocalMemoryProviderDependencies['databaseFactory'],
  ): unknown {
    if (!databaseFactory) {
      return undefined;
    }
    return databaseFactory(config);
  }

  private initializeQdrant(
    config: LocalMemoryProviderResolvedOptions,
    qdrantFactory?: LocalMemoryProviderDependencies['qdrantFactory'],
  ): unknown {
    if (!qdrantFactory || !config.qdrant) {
      return undefined;
    }
    return qdrantFactory(config.qdrant);
  }

  private initializeQueue(
    config: LocalMemoryProviderResolvedOptions,
    queueFactory?: LocalMemoryProviderDependencies['queueFactory'],
  ): TaskQueue {
    const concurrency = this.resolveQueueConcurrency(config);
    if (queueFactory) {
      return queueFactory(concurrency);
    }
    return this.createDefaultQueue();
  }

  private resolveQueueConcurrency(config: LocalMemoryProviderResolvedOptions): number {
    return config.queueConcurrency ?? 1;
  }

  private createDefaultQueue(): TaskQueue {
    return {
      add: async <T>(task: () => Promise<T>) => task(),
    } satisfies TaskQueue;
  }

  private resolveMaxRecords(config: LocalMemoryProviderResolvedOptions): number {
    return config.maxRecords ?? config.maxLimit ?? 1_000;
  }

  async store(input: StoreMemoryInput): Promise<StoreMemoryResult> {
    return this.queue.add(async () => {
      const id = input.id ?? randomUUID();
      const createdAt = new Date().toISOString();

      const record: MemoryRecord = {
        id,
        text: input.text,
        tags: normaliseTags(input.tags),
        meta: input.meta,
        createdAt,
      };

      if (this.records.size >= this.maxRecords) {
        // Find the key of the record with the oldest createdAt timestamp
        let oldestKey: string | undefined;
        let oldestDate: string | undefined;
        for (const [key, rec] of this.records.entries()) {
          if (!oldestDate || rec.createdAt < oldestDate) {
            oldestDate = rec.createdAt;
            oldestKey = key;
          }
        }
        if (oldestKey !== undefined) {
          this.records.delete(oldestKey);
        }
      }

      this.records.set(id, record);
      return { id, createdAt };
    });
  }

  async search(input: SearchMemoryInput): Promise<SearchMemoryResult> {
    const start = Date.now();
    const query = input.query.trim().toLowerCase();
    const tags = normaliseTags(input.filterTags);

    const hits = Array.from(this.records.values())
      .filter((record) => {
        if (query.length > 0 && !record.text.toLowerCase().includes(query)) {
          return false;
        }
        if (tags.length > 0) {
          return tags.some((tag) => record.tags.includes(tag));
        }
        return true;
      })
      .map((record) => ({
        id: record.id,
        text: record.text,
        score: query.length === 0 ? 0.5 : 1.0,
        source: 'local' as const,
      }))
      .slice(0, input.topK ?? 10);

    const tookMs = Date.now() - start;
    return { hits, tookMs };
  }

  async get(input: GetMemoryInput): Promise<GetMemoryResult> {
    const record = this.records.get(input.id);
    if (!record) {
      throw new Error(`Memory ${input.id} not found`);
    }

    return {
      id: record.id,
      text: record.text,
      tags: [...record.tags],
      meta: record.meta,
    };
  }

  async remove(input: DeleteMemoryInput): Promise<DeleteMemoryResult> {
    const deleted = this.records.delete(input.id);
    return { id: input.id, deleted };
  }

  async health(): Promise<HealthStatus> {
    return { brand: 'brAInwav', ok: true };
  }
}
