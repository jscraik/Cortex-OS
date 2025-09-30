import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

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

    // Build and return final response via helper
    return await this.buildResponse(results, query, startTime, namespace);
  }

  private applyFilters(query: HybridQuery, memories: Memory[]): Memory[] {
    let filtered = memories;
    const metadataFilters = query.filters?.metadata;
    if (metadataFilters) {
      filtered = filtered.filter((memory) => {
        for (const [key, value] of Object.entries(metadataFilters)) {
          if (memory.metadata?.[key] !== value) return false;
        }
        return true;
      });
    }

    const dr = query.filters?.dateRange;
    if (dr) {
      const start = new Date(dr.start);
      const end = new Date(dr.end);
      filtered = filtered.filter((m) => {
        const createdAt = new Date(m.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    return filtered;
  }

  private computeTextHybrid(query: HybridQuery, memories: Memory[]): HybridSearchResult[] {
    if (!query.text) return [];
    const searchText = String(query.text).toLowerCase();
    const textResults = memories.filter((m) => !!m.text && m.text.toLowerCase().includes(searchText));
    return textResults.map((m, idx) => ({
      ...m,
      score: textResults.length > 0 ? (textResults.length - idx) / textResults.length : 0,
      textScore: textResults.length > 0 ? (textResults.length - idx) / textResults.length : 0,
    }));
  }

  private computeVectorHybrid(query: HybridQuery, memories: Memory[]): HybridSearchResult[] {
    if (!query.vector || (Array.isArray(query.vector) && query.vector.length === 0)) return [];
    const qv = query.vector ?? [];
    const vectorResults = memories
      .map((m) => {
        if (!m.vector) return { ...m, score: 0 } as HybridSearchResult;
        const dotProduct = m.vector.reduce((sum, val, i) => sum + val * (qv[i] ?? 0), 0);
        const magnitudeA = Math.sqrt(m.vector.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(qv.reduce((sum, val) => sum + val * val, 0));
        const similarity = magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
        return { ...m, score: similarity } as HybridSearchResult;
      })
      .filter((r) => r.score > 0.01);
    return vectorResults.map((r) => ({ ...r, vectorScore: r.score }));
  }

  private async performHybridSearch(
    query: HybridQuery,
    namespace: string,
  ): Promise<HybridSearchResult[]> {
    const textWeight = query.textWeight || this.config.defaultTextWeight || 0.5;
    const vectorWeight = query.vectorWeight || this.config.defaultVectorWeight || 0.5;
    const fusionStrategy = query.fusionStrategy || this.config.defaultFusionStrategy || 'weighted';

    const allMemories = await this.store.list(namespace);

    // Apply filters via helper
    const filteredMemories = this.applyFilters(query, allMemories);

    // Compute hybrids via helpers
    const textHybrid = this.computeTextHybrid(query, filteredMemories);
    const vectorHybrid = this.computeVectorHybrid(query, filteredMemories);

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

  private async performTextSearch(
    query: HybridQuery,
    namespace: string,
  ): Promise<HybridSearchResult[]> {
    // Get all memories in namespace for filtering
    const allMemories = await this.store.list(namespace);

    // Apply filters first
    let filteredMemories = allMemories;
    const metadataFilters2 = query.filters?.metadata;
    if (metadataFilters2) {
      filteredMemories = allMemories.filter((memory) => {
        for (const [key, value] of Object.entries(metadataFilters2)) {
          if (memory.metadata?.[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    const dr = query.filters?.dateRange;
    if (dr) {
      const start = new Date(dr.start);
      const end = new Date(dr.end);
      filteredMemories = filteredMemories.filter((memory) => {
        const createdAt = new Date(memory.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    // Perform text search on filtered memories only
    const searchText = String(query.text ?? '').toLowerCase();
    const textResults = filteredMemories.filter(
      (memory) => !!memory.text && memory.text.toLowerCase().includes(searchText),
    );

    return textResults.map((memory, index) => ({
      ...memory,
      score: (textResults.length - index) / textResults.length, // Higher score for better rank
      textScore: (textResults.length - index) / textResults.length,
    }));
  }

  private async performVectorSearch(
    query: HybridQuery,
    namespace: string,
  ): Promise<HybridSearchResult[]> {
    // Get all memories in namespace for filtering
    const allMemories = await this.store.list(namespace);

    // Apply filters first
    let filteredMemories = allMemories;
    const metadataFilters2 = query.filters?.metadata;
    if (metadataFilters2) {
      filteredMemories = allMemories.filter((memory) => {
        for (const [key, value] of Object.entries(metadataFilters2)) {
          if (memory.metadata?.[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    const dr2 = query.filters?.dateRange;
    if (dr2) {
      const start = new Date(dr2.start);
      const end = new Date(dr2.end);
      filteredMemories = filteredMemories.filter((memory) => {
        const createdAt = new Date(memory.createdAt);
        return createdAt >= start && createdAt <= end;
      });
    }

    // Perform vector search on filtered memories only
    const vectorResults = filteredMemories
      .map((memory) => {
        if (!memory.vector) {
          return { ...memory, score: 0 };
        }

        // Calculate cosine similarity
        const qv = query.vector ?? [];
        const dotProduct = memory.vector.reduce((sum, val, i) => sum + val * (qv[i] ?? 0), 0);
        const magnitudeA = Math.sqrt(memory.vector.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(qv.reduce((sum, val) => sum + val * val, 0));
        const similarity = magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;

        return { ...memory, score: similarity };
      })
      .filter((result) => result.score > 0.01); // Lower threshold to include more results

    return vectorResults;
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
    for (const [key, value] of this.queryCache) {
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
    // Combine results by taking the maximum score from text or vector results
    const maxScores = new Map<string, HybridSearchResult>();

    for (const result of textResults) {
      maxScores.set(result.id, { ...result });
    }

    for (const result of vectorResults) {
      const existing = maxScores.get(result.id);
      if (existing) {
        maxScores.set(result.id, {
          ...result,
          score: Math.max(existing.score, result.score),
        });
      } else {
        maxScores.set(result.id, { ...result });
      }
    }

    return Array.from(maxScores.values());
  }

  private weightedScoreFusion(
    textResults: HybridSearchResult[],
    vectorResults: HybridSearchResult[],
    textWeight: number,
    vectorWeight: number,
  ): HybridSearchResult[] {
    // Combine results using a weighted sum of scores
    const combinedScores = new Map<string, HybridSearchResult>();

    for (const result of textResults) {
      combinedScores.set(result.id, { ...result });
    }

    for (const result of vectorResults) {
      const existing = combinedScores.get(result.id);
      if (existing) {
        combinedScores.set(result.id, {
          ...result,
          score: (existing.score * textWeight + result.score * vectorWeight) / (textWeight + vectorWeight),
        });
      } else {
        combinedScores.set(result.id, { ...result });
      }
    }

    return Array.from(combinedScores.values());
  }

  private invalidateCache(namespace: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.includes(`"namespace":"${namespace}"`)) {
        this.queryCache.delete(key);
      }
    }
  }
}
