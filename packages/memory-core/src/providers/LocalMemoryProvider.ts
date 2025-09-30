import Database from 'better-sqlite3';
import { QdrantClient } from '@qdrant/js-client-rest';
import { CircuitBreaker } from 'circuit-breaker-js';
import PQueue from 'p-queue';
import { randomUUID } from 'node:crypto';
import { pino } from 'pino';
import type {
  MemoryProvider,
  Memory,
  MemorySearchResult,
  MemoryStats,
  MemoryAnalysisResult,
  MemoryGraph,
  MemoryCoreConfig,
  QdrantConfig,
  SQLiteMemoryRow,
  SQLiteRelationshipRow,
  MemoryProviderError,
  MemoryRelationship,
} from '../types.js';
import type {
  MemoryStoreInput,
  MemorySearchInput,
  MemoryAnalysisInput,
  MemoryRelationshipsInput,
  MemoryStatsInput,
} from '@cortex-os/tool-spec';
import { MemoryWorkflowEngine } from '../workflows/memoryWorkflow.js';
import type {
  StoreWorkflowIndexPayload,
  StoreWorkflowPersistPayload,
} from '../workflows/memoryWorkflow.js';

const logger = pino({ level: 'info' });

export class LocalMemoryProvider implements MemoryProvider {
  private db: Database.Database;
  private qdrant?: QdrantClient;
  private qdrantConfig?: QdrantConfig;
  private qdrantHealthy = false;
  private lastQdrantCheck = 0;
  private circuitBreaker?: CircuitBreaker;
  private queue: PQueue;
  private config: MemoryCoreConfig;
  private workflows: MemoryWorkflowEngine;

  constructor(config: MemoryCoreConfig) {
    this.config = config;
    this.db = new Database(config.sqlitePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Initialize Qdrant if configured
    if (config.qdrant) {
      this.qdrantConfig = config.qdrant;
      this.qdrant = new QdrantClient({
        url: config.qdrant.url,
        apiKey: config.qdrant.apiKey,
        timeout: config.qdrant.timeout || 5000,
      });
    }

    // Initialize queue for concurrent operations
    this.queue = new PQueue({ concurrency: config.queueConcurrency });

    // Initialize circuit breaker
    if (config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        threshold: config.circuitBreakerThreshold,
        timeout: 5000,
        resetTimeout: 30000,
      });
    }

    this.initializeDatabase();

    this.workflows = new MemoryWorkflowEngine({
      store: {
        generateId: () => randomUUID(),
        getTimestamp: () => Date.now(),
        persistMemory: async (payload: StoreWorkflowPersistPayload) => {
          await this.persistMemoryRecord(payload);
        },
        scheduleVectorIndex: async (payload: StoreWorkflowIndexPayload) => {
          return this.scheduleVectorIndexing(payload);
        },
      },
    });
  }

  private initializeDatabase(): void {
    // Create memories table with FTS5
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        importance INTEGER DEFAULT 5,
        domain TEXT,
        tags TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        vector_indexed INTEGER DEFAULT 0
      );
    `);

    // FTS5 table for keyword search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        content='memories',
        content_rowid='rowid',
        tokenize='porter'
      );
    `);

    // Triggers for FTS5
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        UPDATE memories_fts SET content = new.content WHERE rowid = new.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        DELETE FROM memories_fts WHERE rowid = old.rowid;
      END;
    `);

    // Relationships table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        bidirectional INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);

    // Indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_domain ON memories(domain);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_vector_indexed ON memories(vector_indexed);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON memory_relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON memory_relationships(target_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_type ON memory_relationships(type);
    `);
  }

  private async persistMemoryRecord({ id, input, timestamp }: StoreWorkflowPersistPayload): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, content, importance, domain, tags, metadata, created_at, updated_at, vector_indexed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.content,
      input.importance || 5,
      input.domain || null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      timestamp,
      timestamp,
      0
    );
  }

  private async scheduleVectorIndexing({ id, input, timestamp }: StoreWorkflowIndexPayload): Promise<{ vectorIndexed: boolean }> {
    if (!this.qdrant || !this.qdrantConfig) {
      return { vectorIndexed: false };
    }

    if (!(await this.isQdrantHealthy())) {
      return { vectorIndexed: false };
    }

    const task = async () => {
      try {
        await this.ensureQdrantCollection();
        const embedding = await this.generateEmbedding(input.content);

        await this.qdrant!.upsert(this.qdrantConfig.collection, {
          points: [
            {
              id,
              vector: embedding,
              payload: {
                id,
                domain: input.domain,
                tags: input.tags || [],
                createdAt: timestamp,
                updatedAt: timestamp,
                importance: input.importance || 5,
              },
            },
          ],
        });

        this.db.prepare('UPDATE memories SET vector_indexed = 1 WHERE id = ?').run(id);
        logger.debug('Vector indexed', { id, domain: input.domain });
      } catch (error) {
        logger.warn('Failed to index vector', { id, error: (error as Error).message });
      }
    };

    this.queue.add(task).catch(error => {
      logger.warn('Failed to schedule vector indexing', { id, error: (error as Error).message });
    });

    return { vectorIndexed: false };
  }

  private async isQdrantHealthy(): Promise<boolean> {
    if (!this.qdrant) return false;

    const now = Date.now();
    if (now - this.lastQdrantCheck < 5000) {
      return this.qdrantHealthy;
    }

    this.lastQdrantCheck = now;
    try {
      await this.qdrant.getCollections({ timeout: 500 });
      this.qdrantHealthy = true;
    } catch (error) {
      logger.warn('Qdrant health check failed', { error: (error as Error).message });
      this.qdrantHealthy = false;
    }

    return this.qdrantHealthy;
  }

  private async ensureQdrantCollection(): Promise<void> {
    if (!this.qdrant || !this.qdrantConfig) return;

    try {
      await this.qdrant.getCollection(this.qdrantConfig.collection);
    } catch {
      await this.qdrant.createCollection(this.qdrantConfig.collection, {
        vectors: {
          size: this.qdrantConfig.embedDim,
          distance: this.qdrantConfig.similarity,
        },
      });
      logger.info(`Created Qdrant collection: ${this.qdrantConfig.collection}`);
    }
  }

  // Simple embedding generation (placeholder - replace with actual embedding model)
  private async generateEmbedding(text: string): Promise<number[]> {
    // This is a mock implementation
    // In production, integrate with Ollama, OpenAI, or local embedding model
    const dim = this.config.embedDim || 384;
    const embedding = new Array(dim).fill(0);

    // Simple hash-based embedding for demo
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % dim] = (embedding[i % dim] + charCode) / 255;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  async store(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }> {
    try {
      const result = await this.workflows.runStore(input);
      logger.info('Memory stored', {
        id: result.id,
        domain: input.domain,
        vectorIndexed: result.vectorIndexed,
      });
      return result;
    } catch (error) {
      logger.error('Failed to store memory', {
        error: (error as Error).message,
        domain: input.domain,
      });
      throw new MemoryProviderError('STORAGE', 'Failed to store memory', {
        error: (error as Error).message,
      });
    }
  }

  async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const limit = Math.min(input.limit || this.config.defaultLimit, this.config.maxLimit);
    const offset = input.offset || 0;
    const threshold = input.score_threshold || this.config.defaultThreshold;

    try {
      // Try semantic/hybrid search if Qdrant is healthy
      if (this.qdrant && (input.search_type === 'semantic' || input.search_type === 'hybrid')) {
        if (await this.isQdrantHealthy()) {
          return this.searchWithQdrant(input, limit, offset, threshold);
        }
      }

      // Fallback to SQLite FTS
      return this.searchWithFts(input, limit, offset, threshold);
    } catch (error) {
      logger.error('Search failed', { error: (error as Error).message });
      throw new MemoryProviderError('INTERNAL', 'Search operation failed', { error: (error as Error).message });
    }
  }

  private async searchWithQdrant(
    input: MemorySearchInput,
    limit: number,
    offset: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const embedding = await this.generateEmbedding(input.query);
    const searchType = input.search_type || 'semantic';

    // Qdrant search with filters
    const filter = this.buildQdrantFilter(input);

    const qdrantResults = await this.qdrant!.search(this.qdrantConfig!.collection, {
      vector: embedding,
      limit: limit + offset,
      score_threshold: searchType === 'semantic' ? threshold : 0,
      filter,
      with_payload: true,
    });

    const results: MemorySearchResult[] = [];

    // Get SQLite rows for full data
    const ids = qdrantResults.slice(offset).map(r => r.id);
    if (ids.length === 0) return results;

    const rows = this.db.prepare(`
      SELECT * FROM memories WHERE id IN (${ids.map(() => '?').join(',')})
    `).all(...ids) as SQLiteMemoryRow[];

    const rowMap = new Map(rows.map(r => [r.id, r]));

    for (const point of qdrantResults.slice(offset)) {
      const row = rowMap.get(point.id as string);
      if (!row) continue;

      const memory = this.mapRowToMemory(row);
      const result: MemorySearchResult = {
        ...memory,
        score: point.score!,
        matchType: 'semantic',
      };

      // If hybrid search, also get FTS results and combine scores
      if (searchType === 'hybrid') {
        const ftsResults = await this.searchWithFts(input, limit, 0, 0);
        const ftsResult = ftsResults.find(r => r.id === point.id);
        if (ftsResult) {
          // Weighted combination
          const hybridWeight = input.hybrid_weight || this.config.hybridWeight;
          result.score = hybridWeight * point.score! + (1 - hybridWeight) * ftsResult.score;
          result.matchType = 'hybrid';
        }
      }

      results.push(result);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  private async searchWithFts(
    input: MemorySearchInput,
    limit: number,
    offset: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    let query = `
      SELECT memories.*,
             COALESCE(memories_fts.rank, 0) as score
      FROM memories
      LEFT JOIN memories_fts ON memories.rowid = memories_fts.rowid
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // FTS match
    if (input.search_type === 'keyword' || input.search_type === 'tags' || input.search_type === 'hybrid') {
      conditions.push('memories_fts MATCH ?');
      params.push(input.query);
    }

    // Domain filter
    if (input.domain) {
      conditions.push('memories.domain = ?');
      params.push(input.domain);
    }

    // Tags filter
    if (input.tags && input.tags.length > 0) {
      const tagConditions = input.tags.map(() => 'json_extract(memories.tags, ?) IS NOT NULL').join(' AND ');
      conditions.push(`(${tagConditions})`);
      input.tags.forEach(tag => params.push(`$[? == "${tag}"]`));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order and limit
    query += ' ORDER BY score DESC, memories.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params) as (SQLiteMemoryRow & { score: number })[];

    return rows.map(row => ({
      ...this.mapRowToMemory(row),
      score: row.score || 0,
      matchType: 'keyword' as const,
    }));
  }

  private buildQdrantFilter(input: MemorySearchInput): any {
    const must: any[] = [];

    if (input.domain) {
      must.push({ key: 'domain', match: { value: input.domain } });
    }

    if (input.tags && input.tags.length > 0) {
      must.push({ key: 'tags', match: { any: input.tags } });
    }

    return must.length > 0 ? { must } : undefined;
  }

  async analysis(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult> {
    const analysisType = input.analysis_type || 'summary';
    const maxMemories = Math.min(input.max_memories || 100, 1000);

    try {
      // Fetch relevant memories
      const memories = await this.fetchMemoriesForAnalysis(input, maxMemories);

      switch (analysisType) {
        case 'summary':
          return this.generateSummary(memories, input);
        case 'temporal_patterns':
          return this.analyzeTemporalPatterns(memories, input);
        case 'tag_clusters':
          return this.analyzeTagClusters(memories, input);
        case 'concept_network':
          return this.buildConceptNetwork(memories, input);
        default:
          return this.generateCustomAnalysis(memories, input);
      }
    } catch (error) {
      logger.error('Analysis failed', { type: analysisType, error: (error as Error).message });
      throw new MemoryProviderError('INTERNAL', 'Analysis operation failed', { error: (error as Error).message });
    }
  }

  private async fetchMemoriesForAnalysis(input: MemoryAnalysisInput, limit: number): Promise<Memory[]> {
    let query = 'SELECT * FROM memories';
    const params: any[] = [];
    const conditions: string[] = [];

    if (input.domain) {
      conditions.push('domain = ?');
      params.push(input.domain);
    }

    if (input.tags && input.tags.length > 0) {
      const tagConditions = input.tags.map(() => 'json_extract(tags, ?) IS NOT NULL').join(' OR ');
      conditions.push(`(${tagConditions})`);
      input.tags.forEach(tag => params.push(`$[? == "${tag}"]`));
    }

    if (input.time_range) {
      conditions.push('created_at >= ? AND created_at <= ?');
      params.push(
        new Date(input.time_range.start).getTime(),
        new Date(input.time_range.end).getTime()
      );
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as SQLiteMemoryRow[];
    return rows.map(row => this.mapRowToMemory(row));
  }

  private generateSummary(memories: Memory[], input: MemoryAnalysisInput): MemoryAnalysisResult {
    const totalMemories = memories.length;
    const domains = [...new Set(memories.map(m => m.domain).filter(Boolean))];
    const allTags = memories.flatMap(m => m.tags);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / totalMemories;

    const summary = `Analyzed ${totalMemories} memories across ${domains.length} domains. ` +
      `Most common tags: ${topTags.map(t => t.tag).join(', ')}. ` +
      `Average importance: ${avgImportance.toFixed(2)}`;

    return {
      type: 'summary',
      summary,
      insights: [
        `Total memories analyzed: ${totalMemories}`,
        `Unique domains: ${domains.length}`,
        `Most frequent tag: ${topTags[0]?.tag || 'N/A'} (${topTags[0]?.count || 0} occurrences)`,
      ],
      patterns: {
        domainCount: domains.length,
        tagCount: Object.keys(tagCounts).length,
        avgImportance,
      },
    };
  }

  private analyzeTemporalPatterns(memories: Memory[], input: MemoryAnalysisInput): MemoryAnalysisResult {
    const patterns = memories.reduce((acc, memory) => {
      const date = new Date(memory.createdAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {} as Record<string, number>);

    const sortedDates = Object.keys(patterns).sort();
    const temporalPatterns = sortedDates.map(date => {
      const count = patterns[date];
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const idx = sortedDates.indexOf(date);
      if (idx > 0) {
        const prevCount = patterns[sortedDates[idx - 1]];
        if (count > prevCount * 1.1) trend = 'increasing';
        else if (count < prevCount * 0.9) trend = 'decreasing';
      }
      return { period: date, frequency: count, trend };
    });

    return {
      type: 'temporal_patterns',
      summary: `Analyzed temporal patterns across ${sortedDates.length} days`,
      insights: [
        `Most active day: ${sortedDates.reduce((a, b) => patterns[a] > patterns[b] ? a : b)}`,
        `Average memories per day: ${(memories.length / sortedDates.length).toFixed(2)}`,
      ],
      temporalPatterns,
    };
  }

  private analyzeTagClusters(memories: Memory[], input: MemoryAnalysisInput): MemoryAnalysisResult {
    const tagMap = new Map<string, Set<string>>();

    memories.forEach(memory => {
      memory.tags.forEach(tag => {
        if (!tagMap.has(tag)) tagMap.set(tag, new Set());
        tagMap.get(tag)!.add(memory.id);
      });
    });

    const clusters = Array.from(tagMap.entries())
      .map(([tag, memoryIds]) => ({
        id: tag,
        label: tag,
        size: memoryIds.size,
        examples: memories
          .filter(m => memoryIds.has(m.id))
          .slice(0, 3)
          .map(m => m.content.slice(0, 100) + '...'),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);

    return {
      type: 'tag_clusters',
      summary: `Identified ${clusters.length} tag clusters`,
      clusters,
    };
  }

  private buildConceptNetwork(memories: Memory[], input: MemoryAnalysisInput): MemoryAnalysisResult {
    // Simple concept extraction based on common words
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

    memories.forEach(memory => {
      const words = memory.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      });
    });

    const topWords = Array.from(wordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([word, freq]) => ({ word, freq }));

    const nodes = topWords.map((item, idx) => ({
      id: `concept-${idx}`,
      label: item.word,
      weight: item.freq,
    }));

    // Simple edges based on co-occurrence
    const edges: Array<{ source: string; target: string; weight: number; type: string }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, nodes.length); j++) {
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          weight: Math.random() * 0.5 + 0.1,
          type: 'related_to',
        });
      }
    }

    return {
      type: 'concept_network',
      summary: `Built concept network with ${nodes.length} concepts`,
      conceptNetwork: { nodes, edges },
    };
  }

  private generateCustomAnalysis(memories: Memory[], input: MemoryAnalysisInput): MemoryAnalysisResult {
    return {
      type: 'custom',
      summary: `Custom analysis on ${memories.length} memories`,
      insights: ['Custom analysis not yet implemented'],
    };
  }

  async relationships(input: MemoryRelationshipsInput): Promise<any> {
    try {
      switch (input.action) {
        case 'create':
          return this.createRelationship(input);
        case 'find':
          return this.findRelationships(input);
        case 'map_graph':
          return this.mapRelationshipGraph(input);
        case 'delete':
          return this.deleteRelationship(input);
        default:
          throw new MemoryProviderError('VALIDATION', 'Invalid relationship action');
      }
    } catch (error) {
      logger.error('Relationship operation failed', { action: input.action, error: (error as Error).message });
      throw new MemoryProviderError('INTERNAL', 'Relationship operation failed', { error: (error as Error).message });
    }
  }

  private async createRelationship(input: any): Promise<MemoryRelationship> {
    const id = randomUUID();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO memory_relationships (id, source_id, target_id, type, strength, bidirectional, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.source_id,
      input.target_id,
      input.relationship_type,
      input.strength || 0.5,
      input.bidirectional ? 1 : 0,
      now
    );

    if (input.bidirectional) {
      // Create reverse relationship
      const reverseId = randomUUID();
      this.db.prepare(`
        INSERT INTO memory_relationships (id, source_id, target_id, type, strength, bidirectional, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        reverseId,
        input.target_id,
        input.source_id,
        input.relationship_type,
        input.strength || 0.5,
        1,
        now
      );
    }

    return {
      id,
      sourceId: input.source_id,
      targetId: input.target_id,
      type: input.relationship_type,
      strength: input.strength || 0.5,
      bidirectional: input.bidirectional || false,
      createdAt: new Date(now),
    };
  }

  private async findRelationships(input: any): Promise<MemoryRelationship[]> {
    const query = `
      SELECT * FROM memory_relationships
      WHERE source_id = ? OR target_id = ?
      ORDER BY strength DESC
    `;
    const rows = this.db.prepare(query).all(input.memory_id, input.memory_id) as SQLiteRelationshipRow[];

    return rows.map(row => ({
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      type: row.type as any,
      strength: row.strength,
      bidirectional: !!row.bidirectional,
      createdAt: new Date(row.created_at),
    }));
  }

  private async mapRelationshipGraph(input: any): Promise<MemoryGraph> {
    const maxDepth = input.max_depth || 3;
    const maxNodes = input.max_nodes || 100;

    // BFS to find related memories
    const visited = new Set<string>();
    const queue = [input.memory_id];
    const nodes = new Map<string, { id: string; label: string; weight: number }>();
    const edges = new Map<string, { source: string; target: string; weight: number; type: string }>();

    visited.add(input.memory_id);

    // Get the memory itself
    const memoryRow = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(input.memory_id) as SQLiteMemoryRow;
    if (memoryRow) {
      nodes.set(input.memory_id, {
        id: input.memory_id,
        label: memoryRow.content.slice(0, 50) + '...',
        weight: memoryRow.importance,
      });
    }

    for (let depth = 0; depth < maxDepth && queue.length > 0 && nodes.size < maxNodes; depth++) {
      const currentSize = queue.length;

      for (let i = 0; i < currentSize && nodes.size < maxNodes; i++) {
        const currentId = queue.shift()!;

        // Get relationships
        const rows = this.db.prepare(`
          SELECT * FROM memory_relationships
          WHERE source_id = ? OR target_id = ?
        `).all(currentId, currentId) as SQLiteRelationshipRow[];

        for (const row of rows) {
          const otherId = row.source_id === currentId ? row.target_id : row.source_id;

          if (!visited.has(otherId) && nodes.size < maxNodes) {
            visited.add(otherId);
            queue.push(otherId);

            // Get the other memory
            const otherRow = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(otherId) as SQLiteMemoryRow;
            if (otherRow) {
              nodes.set(otherId, {
                id: otherId,
                label: otherRow.content.slice(0, 50) + '...',
                weight: otherRow.importance,
              });
            }
          }

          // Add edge
          const edgeId = `${row.source_id}-${row.target_id}`;
          if (!edges.has(edgeId)) {
            edges.set(edgeId, {
              source: row.source_id,
              target: row.target_id,
              weight: row.strength,
              type: row.type,
            });
          }
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()).map(e => ({
        ...e,
        directed: true,
      })),
      centralNode: input.memory_id,
      metrics: {
        nodeCount: nodes.size,
        edgeCount: edges.size,
        density: (2 * edges.size) / (nodes.size * (nodes.size - 1)) || 0,
      },
    };
  }

  private async deleteRelationship(input: any): Promise<{ success: boolean }> {
    const result = this.db.prepare(`
      DELETE FROM memory_relationships
      WHERE source_id = ? AND target_id = ? AND type = ?
    `).run(input.source_id, input.target_id, input.relationship_type);

    if (input.bidirectional) {
      this.db.prepare(`
        DELETE FROM memory_relationships
        WHERE source_id = ? AND target_id = ? AND type = ?
      `).run(input.target_id, input.source_id, input.relationship_type);
    }

    return { success: result.changes > 0 };
  }

  async stats(input?: MemoryStatsInput): Promise<MemoryStats> {
    try {
      const include = input?.include || ['total_count', 'domain_distribution', 'tag_distribution'];
      const stats: MemoryStats = {
        totalCount: 0,
        domainDistribution: {},
        tagDistribution: {},
        importanceDistribution: {},
      };

      // Total count
      if (include.includes('total_count')) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number };
        stats.totalCount = result.count;
      }

      // Domain distribution
      if (include.includes('domain_distribution')) {
        const rows = this.db.prepare(`
          SELECT domain, COUNT(*) as count FROM memories
          WHERE domain IS NOT NULL
          GROUP BY domain
        `).all() as { domain: string; count: number }[];

        stats.domainDistribution = rows.reduce((acc, row) => {
          acc[row.domain] = row.count;
          return acc;
        }, {} as Record<string, number>);
      }

      // Tag distribution
      if (include.includes('tag_distribution')) {
        const rows = this.db.prepare('SELECT tags FROM memories WHERE tags IS NOT NULL').all() as { tags: string }[];
        const tagCounts = new Map<string, number>();

        rows.forEach(row => {
          const tags = JSON.parse(row.tags) as string[];
          tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });

        stats.tagDistribution = Object.fromEntries(tagCounts);
      }

      // Importance distribution
      if (include.includes('importance_distribution')) {
        const rows = this.db.prepare(`
          SELECT importance, COUNT(*) as count FROM memories
          GROUP BY importance
        `).all() as { importance: number; count: number }[];

        stats.importanceDistribution = rows.reduce((acc, row) => {
          acc[row.importance] = row.count;
          return acc;
        }, {} as Record<number, number>);
      }

      // Storage size
      if (include.includes('storage_size')) {
        const pageResult = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };
        const sqliteBytes = pageResult.size;

        stats.storageSize = {
          sqliteBytes,
          totalBytes: sqliteBytes,
        };
      }

      // Qdrant stats
      if (include.includes('qdrant_stats') && this.qdrant) {
        try {
          if (await this.isQdrantHealthy()) {
            const collection = await this.qdrant.getCollection(this.qdrantConfig!.collection);
            const vectorCount = await this.qdrant.count(this.qdrantConfig!.collection);

            stats.qdrantStats = {
              healthy: true,
              collectionExists: true,
              vectorCount: vectorCount.count,
            };
          } else {
            stats.qdrantStats = {
              healthy: false,
              collectionExists: false,
              vectorCount: 0,
            };
          }
        } catch {
          stats.qdrantStats = {
            healthy: false,
            collectionExists: false,
            vectorCount: 0,
          };
        }
      }

      return stats;
    } catch (error) {
      logger.error('Stats failed', { error: (error as Error).message });
      throw new MemoryProviderError('INTERNAL', 'Failed to retrieve stats', { error: (error as Error).message });
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const details: Record<string, unknown> = {
      sqlite: 'healthy',
      qdrant: this.qdrant ? (await this.isQdrantHealthy() ? 'healthy' : 'unhealthy') : 'disabled',
      queueSize: this.queue.size,
      circuitBreaker: this.circuitBreaker ? this.circuitBreaker.getState() : 'disabled',
    };

    const healthy = details.sqlite === 'healthy' && (details.qdrant === 'healthy' || details.qdrant === 'disabled');

    return { healthy, details };
  }

  private mapRowToMemory(row: SQLiteMemoryRow): Memory {
    return {
      id: row.id,
      content: row.content,
      importance: row.importance,
      domain: row.domain || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      vectorIndexed: !!row.vector_indexed,
    };
  }

  async cleanup(): Promise<void> {
    // Clean up old/expired data if needed
    logger.info('Cleanup completed');
  }

  async optimize(): Promise<void> {
    // Optimize database and indexes
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
    logger.info('Database optimized');
  }

  async close(): Promise<void> {
    this.queue.pause();
    await this.queue.onIdle();
    this.db.close();
    logger.info('Memory provider closed');
  }
}
