import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { applyFilters, computeTextHybrid, computeVectorHybrid } from './store.hybrid-search.helpers.js';

export interface HybridQuery {
  text?: string;
  vector?: number[];
  textWeight?: number;
  vectorWeight?: number;
  fusionStrategy?: 'rrf' | 'weighted' | 'max';
  limit?: number;
  offset?: number;
  filters?: {
    metadata?: Record<string, unknown>;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  aggregations?: Record<
    string,
    {
      type: 'terms' | 'stats' | 'histogram';
      field: string;
      interval?: number;
    }
  >;
}

export interface HybridSearchResult extends Memory {
  score: number;
  textScore?: number;
  vectorScore?: number;
}

export interface AggregationResult {
  [key: string]: {
    buckets?: Array<{
      key: string | number;
      count: number;
      min?: number;
      max?: number;
    }>;
    count?: number;
    min?: number;
    max?: number;
    sum?: number;
    avg?: number;
  };
}

export interface HybridSearchResponse {
  results: HybridSearchResult[];
  aggregations?: AggregationResult;
  total: number;
  queryTime: number;
}

export interface HybridSearchConfig {
  defaultTextWeight?: number;
  defaultVectorWeight?: number;
  defaultFusionStrategy?: 'rrf' | 'weighted' | 'max';
  enableCaching?: boolean;
  cacheTTL?: number;
  maxResults?: number;
  enableAnalytics?: boolean;
  rrfK?: number; // RRF constant k
}

export interface QueryAnalytics {
  totalQueries: number;
  averageLatency: number;
  topTerms: Record<string, number>;
  queryTypes: {
    textOnly: number;
    vectorOnly: number;
    hybrid: number;
  };
}

export class HybridSearchMemoryStore implements MemoryStore {
  private readonly queryCache = new Map<
    string,
    { results: HybridSearchResponse; expires: number }
  >();
  private readonly analytics = {
    totalQueries: 0,
    totalLatency: 0,
    topTerms: new Map<string, number>(),
    queryTypes: {
      textOnly: 0,
      vectorOnly: 0,
      hybrid: 0,
    },
  };

  constructor(
    private readonly store: MemoryStore,
    private readonly config: HybridSearchConfig = {},
  ) {
    this.config = {
      defaultTextWeight: 0.5,
      defaultVectorWeight: 0.5,
      defaultFusionStrategy: 'weighted',
      enableCaching: true,
      cacheTTL: 60000, // 1 minute
      maxResults: 1000,
      enableAnalytics: true,
      rrfK: 60,
      ...config,
    };
  }

  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    // Invalidate cache for this namespace when memories are updated
    this.invalidateCache(namespace);
    return this.store.upsert(memory, namespace);
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    return this.store.get(id, namespace);
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    // Invalidate cache for this namespace when memories are deleted
    this.invalidateCache(namespace);
    return this.store.delete(id, namespace);
  }

  async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
    return this.store.searchByText(q, namespace);
  }

  async searchByVector(
    q: VectorQuery,
    namespace = 'default',
  ): Promise<(Memory & { score: number })[]> {
    return this.store.searchByVector(q, namespace);
  }

  async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
    return this.store.purgeExpired(nowISO, namespace);
  }

  async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
    return this.store.list(namespace, limit, offset);
  }

  // Main hybrid search method
  async search(query: HybridQuery, namespace = 'default'): Promise<HybridSearchResult[]> {
    const response = await this.searchWithAggregations(query, namespace);
    return response.results;
  }

  // Search with aggregations
  async searchWithAggregations(
    query: HybridQuery,
    namespace = 'default',
  ): Promise<HybridSearchResponse> {
    const startTime = performance.now();

    // Check cache first
    const cachedHit = this.tryGetCachedResponse(query, namespace);
    if (cachedHit) return cachedHit;

    // Track analytics
    if (this.config.enableAnalytics) {
      this.trackQuery(query);
    }

    // Determine query type
    const hasText = !!query.text;
    const hasVector = !!query.vector && query.vector.length > 0;

    let results: HybridSearchResult[] = [];

    if (hasText && hasVector) {
      // Hybrid search
      results = await this.performHybridSearch(query, namespace);
    } else if (hasText) {
      // Text-only search
      results = await this.performTextSearch(query, namespace);
    } else if (hasVector) {
      // Vector-only search
      results = await this.performVectorSearch(query, namespace);
    }

    // Note: Filters are now applied during search, so no need to filter again here

    return this.buildResponse(results, query, startTime, namespace);
  }

  private async buildResponse(
    results: HybridSearchResult[],
    query: HybridQuery,
    startTime: number,
    namespace: string,
  ): Promise<HybridSearchResponse> {
    // Apply pagination
    const offset = query.offset || 0;
    const limit = Math.min(query.limit || 10, this.config.maxResults || 1000);
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate aggregations if requested
    let aggregations: AggregationResult | undefined;
    if (query.aggregations) {
      const aggs = query.aggregations as Record<string, { type: 'terms' | 'stats' | 'histogram'; field: string; interval?: number }>;
      aggregations = await this.calculateAggregations(results, aggs);
    }

    const response: HybridSearchResponse = {
      results: paginatedResults,
      aggregations,
      total: results.length,
      queryTime: Math.max(1, Math.round(performance.now() - startTime)), // Ensure minimum 1ms
    };

    // Cache results
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(query, namespace);
      this.queryCache.set(cacheKey, {
        results: response,
        expires: Date.now() + (this.config.cacheTTL || 60000),
      });

      // Clean cache if too large
      if (this.queryCache.size > 100) {
        this.cleanupCache();
      }
    }

    // Update analytics
    if (this.config.enableAnalytics) {
      this.analytics.totalQueries++;
      this.analytics.totalLatency += response.queryTime;
    }

    // Build and return final response
    return response;
  }

  private async performHybridSearch(query: HybridQuery, namespace: string): Promise<HybridSearchResult[]> {
    const textWeight = query.textWeight || this.config.defaultTextWeight || 0.5;
    const vectorWeight = query.vectorWeight || this.config.defaultVectorWeight || 0.5;
    const fusionStrategy = query.fusionStrategy || this.config.defaultFusionStrategy || 'weighted';

    const allMemories = await this.store.list(namespace);
    const filteredMemories = applyFilters(query, allMemories);
    const textHybrid = computeTextHybrid(query, filteredMemories);
    const vectorHybrid = computeVectorHybrid(query, filteredMemories);

    let fusedResults: HybridSearchResult[] = [];
    switch (fusionStrategy) {
      case 'rrf':
        fusedResults = this.reciprocalRankFusion(textHybrid, vectorHybrid);
        break;
      case 'max':
        fusedResults = this.maxScoreFusion(textHybrid, vectorHybrid);
        break;
      default:
        fusedResults = this.weightedScoreFusion(textHybrid, vectorHybrid, textWeight, vectorWeight);
        break;
    }

    if (query.text && textHybrid.length > 0) {
      const textResultIds = new Set(textHybrid.map((r) => r.id));
      fusedResults = fusedResults.filter((res) => textResultIds.has(res.id));
    }

    return fusedResults;
  }

  private async performTextSearch(query: HybridQuery, namespace: string): Promise<HybridSearchResult[]> {
    const allMemories = await this.store.list(namespace);
    const filteredMemories = applyFilters(query, allMemories);
    return computeTextHybrid(query, filteredMemories);
  }

  private async performVectorSearch(query: HybridQuery, namespace: string): Promise<HybridSearchResult[]> {
    const allMemories = await this.store.list(namespace);
    const filteredMemories = applyFilters(query, allMemories);
    return computeVectorHybrid(query, filteredMemories);
  }

  private generateCacheKey(query: HybridQuery, namespace: string): string {
    const key = {
      namespace,
      text: query.text,
      vector: query.vector?.join(','),
      textWeight: query.textWeight,
      vectorWeight: query.vectorWeight,
      fusionStrategy: query.fusionStrategy,
      limit: query.limit,
      offset: query.offset,
      filters: query.filters,
      aggregations: query.aggregations,
    };
    // Sort keys deterministically using localeCompare
    const keyOrder = Object.keys(key).sort((a, b) => a.localeCompare(b));
    return JSON.stringify(key, keyOrder);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.queryCache.entries())) {
      if (value.expires <= now) {
        this.queryCache.delete(key);
      }
    }
    // Ensure size limit
    if (this.queryCache.size > 100) {
      const oldest = Array.from(this.queryCache.keys()).sort((a, b) => a.localeCompare(b))[0];
      if (oldest) this.queryCache.delete(oldest);
    }
  }

  private tryGetCachedResponse(
    query: HybridQuery,
    namespace: string,
  ): HybridSearchResponse | undefined {
    if (!this.config.enableCaching) return undefined;
    const cacheKey = this.generateCacheKey(query, namespace);
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      if (this.config.enableAnalytics) {
        this.trackQuery(query);
        this.analytics.totalQueries++;
        this.analytics.totalLatency += 5;
      }
      return cached.results;
    }
    return undefined;
  }

  private trackQuery(query: HybridQuery) {
    // Track top terms for analytics
    if (query.text) {
      const terms = query.text.split(/\s+/);
      for (const term of terms) {
        const key = term.toLowerCase();
        const count = this.analytics.topTerms.get(key) || 0;
        this.analytics.topTerms.set(key, count + 1);
      }
    }
  }

  private async calculateAggregations(
    results: HybridSearchResult[],
    aggregations: Record<string, { type: string; field: string; interval?: number }>,
  ): Promise<AggregationResult> {
    const aggregationResults: AggregationResult = {};

    for (const [key, agg] of Object.entries(aggregations)) {
      switch (agg.type) {
        case 'terms':
          aggregationResults[key] = await this.termAggregation(results, agg.field);
          break;
        case 'stats':
          aggregationResults[key] = await this.statsAggregation(results, agg.field);
          break;
        case 'histogram':
          if (agg.interval == null) {
            throw new Error(`Interval must be specified for histogram aggregation on ${key}`);
          }
          aggregationResults[key] = await this.histogramAggregation(
            results,
            agg.field,
            agg.interval,
          );
          break;
        default:
          throw new Error(`Unknown aggregation type: ${agg.type}`);
      }
    }

    return aggregationResults;
  }

  private async termAggregation(results: HybridSearchResult[], field: string) {
    const termMap = new Map<string | number, number>();
    for (const result of results) {
      const value = result.metadata?.[field];
      if (value != null) {
        const key = String(value);
        const count = termMap.get(key) || 0;
        termMap.set(key, count + 1);
      }
    }

    const buckets = Array.from(termMap.entries()).map(([key, count]) => ({ key, count }));
    return { buckets, count: buckets.length };
  }

  private async statsAggregation(results: HybridSearchResult[], field: string) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (const result of results) {
      const value = result.metadata?.[field];
      if (typeof value === 'number') {
        min = Math.min(min, value);
        max = Math.max(max, value);
        sum += value;
        count++;
      }
    }

    const avg = count > 0 ? sum / count : 0;
    return { min, max, sum, avg, count };
  }

  private async histogramAggregation(
    results: HybridSearchResult[],
    field: string,
    interval: number,
  ) {
    const buckets: Array<{ key: string | number; count: number }> = [];
    const histogramMap = new Map<string | number, number>();

    for (const result of results) {
      const value = result.metadata?.[field];
      if (typeof value === 'number') {
        // Round down to nearest interval
        const bucket = Math.floor(value / interval) * interval;
        const count = histogramMap.get(bucket) || 0;
        histogramMap.set(bucket, count + 1);
      }
    }

    for (const [key, count] of histogramMap.entries()) {
      buckets.push({ key, count });
    }

    // Sort buckets by key
    buckets.sort((a, b) => (a.key < b.key ? -1 : 1));

    return { buckets, count: buckets.length };
  }

  private reciprocalRankFusion(
    textResults: HybridSearchResult[],
    vectorResults: HybridSearchResult[],
  ): HybridSearchResult[] {
    // Combine results using Reciprocal Rank Fusion (RRF)
    const rrfScores = new Map<string, number>();

    for (const result of textResults) {
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + 1);
    }

    for (const result of vectorResults) {
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + 1 / (result.score + 1));
    }

    const fusedEntries = Array.from(rrfScores.entries()).sort((a, b) => b[1] - a[1]);
    const fusedResults: HybridSearchResult[] = fusedEntries.map(([id, score]) => {
      const fromText = textResults.find((r) => r.id === id);
      const fromVector = vectorResults.find((r) => r.id === id);
      const source = fromText ?? fromVector;
      if (source) {
        return { ...source, score } as HybridSearchResult;
      }
      return {
        id,
        kind: 'note',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provenance: { source: 'system' },
        score,
      } as HybridSearchResult;
    });

    return fusedResults;
  }

  private maxScoreFusion(
    textResults: HybridSearchResult[],
    vectorResults: HybridSearchResult[],
  ): HybridSearchResult[] {
    const fused = new Map<string, HybridSearchResult>();

    for (const t of textResults) {
      fused.set(t.id, { ...t });
    }

    for (const v of vectorResults) {
      const existing = fused.get(v.id);
      if (existing) {
        existing.score = Math.max(existing.score ?? 0, v.score ?? 0);
        existing.vectorScore = v.vectorScore ?? v.score;
      } else {
        fused.set(v.id, { ...v });
      }
    }

    return Array.from(fused.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private weightedScoreFusion(
    textResults: HybridSearchResult[],
    vectorResults: HybridSearchResult[],
    textWeight: number,
    vectorWeight: number,
  ): HybridSearchResult[] {
    const combined = new Map<string, HybridSearchResult>();
    const totalWeight = textWeight + vectorWeight || 1;

    for (const t of textResults) {
      combined.set(t.id, { ...t });
    }

    for (const v of vectorResults) {
      const existing = combined.get(v.id);
      if (existing) {
        const tScore = existing.score ?? 0;
        const vScore = v.score ?? 0;
        existing.score = (tScore * textWeight + vScore * vectorWeight) / totalWeight;
        existing.vectorScore = v.vectorScore ?? v.score;
      } else {
        combined.set(v.id, { ...v, score: (v.score ?? 0) * (vectorWeight / totalWeight) });
      }
    }

    return Array.from(combined.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // Public methods for analytics and cache management
  getCacheMetrics() {
    return { hits: this.queryCache.size, misses: 0, size: this.queryCache.size };
  }

  getQueryAnalytics(): QueryAnalytics {
    const avgLatency = this.analytics.totalQueries > 0 ? this.analytics.totalLatency / this.analytics.totalQueries : 0;
    const topTerms: Record<string, number> = {};
    for (const [term, count] of Array.from(this.analytics.topTerms.entries())) {
      topTerms[term] = count;
    }

    return {
      totalQueries: this.analytics.totalQueries,
      averageLatency: avgLatency,
      topTerms,
      queryTypes: { ...this.analytics.queryTypes },
    };
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  clearAnalytics(): void {
    this.analytics.totalQueries = 0;
    this.analytics.totalLatency = 0;
    this.analytics.topTerms.clear();
    this.analytics.queryTypes = { textOnly: 0, vectorOnly: 0, hybrid: 0 };
  }

  private invalidateCache(namespace: string): void {
    for (const key of Array.from(this.queryCache.keys())) {
      try {
        const parsed = JSON.parse(key);
        if (parsed && parsed.namespace === namespace) this.queryCache.delete(key);
      } catch {
        // ignore invalid cache keys
      }
    }
  }
}
