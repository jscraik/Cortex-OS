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
import type { MemoryCoreConfig } from '../types.js';

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

interface PreparedSearchPlan {
  predicate: (record: MemoryRecord) => boolean;
  sql: string;
  params: string[];
  usesQuery: boolean;
}

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
  private readonly records = new Map<string, MemoryRecord>();
  private readonly maxRecords: number;
  private readonly maxLimit: number;
  private lastSearchPlan?: { sql: string; params: readonly string[] };

  constructor(options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig> = {}) {
    const config = options as LocalMemoryProviderOptions;
    this.maxRecords = config.maxRecords ?? config.maxLimit ?? 1_000;
    this.maxLimit = Math.max(1, config.maxLimit ?? 100);
  }

  async store(input: StoreMemoryInput): Promise<StoreMemoryResult> {
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
  }

  async search(input: SearchMemoryInput): Promise<SearchMemoryResult> {
    const start = Date.now();
    const plan = this.prepareSearchPlan(input);
    this.lastSearchPlan = { sql: plan.sql, params: plan.params };

    const limit = Math.max(1, Math.min(this.maxLimit, input.topK ?? 10));

    const hits = Array.from(this.records.values())
      .filter(plan.predicate)
      .map((record) => ({
        id: record.id,
        text: record.text,
        score: plan.usesQuery ? 1.0 : 0.5,
        source: 'local' as const,
      }))
      .slice(0, limit);

    const tookMs = Date.now() - start;
    return { hits, tookMs };
  }

  getLastSearchPlanForTesting(): { sql: string; params: readonly string[] } | undefined {
    return this.lastSearchPlan;
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

  private prepareSearchPlan(input: SearchMemoryInput): PreparedSearchPlan {
    const query = input.query.trim().toLowerCase();
    const tags = normaliseTags(input.filterTags);

    const conditions: string[] = [];
    const params: string[] = [];

    if (query.length > 0) {
      conditions.push('LOWER(text) CONTAINS ?');
      params.push(query);
    }

    if (tags.length > 0) {
      const placeholders = tags.map(() => '?').join(', ');
      // Use a generic SQL-like expression for tags filtering
      conditions.push(`tags CONTAINS ANY (${placeholders})`);
      params.push(...tags);
    }

    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const predicate = (record: MemoryRecord): boolean => {
      if (query.length > 0 && !record.text.toLowerCase().includes(query)) {
        return false;
      }
      if (tags.length > 0 && !tags.some((tag) => record.tags.includes(tag))) {
        return false;
      }
      return true;
    };

    return { predicate, sql, params, usesQuery: query.length > 0 };
  }
}
