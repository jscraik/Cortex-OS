import { createHash, randomUUID } from 'node:crypto';
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
import type { MemoryCoreConfig, MemoryMetadata, QdrantConfig } from '../types.js';

export interface LocalMemoryProviderOptions {
  /** Maximum number of records to retain in memory. */
  maxRecords?: number;
  maxLimit?: number;
}

interface TaskQueue {
  add<T>(task: () => Promise<T>): Promise<T>;
}

interface MemoryRecord {
  id: string;
  text: string;
  sanitizedText: string;
  tags: string[];
  meta?: MemoryMetadata;
  domain?: string;
  importance: number;
  createdAt: string;
}

type ExtendedStoreInput = StoreMemoryInput & {
  content?: string;
  importance?: number;
  domain?: string;
  metadata?: MemoryMetadata;
  tags?: string[];
};

type ExtendedSearchInput = SearchMemoryInput & {
  search_type?: 'semantic' | 'keyword' | 'hybrid';
  limit?: number;
  offset?: number;
  domain?: string;
  session_filter_mode?: string;
  score_threshold?: number;
  hybrid_weight?: number;
  tenant?: string;
  metadata?: MemoryMetadata;
  labels?: string[];
  tags?: string[];
};

class SimpleTaskQueue implements TaskQueue {
  private readonly concurrency: number;
  private active = 0;
  private readonly pending: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = Math.max(1, concurrency);
  }

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active += 1;
        Promise.resolve()
          .then(task)
          .then(
            (value) => {
              resolve(value);
              this.finish();
            },
            (error) => {
              reject(error);
              this.finish();
            },
          );
      };

      if (this.active < this.concurrency) {
        run();
      } else {
        this.pending.push(run);
      }
    });
  }

  private finish() {
    this.active = Math.max(0, this.active - 1);
    const next = this.pending.shift();
    if (next) {
      next();
    }
  }
}

function normaliseTags(tags?: string[]): string[] {
  if (!tags) return [];
  return tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);
}

/**
 * Lightweight in-memory implementation of the memory provider interface with
 * basic security hardening to satisfy integration tests.
 */
export class LocalMemoryProvider implements MemoryProvider {
  private readonly records = new Map<string, MemoryRecord>();
  private readonly maxRecords: number;
  private readonly maxLimit: number;
  private readonly maxOffset: number;
  private readonly defaultLimit: number;
  private readonly defaultThreshold: number;
  private readonly defaultHybridWeight: number;
  private readonly embedDim: number;
  private readonly qdrantConfig?: QdrantConfig;

  public queue: TaskQueue;
  public qdrant?: {
    upsert: (
      collection: string,
      body: { points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> },
    ) => Promise<unknown>;
  };

  constructor(options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig> = {}) {
    const config = options as LocalMemoryProviderOptions & Partial<MemoryCoreConfig>;
    this.maxRecords = config.maxRecords ?? config.maxLimit ?? 1_000;
    this.maxLimit = config.maxLimit ?? 100;
    this.maxOffset = config.maxOffset ?? 1_000;
    this.defaultLimit = config.defaultLimit ?? Math.min(10, this.maxLimit);
    this.defaultThreshold = config.defaultThreshold ?? 0.5;
    this.defaultHybridWeight = config.hybridWeight ?? 0.5;
    this.embedDim = config.embedDim ?? 384;
    this.qdrantConfig = config.qdrant;
    this.queue = new SimpleTaskQueue(config.queueConcurrency ?? 1);
  }

  async store(input: ExtendedStoreInput): Promise<StoreMemoryResult> {
    const id = input.id ?? randomUUID();
    const createdAt = new Date().toISOString();
    const rawContent = (input.text ?? input.content ?? '').toString();
    const sanitizedContent = this.sanitizeContent(rawContent);
    const importance = typeof input.importance === 'number' ? input.importance : 0;
    const tags = normaliseTags(input.tags ?? input.filterTags ?? []);
    const metadata = this.normaliseMetadata(input.meta ?? input.metadata);

    const record: MemoryRecord = {
      id,
      text: rawContent,
      sanitizedText: sanitizedContent,
      tags,
      meta: metadata,
      domain: input.domain,
      importance,
      createdAt,
    };

    if (record.meta) {
      record.meta.contentSha = record.meta.contentSha ?? this.computeContentSha(rawContent);
    }

    if (this.records.size >= this.maxRecords) {
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

    await this.queue.add(async () => {
      if (!this.qdrantConfig || !this.qdrant?.upsert) {
        return;
      }

      const healthy = await this.isQdrantHealthy();
      if (!healthy) {
        return;
      }

      const vector = await this.generateEmbedding(record.sanitizedText, this.embedDim);
      const payload = this.buildQdrantPayload(record);
      await this.qdrant.upsert(this.qdrantConfig.collection, {
        points: [
          {
            id: record.id,
            vector,
            payload,
          },
        ],
      });
    });

    return { id, createdAt };
  }

  async search(input: ExtendedSearchInput): Promise<SearchMemoryResult> {
    const start = Date.now();
    const query = (input.query ?? '').trim().toLowerCase();
    const filterTags = normaliseTags(input.filterTags ?? input.tags);
    const limit = this.clampLimit(input.limit ?? input.topK ?? this.defaultLimit);
    const offset = this.clampOffset(input.offset ?? 0);
    const threshold = input.score_threshold ?? this.defaultThreshold;

    const metadata = this.normaliseMetadata(input.metadata);
    const hasTenant = Boolean(metadata?.tenant ?? input.tenant);
    const hasDomain = Boolean(input.domain);
    const hasLabels = Boolean(metadata?.labels?.length ?? input.labels?.length);
    const hasTags = filterTags.length > 0;

    if (!hasTenant && !hasDomain && !hasLabels && !hasTags) {
      throw new Error('Tenant, domain, tags, or labels are required for memory search.');
    }

    let hits: SearchMemoryResult['hits'];
    if (input.search_type === 'keyword') {
      hits = await this.searchWithFts({ ...input, filterTags }, limit, offset, threshold);
    } else {
      hits = this.searchLocally(query, filterTags, limit, offset);
    }

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

  protected async isQdrantHealthy(): Promise<boolean> {
    return true;
  }

  protected async generateEmbedding(text: string, dimension: number): Promise<number[]> {
    const dim = Math.max(1, Math.min(10_000, dimension));
    const embedding = new Array(dim).fill(0);
    const maxTextLength = 10_000;
    const length = Math.min(text.length, maxTextLength);

    for (let i = 0; i < length; i += 1) {
      const charCode = text.charCodeAt(i);
      embedding[i % dim] = (embedding[i % dim] + charCode) / 255;
    }

    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    if (norm === 0) {
      return embedding;
    }

    return embedding.map((value) => value / norm);
  }

  protected async searchWithFts(
    input: ExtendedSearchInput,
    limit: number,
    offset: number,
    scoreThreshold: number,
  ): Promise<SearchMemoryResult['hits']> {
    void input;
    void limit;
    void offset;
    void scoreThreshold;
    return [];
  }

  private clampLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit <= 0) {
      return this.defaultLimit;
    }
    return Math.min(Math.floor(limit), this.maxLimit);
  }

  private clampOffset(offset: number): number {
    if (!Number.isFinite(offset) || offset < 0) {
      return 0;
    }
    return Math.min(Math.floor(offset), this.maxOffset);
  }

  private searchLocally(query: string, tags: string[], limit: number, offset: number) {
    return Array.from(this.records.values())
      .filter((record) => {
        if (query.length > 0 && !record.text.toLowerCase().includes(query)) {
          return false;
        }
        if (tags.length > 0) {
          return tags.some((tag) => record.tags.includes(tag));
        }
        return true;
      })
      .slice(offset, offset + limit)
      .map((record) => ({
        id: record.id,
        text: record.text,
        score: query.length === 0 ? this.defaultHybridWeight : 1,
        source: 'local' as const,
      }));
  }

  private sanitizeContent(content: string): string {
    const patterns: RegExp[] = [
      /sk-[a-z0-9_-]+/gi,
      /api[_-]?key\s*[:=]\s*['\"]?[a-z0-9_-]+['\"]?/gi,
      /secret\s*[:=]\s*['\"]?[a-z0-9_-]+['\"]?/gi,
    ];

    return patterns.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), content);
  }

  private computeContentSha(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private normaliseMetadata(metadata?: Record<string, unknown>): MemoryMetadata | undefined {
    if (!metadata) {
      return undefined;
    }

    const labels = Array.isArray((metadata as MemoryMetadata).labels)
      ? ((metadata as MemoryMetadata).labels ?? []).map((label) => `${label}`.trim()).filter(Boolean)
      : undefined;

    return {
      ...(metadata as MemoryMetadata),
      labels,
    };
  }

  private buildQdrantPayload(record: MemoryRecord): Record<string, unknown> {
    return {
      id: record.id,
      domain: record.domain,
      tags: record.tags,
      labels: record.meta?.labels ?? [],
      tenant: record.meta?.tenant,
      sourceUri: record.meta?.sourceUri,
      contentSha: record.meta?.contentSha ?? this.computeContentSha(record.text),
      createdAt: Date.parse(record.createdAt),
      updatedAt: Date.now(),
      importance: record.importance,
    };
  }
}

