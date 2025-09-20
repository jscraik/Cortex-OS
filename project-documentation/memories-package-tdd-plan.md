# Enhanced Memories Package TDD Plan v2.0

## Executive Summary

This document outlines a comprehensive Test-Driven Development (TDD) approach for enhancing the `@cortex-os/memories` package. The plan leverages existing project features to transform the memories package from a basic storage system into an enterprise-grade, integrated memory management platform with advanced data management, intelligence, and operational capabilities.

**Version 2.0 Changes**: Added 20+ critical missing features including data migration, backup/recovery, conflict resolution, memory relationships, deduplication, fine-grained access control, real-time streaming, and advanced analytics.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Enhancement Opportunities](#enhancement-opportunities)
3. [Critical Infrastructure Additions](#critical-infrastructure-additions)
4. [Data Management Features](#data-management-features)
5. [Advanced Capabilities](#advanced-capabilities)
6. [Local Memory Components](#local-memory-components)
7. [TDD Implementation Checklist](#tdd-implementation-checklist)
8. [Test Plans](#test-plans)
9. [Implementation Priority](#implementation-priority)
10. [Success Criteria](#success-criteria)

---

## Current State Analysis

### Package Architecture ✅

- Clean layered design with port/adapter pattern
- Multiple storage backends: SQLite, Prisma, Local Memory, in-memory
- Well-defined interfaces and contracts
- Zod schema validation

### Current Features ✅

- **Storage**: Basic CRUD operations with TTL support
- **Search**: Vector and text-based search
- **Security**: PII redaction, namespace isolation
- **Performance**: Decay algorithm, second-stage reranking
- **Testing**: 34 test suites with good coverage
- **MCP Integration**: Full tool suite implementation

### Identified Gaps ❌

- A2A events defined but not actively used
- Basic observability (minimal metrics)
- No plugin system for extensibility
- Limited query capabilities (no hybrid search)
- No batch operations
- No workflow integration
- Basic security (PII only)
- **No data migration or schema versioning**
- **No backup/recovery strategy**
- **No conflict resolution**
- **No memory relationships/graph**
- **No deduplication**
- **No fine-grained access control**
- **No real-time streaming**
- **No advanced analytics**

---

## Enhancement Opportunities

### 1. A2A Event System Integration 🔥 High Priority

**Goal**: Enable cross-package communication through events

**Implementation**:

```typescript
// Event-aware memory store decorator
class EventAwareMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private bus: EventBus
  ) {}

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const result = await this.store.upsert(memory, namespace);

    // Publish events for cross-package communication
    await this.bus.publish(createMemoryEvent.created({
      memoryId: memory.id,
      kind: memory.kind,
      text: memory.text || '',
      tags: memory.tags,
      namespace,
      createdAt: memory.createdAt
    }));

    return result;
  }
}
```

**Events to Publish**:

- `memory.created` - New memory stored
- `memory.retrieved` - Memory accessed with similarity score
- `memory.updated` - Memory modified
- `memory.deleted` - Memory removed
- `memory.purged` - TTL-based cleanup
- `memory.linked` - Memory relationship created
- `memory.deduplicated` - Duplicate detected and merged

### 2. Observability Integration 🔥 High Priority

**Goal**: Comprehensive monitoring and metrics

**Integration Points**:

```typescript
// Enhanced with @cortex-os/observability
import { createMetricsCollector, createLogger, createTracer } from '@cortex-os/observability';

class ObservedMemoryStore implements MemoryStore {
  private metrics = createMetricsCollector('memories');
  private logger = createLogger('memories');
  private tracer = createTracer('memories');

  async searchByVector(query: VectorQuery, namespace?: string): Promise<Memory[]> {
    return this.tracer.startActiveSpan('searchByVector', async (span) => {
      const startTime = Date.now();

      try {
        const results = await this.store.searchByVector(query, namespace);

        // Record metrics
        this.metrics.increment('search.vector.requests');
        this.metrics.histogram('search.vector.latency', Date.now() - startTime);
        this.metrics.histogram('search.vector.results', results.length);
        this.metrics.histogram('search.vector.similarity',
          results.map(r => r.score || 0));

        // Set span attributes
        span.setAttributes({
          'namespace': namespace || 'default',
          'top_k': query.topK,
          'results_count': results.length
        });

        return results;
      } catch (error) {
        this.metrics.increment('search.vector.errors');
        this.logger.error('Vector search failed', {
          error: error.message,
          namespace
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

### 3. RAG Integration 🔥 High Priority

**Goal**: Share embedding infrastructure and improve search

**Enhanced Embedding Interface**:

```typescript
export interface EnhancedEmbedder extends Embedder {
  // Reranking capabilities
  rerank(query: string, documents: string[], options?: RerankOptions): Promise<number[]>;

  // Batch processing
  embedBatch(texts: string[], options?: BatchOptions): Promise<number[][]>;

  // Caching
  withCache(cache: CacheManager): EnhancedEmbedder;

  // Model information
  getModelInfo(): ModelInfo;
}

// Integration with RAG's hierarchical store
export class HierarchicalMemoryStore implements MemoryStore {
  private store = new HierarchicalStore({
    chunkers: {
      semantic: new SemanticChunker(),
      hierarchical: new HierarchicalChunker()
    },
    embedder: enhancedEmbedder
  });
}
```

### 4. Plugin System 🔥 Medium Priority

**Goal**: Enable extensible functionality through plugins

**Plugin Architecture**:

```typescript
export interface MemoryPlugin {
  name: string;
  version: string;

  // Lifecycle hooks
  onBeforeStore?(memory: Memory, context: StoreContext): Promise<Memory>;
  onAfterStore?(memory: Memory, context: StoreContext): Promise<void>;
  onBeforeRetrieve?(query: Query, context: QueryContext): Promise<void>;
  onAfterRetrieve?(results: Memory[], context: QueryContext): Promise<Memory[]>;
  onBeforePurge?(criteria: PurgeCriteria): Promise<boolean>;
  onAfterPurge?(count: number, criteria: PurgeCriteria): Promise<void>;
}

export class PluginAwareMemoryStore implements MemoryStore {
  private plugins = new Map<string, MemoryPlugin>();

  register(plugin: MemoryPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    let processed = memory;
    const context: StoreContext = { namespace, timestamp: Date.now() };

    // Execute before hooks in order
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforeStore) {
        processed = await plugin.onBeforeStore(processed, context);
      }
    }

    const result = await this.store.upsert(processed, namespace);

    // Execute after hooks
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterStore) {
        await plugin.onAfterStore(result, context);
      }
    }

    return result;
  }
}
```

### 5. Advanced Security Integration 🔥 Medium Priority

**Goal**: Leverage ASBR security policies

**Enhanced Security**:

```typescript
import { OWASPLLMGuard, SecurityPolicy } from '@cortex-os/asbr';

class SecureMemoryStore implements MemoryStore {
  private guard = new OWASPLLMGuard({
    policies: [
      SecurityPolicy.PII_DETECTION,
      SecurityPolicy.INJECTION_DETECTION,
      SecurityPolicy.CONTENT_POLICY,
      SecurityPolicy.CREDENTIAL_DETECTION
    ]
  });

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    // Scan content before storage
    const scan = await this.guard.scan(memory.text || '');

    if (scan.violations.length > 0) {
      // Handle violations based on policy
      if (scan.blocked) {
        throw new SecurityError('Content blocked by security policy', scan.violations);
      }

      // Log violations for audit
      this.logger.warn('Security violations detected', {
        memoryId: memory.id,
        violations: scan.violations,
        namespace
      });
    }

    // Store redacted version
    const secured = {
      ...memory,
      text: scan.redacted,
      metadata: {
        ...memory.metadata,
        securityScan: {
          timestamp: new Date().toISOString(),
          violations: scan.violations.length,
          policies: scan.appliedPolicies
        }
      }
    };

    return this.store.upsert(secured, namespace);
  }
}
```

### 6. Enhanced Query Capabilities 🔥 Medium Priority

**Goal**: Support complex queries and aggregations

**Hybrid Search**:

```typescript
export interface HybridQuery {
  text: string;
  vector?: number[];
  weights: {
    semantic: number;    // Vector similarity (0-1)
    keyword: number;     // Text match (0-1)
    freshness: number;   // Recency boost (0-1)
  };
  filters: {
    tags?: string[];
    kinds?: Memory['kind'][];
    dateRange?: { start: string; end: string };
    namespace?: string;
  };
  limit: number;
}

export interface AggregationQuery {
  groupBy: ('kind' | 'namespace' | 'date')[];
  aggregations: {
    count?: boolean;
    avgSize?: boolean;
    totalSize?: boolean;
    byTag?: boolean;
  };
  timeRange?: {
    start: string;
    end: string;
  };
}

class EnhancedMemoryStore implements MemoryStore {
  async hybridSearch(query: HybridQuery, namespace?: string): Promise<ScoredMemory[]> {
    // Execute both searches in parallel
    const [vectorResults, textResults] = await Promise.all([
      query.vector ? this.searchByVector({
        vector: query.vector,
        topK: query.limit * 2
      }, namespace) : [],
      this.searchByText({
        text: query.text,
        topK: query.limit * 2,
        filterTags: query.filters.tags
      }, namespace)
    ]);

    // Combine and rerank results
    return this.rerankAndCombine(vectorResults, textResults, query.weights);
  }

  async aggregate(query: AggregationQuery): Promise<AggregationResult> {
    // Implementation for memory analytics
  }
}
```

### 7. Performance Optimizations 🔥 Medium Priority

**Connection Pooling**:

```typescript
export class PooledMemoryStore implements MemoryStore {
  private pool: ConnectionPool;

  constructor(private store: MemoryStore, poolSize = 10) {
    this.pool = new ConnectionPool(poolSize);
  }

  async batchUpsert(memories: Memory[], namespace?: string): Promise<Memory[]> {
    return this.pool.execute(async () => {
      return Promise.all(
        memories.map(m => this.store.upsert(m, namespace))
      );
    });
  }

  async *streamSearch(query: TextQuery, namespace?: string) {
    const batchSize = 100;
    let offset = 0;

    while (true) {
      const results = await this.store.searchByText({
        ...query,
        topK: batchSize
      }, namespace);

      if (results.length === 0) break;

      yield results;
      offset += batchSize;
    }
  }
}
```

### 8. Workflow Integration 🔥 Low Priority

**Goal**: Trigger workflows based on memory operations

```typescript
export class WorkflowAwareMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private workflowClient: WorkflowClient
  ) {}

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const result = await this.store.upsert(memory, namespace);

    // Analyze content for workflow triggers
    const triggers = this.analyzeTriggers(memory);

    for (const trigger of triggers) {
      await this.workflowClient.trigger(trigger.name, {
        memoryId: memory.id,
        namespace,
        data: trigger.data
      });
    }

    return result;
  }

  private analyzeTriggers(memory: Memory): WorkflowTrigger[] {
    const triggers: WorkflowTrigger[] = [];

    // Security findings trigger
    if (memory.tags.includes('security-finding')) {
      triggers.push({
        name: 'security-review',
        data: { severity: this.extractSeverity(memory.text || '') }
      });
    }

    // Performance alerts
    if (memory.tags.includes('performance-metric')) {
      const value = this.extractMetricValue(memory.text || '');
      if (value > 0.9) { // 90th percentile
        triggers.push({
          name: 'performance-alert',
          data: { metric: value }
        });
      }
    }

    return triggers;
  }
}
```

---

## Critical Infrastructure Additions

### 9. Data Migration & Schema Versioning 🔥 Critical

**Goal**: Enable safe schema evolution without data loss

**Implementation**:

```typescript
export interface MigrationManager {
  getCurrentVersion(): Promise<string>;
  getAvailableMigrations(): Migration[];
  migrate(targetVersion?: string): Promise<MigrationResult>;
  rollback(toVersion: string): Promise<RollbackResult>;
  validateSchema(memory: Memory): Promise<ValidationResult>;
}

export interface Migration {
  version: string;
  description: string;
  up: (store: MemoryStore) => Promise<void>;
  down: (store: MemoryStore) => Promise<void>;
  validate: () => Promise<boolean>;
}

export class VersionedMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private migrationManager: MigrationManager
  ) {}

  async initialize(): Promise<void> {
    const currentVersion = await this.migrationManager.getCurrentVersion();
    const latestVersion = this.getLatestVersion();
    
    if (currentVersion !== latestVersion) {
      await this.migrationManager.migrate(latestVersion);
    }
  }

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    // Validate against current schema
    const validation = await this.migrationManager.validateSchema(memory);
    if (!validation.valid) {
      throw new SchemaValidationError(validation.errors);
    }

    // Add version metadata
    const versionedMemory = {
      ...memory,
      metadata: {
        ...memory.metadata,
        schemaVersion: await this.migrationManager.getCurrentVersion()
      }
    };

    return this.store.upsert(versionedMemory, namespace);
  }
}
```

### 10. Backup, Recovery & Disaster Recovery 🔥 Critical

**Goal**: Ensure data durability and recoverability

**Implementation**:

```typescript
export interface BackupManager {
  // Backup operations
  createBackup(options?: BackupOptions): Promise<BackupMetadata>;
  scheduleBackup(schedule: CronExpression): Promise<ScheduleId>;
  listBackups(): Promise<BackupMetadata[]>;
  
  // Recovery operations
  restore(backupId: string, options?: RestoreOptions): Promise<RestoreResult>;
  verifyBackup(backupId: string): Promise<VerificationResult>;
  
  // Export/Import
  exportData(format: 'json' | 'csv' | 'parquet'): Promise<ExportResult>;
  importData(source: DataSource, options?: ImportOptions): Promise<ImportResult>;
}

export interface BackupOptions {
  type: 'full' | 'incremental' | 'differential';
  compression?: boolean;
  encryption?: EncryptionConfig;
  retentionDays?: number;
  destination?: StorageDestination;
}

export class BackupAwareMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private backupManager: BackupManager
  ) {
    // Schedule automatic backups
    this.backupManager.scheduleBackup('0 0 * * *'); // Daily at midnight
  }

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const result = await this.store.upsert(memory, namespace);
    
    // Track changes for incremental backups
    await this.backupManager.trackChange({
      operation: 'upsert',
      memoryId: memory.id,
      timestamp: new Date()
    });
    
    return result;
  }

  async emergencyRestore(pointInTime: Date): Promise<void> {
    const nearestBackup = await this.backupManager.findNearestBackup(pointInTime);
    await this.backupManager.restore(nearestBackup.id, {
      targetTime: pointInTime,
      validateIntegrity: true
    });
  }
}
```

### 11. Conflict Resolution & Concurrency Control 🔥 Critical

**Goal**: Handle concurrent updates safely

**Implementation**:

```typescript
export interface ConflictResolver {
  detectConflict(local: Memory, remote: Memory): boolean;
  resolveConflict(local: Memory, remote: Memory, strategy: ConflictStrategy): Promise<Memory>;
  mergeChanges(base: Memory, local: Memory, remote: Memory): Promise<Memory>;
}

export enum ConflictStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  MERGE = 'merge',
  MANUAL = 'manual',
  CUSTOM = 'custom'
}

export class OptimisticLockingStore implements MemoryStore {
  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const existing = await this.store.get(memory.id, namespace);
    
    if (existing && existing.version !== memory.version) {
      // Conflict detected
      const resolver = new ConflictResolver();
      
      if (resolver.detectConflict(memory, existing)) {
        const resolved = await resolver.resolveConflict(
          memory,
          existing,
          this.conflictStrategy
        );
        
        return this.store.upsert({
          ...resolved,
          version: existing.version + 1
        }, namespace);
      }
    }
    
    return this.store.upsert({
      ...memory,
      version: (memory.version || 0) + 1
    }, namespace);
  }
}
```

---

## Data Management Features

### 12. Memory Relationships & Graph Structures 🔥 High Priority

**Goal**: Enable connected memory networks

**Implementation**:

```typescript
export interface MemoryGraph {
  // Relationship management
  link(from: MemoryId, to: MemoryId, relation: RelationType): Promise<Edge>;
  unlink(from: MemoryId, to: MemoryId): Promise<void>;
  
  // Graph traversal
  getRelated(id: MemoryId, options?: TraversalOptions): Promise<MemoryNode[]>;
  findPath(from: MemoryId, to: MemoryId): Promise<MemoryPath[]>;
  getSubgraph(rootId: MemoryId, depth: number): Promise<Graph>;
  
  // Graph analytics
  calculateCentrality(id: MemoryId): Promise<number>;
  detectCommunities(): Promise<Community[]>;
  findClusters(similarity: number): Promise<Cluster[]>;
}

export interface TraversalOptions {
  depth?: number;
  relationTypes?: RelationType[];
  direction?: 'incoming' | 'outgoing' | 'both';
  filters?: MemoryFilter[];
}

export class GraphMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private graph: MemoryGraph
  ) {}

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const result = await this.store.upsert(memory, namespace);
    
    // Auto-link related memories based on similarity
    const similar = await this.store.searchByVector({
      vector: memory.embedding,
      topK: 5,
      threshold: 0.8
    }, namespace);
    
    for (const related of similar) {
      if (related.id !== memory.id) {
        await this.graph.link(memory.id, related.id, 'similar');
      }
    }
    
    return result;
  }

  async getContext(memoryId: string, depth = 2): Promise<MemoryContext> {
    const subgraph = await this.graph.getSubgraph(memoryId, depth);
    const memories = await this.store.getMultiple(subgraph.nodeIds);
    
    return {
      primary: memories.find(m => m.id === memoryId)!,
      related: memories.filter(m => m.id !== memoryId),
      graph: subgraph
    };
  }
}
```

### 13. Deduplication & Memory Merging 🔥 High Priority

**Goal**: Prevent duplicate memories and merge similar ones

**Implementation**:

```typescript
export interface DeduplicationService {
  findDuplicates(memory: Memory): Promise<DuplicateCandidate[]>;
  merge(memories: Memory[], strategy: MergeStrategy): Promise<Memory>;
  setSimilarityThreshold(threshold: number): void;
  getDeduplicationStats(): Promise<DeduplicationStats>;
}

export interface DuplicateCandidate {
  memory: Memory;
  similarity: number;
  matchType: 'exact' | 'fuzzy' | 'semantic';
}

export enum MergeStrategy {
  KEEP_NEWEST = 'keep_newest',
  KEEP_OLDEST = 'keep_oldest',
  MERGE_METADATA = 'merge_metadata',
  CREATE_COMPOSITE = 'create_composite'
}

export class DeduplicatingMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private deduplicator: DeduplicationService
  ) {}

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    // Check for duplicates
    const duplicates = await this.deduplicator.findDuplicates(memory);
    
    if (duplicates.length > 0) {
      const exactMatch = duplicates.find(d => d.matchType === 'exact');
      
      if (exactMatch) {
        // Update existing instead of creating duplicate
        return this.store.update(exactMatch.memory.id, memory, namespace);
      }
      
      // Handle fuzzy/semantic matches
      const shouldMerge = duplicates.some(d => d.similarity > 0.95);
      
      if (shouldMerge) {
        const merged = await this.deduplicator.merge(
          [memory, ...duplicates.map(d => d.memory)],
          MergeStrategy.CREATE_COMPOSITE
        );
        
        // Delete old memories and create merged one
        for (const dup of duplicates) {
          await this.store.delete(dup.memory.id, namespace);
        }
        
        return this.store.upsert(merged, namespace);
      }
    }
    
    return this.store.upsert(memory, namespace);
  }
}
```

### 14. Memory Templates & Structured Types 🔥 Medium Priority

**Goal**: Provide predefined schemas for common memory types

**Implementation**:

```typescript
export interface MemoryTemplate {
  type: 'meeting' | 'decision' | 'learning' | 'task' | 'event' | 'custom';
  schema: ZodSchema;
  extractors: FieldExtractor[];
  validators: Validator[];
  defaultValues?: Partial<Memory>;
}

export interface FieldExtractor {
  field: string;
  pattern?: RegExp;
  llmPrompt?: string;
  transform?: (value: any) => any;
}

export class TemplateMemoryStore implements MemoryStore {
  private templates = new Map<string, MemoryTemplate>();

  registerTemplate(template: MemoryTemplate): void {
    this.templates.set(template.type, template);
  }

  async createFromTemplate(
    type: string,
    content: string,
    overrides?: Partial<Memory>
  ): Promise<Memory> {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template ${type} not found`);
    }
    
    // Extract fields from content
    const extracted: Record<string, any> = {};
    for (const extractor of template.extractors) {
      extracted[extractor.field] = await this.extractField(content, extractor);
    }
    
    // Validate against schema
    const validated = template.schema.parse({
      ...template.defaultValues,
      ...extracted,
      ...overrides
    });
    
    return this.store.upsert(validated as Memory);
  }

  private async extractField(content: string, extractor: FieldExtractor): Promise<any> {
    if (extractor.pattern) {
      const match = content.match(extractor.pattern);
      return match ? extractor.transform?.(match[1]) || match[1] : null;
    }
    
    if (extractor.llmPrompt) {
      // Use LLM to extract field
      return this.llmExtract(content, extractor.llmPrompt);
    }
    
    return null;
  }
}

// Example templates
const meetingTemplate: MemoryTemplate = {
  type: 'meeting',
  schema: z.object({
    kind: z.literal('meeting'),
    title: z.string(),
    date: z.string().datetime(),
    attendees: z.array(z.string()),
    decisions: z.array(z.string()),
    actionItems: z.array(z.object({
      task: z.string(),
      assignee: z.string(),
      dueDate: z.string().optional()
    })),
    summary: z.string()
  }),
  extractors: [
    {
      field: 'date',
      pattern: /Date:\s*(.+)/i,
      transform: (v) => new Date(v).toISOString()
    },
    {
      field: 'attendees',
      llmPrompt: 'Extract all meeting attendees as a list of names'
    }
  ],
  validators: [],
  defaultValues: {
    kind: 'meeting',
    tags: ['meeting']
  }
};
```

---

## Advanced Capabilities

### 15. Fine-grained Access Control (RBAC/ABAC) 🔥 High Priority

**Goal**: Implement comprehensive permission system

**Implementation**:

```typescript
export interface AccessControl {
  // Permission management
  grant(principal: Principal, resource: Resource, permission: Permission): Promise<void>;
  revoke(principal: Principal, resource: Resource, permission: Permission): Promise<void>;
  check(principal: Principal, resource: Resource, action: Action): Promise<boolean>;
  
  // Role management
  createRole(role: Role): Promise<void>;
  assignRole(principal: Principal, role: Role): Promise<void>;
  getRoles(principal: Principal): Promise<Role[]>;
  
  // Policy management
  createPolicy(policy: Policy): Promise<void>;
  evaluatePolicy(context: PolicyContext): Promise<PolicyDecision>;
}

export interface Principal {
  type: 'user' | 'service' | 'role';
  id: string;
  attributes?: Record<string, any>;
}

export interface Policy {
  id: string;
  effect: 'allow' | 'deny';
  principals: Principal[];
  resources: Resource[];
  actions: Action[];
  conditions?: Condition[];
}

export class SecureMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private accessControl: AccessControl
  ) {}

  async upsert(memory: Memory, namespace?: string, context?: SecurityContext): Promise<Memory> {
    // Check write permission
    const canWrite = await this.accessControl.check(
      context?.principal || { type: 'user', id: 'anonymous' },
      { type: 'memory', id: memory.id, namespace },
      'write'
    );
    
    if (!canWrite) {
      throw new AccessDeniedError('Insufficient permissions to write memory');
    }
    
    // Set owner and permissions
    const securedMemory = {
      ...memory,
      metadata: {
        ...memory.metadata,
        owner: context?.principal.id,
        permissions: {
          read: ['owner', ...(memory.metadata?.permissions?.read || [])],
          write: ['owner'],
          delete: ['owner']
        }
      }
    };
    
    return this.store.upsert(securedMemory, namespace);
  }

  async get(id: string, namespace?: string, context?: SecurityContext): Promise<Memory | null> {
    const memory = await this.store.get(id, namespace);
    
    if (!memory) return null;
    
    // Check read permission
    const canRead = await this.accessControl.check(
      context?.principal || { type: 'user', id: 'anonymous' },
      { type: 'memory', id, namespace },
      'read'
    );
    
    if (!canRead) {
      throw new AccessDeniedError('Insufficient permissions to read memory');
    }
    
    return memory;
  }
}
```

### 16. Memory Lifecycle & Archival Policies 🔥 Medium Priority

**Goal**: Comprehensive data lifecycle management

**Implementation**:

```typescript
export interface LifecyclePolicy {
  name: string;
  stages: LifecycleStage[];
  transitions: TransitionRule[];
  retentionPolicies: RetentionPolicy[];
  compactionRules: CompactionRule[];
}

export interface LifecycleStage {
  name: 'hot' | 'warm' | 'cold' | 'archive' | 'delete';
  storage: StorageClass;
  indexing: IndexingLevel;
  compression?: CompressionType;
  replication?: number;
}

export interface TransitionRule {
  from: string;
  to: string;
  condition: TransitionCondition;
  action?: TransitionAction;
}

export class LifecycleMemoryStore implements MemoryStore {
  private policies = new Map<string, LifecyclePolicy>();

  async applyLifecycle(): Promise<void> {
    for (const [namespace, policy] of this.policies) {
      await this.processTransitions(namespace, policy);
      await this.enforceRetention(namespace, policy);
      await this.performCompaction(namespace, policy);
    }
  }

  private async processTransitions(namespace: string, policy: LifecyclePolicy): Promise<void> {
    for (const rule of policy.transitions) {
      const memories = await this.findMemoriesForTransition(namespace, rule);
      
      for (const memory of memories) {
        await this.transitionMemory(memory, rule);
      }
    }
  }

  private async transitionMemory(memory: Memory, rule: TransitionRule): Promise<void> {
    // Move to different storage tier
    if (rule.to === 'cold') {
      await this.moveToColdstorage(memory);
    } else if (rule.to === 'archive') {
      await this.archiveMemory(memory);
    } else if (rule.to === 'delete') {
      await this.store.delete(memory.id);
    }
    
    // Execute custom action
    if (rule.action) {
      await rule.action.execute(memory);
    }
  }
}
```

### 17. Change Data Capture (CDC) & Streaming 🔥 High Priority

**Goal**: Real-time change streaming and event sourcing

**Implementation**:

```typescript
export interface ChangeStream {
  // Subscription management
  subscribe(filter?: ChangeFilter): AsyncIterable<ChangeEvent>;
  unsubscribe(subscriptionId: string): Promise<void>;
  
  // Change log access
  getChangesSince(timestamp: Date, filter?: ChangeFilter): Promise<Change[]>;
  getChangeById(changeId: string): Promise<Change | null>;
  
  // Management
  compact(until: Date): Promise<CompactionResult>;
  getStreamPosition(): Promise<StreamPosition>;
  seekToPosition(position: StreamPosition): Promise<void>;
}

export interface ChangeEvent {
  id: string;
  timestamp: Date;
  operation: 'create' | 'update' | 'delete';
  before?: Memory;
  after?: Memory;
  metadata: {
    user?: string;
    source?: string;
    reason?: string;
  };
}

export class StreamingMemoryStore implements MemoryStore {
  private changeStream: ChangeStream;
  private subscribers = new Set<ChangeSubscriber>();

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    const before = await this.store.get(memory.id, namespace);
    const after = await this.store.upsert(memory, namespace);
    
    // Capture change
    const change: ChangeEvent = {
      id: generateId(),
      timestamp: new Date(),
      operation: before ? 'update' : 'create',
      before,
      after,
      metadata: {
        source: 'api',
        user: this.context?.user
      }
    };
    
    // Stream to subscribers
    await this.broadcastChange(change);
    
    return after;
  }

  async *watchChanges(filter?: ChangeFilter): AsyncIterable<ChangeEvent> {
    for await (const change of this.changeStream.subscribe(filter)) {
      yield change;
    }
  }

  private async broadcastChange(change: ChangeEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      try {
        await subscriber.onchange(change);
      } catch (error) {
        this.logger.error('Subscriber error', { error, subscriber });
      }
    }
  }
}
```

### 18. Rate Limiting & Quotas 🔥 High Priority

**Goal**: Protect API and enforce usage limits

**Implementation**:

```typescript
export interface RateLimiter {
  checkLimit(key: string, operation: Operation): Promise<RateLimitResult>;
  setQuota(namespace: string, limits: QuotaLimits): Promise<void>;
  getUsage(namespace: string): Promise<UsageStats>;
  reset(key: string): Promise<void>;
}

export interface QuotaLimits {
  requests: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
  storage: {
    maxMemories?: number;
    maxSizeBytes?: number;
  };
  operations: {
    maxSearches?: number;
    maxEmbeddings?: number;
  };
}

export class RateLimitedMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private rateLimiter: RateLimiter
  ) {}

  async searchByVector(query: VectorQuery, namespace?: string): Promise<Memory[]> {
    const limitKey = `${namespace}:search`;
    const result = await this.rateLimiter.checkLimit(limitKey, 'search');
    
    if (!result.allowed) {
      throw new RateLimitError({
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset
      });
    }
    
    return this.store.searchByVector(query, namespace);
  }

  async upsert(memory: Memory, namespace?: string): Promise<Memory> {
    // Check rate limit
    const rateLimitKey = `${namespace}:write`;
    const rateResult = await this.rateLimiter.checkLimit(rateLimitKey, 'write');
    
    if (!rateResult.allowed) {
      throw new RateLimitError(rateResult);
    }
    
    // Check storage quota
    const usage = await this.rateLimiter.getUsage(namespace || 'default');
    const quota = await this.getQuota(namespace);
    
    if (usage.storage.memories >= quota.storage.maxMemories) {
      throw new QuotaExceededError('Memory count limit exceeded');
    }
    
    return this.store.upsert(memory, namespace);
  }
}
```

### 19. Memory Summarization & Consolidation 🔥 Medium Priority

**Goal**: Automatic summarization and consolidation of related memories

**Implementation**:

```typescript
export interface MemorySummarizer {
  summarize(memories: Memory[], options?: SummarizeOptions): Promise<Summary>;
  consolidate(timeRange: TimeRange, namespace?: string): Promise<ConsolidatedMemory>;
  extractKeyPoints(memories: Memory[]): Promise<KeyPoint[]>;
  generateTimeline(memories: Memory[]): Promise<Timeline>;
}

export interface SummarizeOptions {
  style: 'brief' | 'detailed' | 'bullet_points';
  maxLength?: number;
  focusAreas?: string[];
  language?: string;
}

export class IntelligentMemoryStore implements MemoryStore {
  constructor(
    private store: MemoryStore,
    private summarizer: MemorySummarizer
  ) {}

  async consolidateMemories(
    filter: MemoryFilter,
    namespace?: string
  ): Promise<ConsolidatedMemory> {
    const memories = await this.store.search(filter, namespace);
    
    // Group related memories
    const groups = this.groupRelatedMemories(memories);
    
    // Summarize each group
    const summaries = await Promise.all(
      groups.map(group => this.summarizer.summarize(group, {
        style: 'detailed',
        maxLength: 500
      }))
    );
    
    // Create consolidated memory
    const consolidated: ConsolidatedMemory = {
      id: generateId(),
      kind: 'consolidated',
      originalIds: memories.map(m => m.id),
      summary: summaries.map(s => s.text).join('\n\n'),
      keyPoints: await this.summarizer.extractKeyPoints(memories),
      timeline: await this.summarizer.generateTimeline(memories),
      metadata: {
        consolidatedAt: new Date().toISOString(),
        memoryCount: memories.length,
        timeRange: {
          start: Math.min(...memories.map(m => m.createdAt)),
          end: Math.max(...memories.map(m => m.createdAt))
        }
      }
    };
    
    // Store consolidated memory
    await this.store.upsert(consolidated, namespace);
    
    // Optionally archive originals
    if (this.config.archiveAfterConsolidation) {
      await this.archiveMemories(memories, namespace);
    }
    
    return consolidated;
  }
}
```

### 20. Real-time WebSocket/SSE API 🔥 High Priority

**Goal**: Enable real-time subscriptions and updates

**Implementation**:

```typescript
export interface RealtimeAPI {
  // WebSocket management
  ws: WebSocketServer;
  sse: EventSource;
  
  // Subscription management
  subscribe(query: Query, callback: UpdateCallback): Subscription;
  unsubscribe(subscriptionId: string): void;
  
  // Broadcasting
  broadcast(event: MemoryEvent): void;
  broadcastToNamespace(namespace: string, event: MemoryEvent): void;
  
  // Connection management
  getConnections(): Connection[];
  closeConnection(connectionId: string): void;
}

export class RealtimeMemoryServer {
  private wss: WebSocketServer;
  private connections = new Map<string, WSConnection>();
  private subscriptions = new Map<string, Subscription>();

  constructor(private store: MemoryStore) {
    this.setupWebSocketServer();
    this.setupSSE();
  }

  private setupWebSocketServer(): void {
    this.wss = new WebSocketServer({ port: 3011 });
    
    this.wss.on('connection', (ws: WebSocket, req: Request) => {
      const connectionId = generateId();
      const connection = new WSConnection(connectionId, ws, req);
      
      this.connections.set(connectionId, connection);
      
      ws.on('message', async (data: string) => {
        const message = JSON.parse(data);
        await this.handleMessage(connectionId, message);
      });
      
      ws.on('close', () => {
        this.connections.delete(connectionId);
        this.cleanupSubscriptions(connectionId);
      });
    });
  }

  private async handleMessage(connectionId: string, message: WSMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(connectionId, message.data);
        break;
        
      case 'unsubscribe':
        await this.handleUnsubscribe(connectionId, message.data.subscriptionId);
        break;
        
      case 'query':
        await this.handleQuery(connectionId, message.data);
        break;
    }
  }

  private async handleSubscribe(connectionId: string, data: SubscribeData): Promise<void> {
    const subscription = {
      id: generateId(),
      connectionId,
      query: data.query,
      callback: (event: MemoryEvent) => {
        this.sendToConnection(connectionId, {
          type: 'event',
          subscriptionId: subscription.id,
          data: event
        });
      }
    };
    
    this.subscriptions.set(subscription.id, subscription);
    
    // Set up change stream subscription
    this.store.watchChanges(data.query).then(async (stream) => {
      for await (const change of stream) {
        if (this.subscriptions.has(subscription.id)) {
          subscription.callback(change);
        } else {
          break;
        }
      }
    });
    
    // Send confirmation
    this.sendToConnection(connectionId, {
      type: 'subscribed',
      subscriptionId: subscription.id
    });
  }
}
```

---

## Local Memory Components

### MCP Server Integration

The Local Memory MCP server provides a REST API for memory operations with the following features:

**REST API Endpoints**:

```bash
GET    /api/v1/health                   - Health check
GET    /api/v1/memories                 - List memories with pagination
POST   /api/v1/memories                 - Create new memory
GET    /api/v1/memories/:id            - Get specific memory
PUT    /api/v1/memories/:id            - Update memory
DELETE /api/v1/memories/:id            - Delete memory
POST   /api/v1/memories/search          - Search memories
GET    /api/v1/memories/search/semantic - Semantic search
POST   /api/v1/memories/batch           - Batch operations
GET    /api/v1/stats                    - Memory statistics
POST   /api/v1/memories/export          - Export memories
POST   /api/v1/memories/import          - Import memories
GET    /api/v1/memories/graph/:id       - Get memory relationships
WS     /api/v1/ws                       - WebSocket endpoint
```

**MCP Tools**:

- `local-memory.store` - Store memory with namespace
- `local-memory.search` - Search by text or vector
- `local-memory.get` - Retrieve by ID
- `local-memory.update` - Update existing memory
- `local-memory.delete` - Remove memory
- `local-memory.list` - List with filters
- `local-memory.stats` - Usage statistics
- `local-memory.relate` - Create memory relationships
- `local-memory.subscribe` - Subscribe to changes

**Features**:

- Automatic vector embedding generation
- Semantic search capabilities
- Namespace isolation
- TTL-based expiration
- PII redaction
- Metrics collection
- Health monitoring
- Real-time subscriptions
- Graph relationships
- Import/Export

### Integration Architecture

```markdown
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cortex-OS     │    │  Local Memory   │    │   Enhanced      │
│   Memories      │◄──►│   MCP Server    │◄──►│   Memory Store  │
│   Package       │    │                 │    │   Components    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   A2A Events    │    │   REST API      │    │   Observability │
│                 │    │                 │    │                 │
│ • memory.created│    │ • CRUD          │    │ • Metrics       │
│ • memory.updated│    │ • Search        │    │ • Tracing       │
│ • memory.deleted│    │ • Batch         │    │ • Logging       │
│ • memory.linked │    │ • Stream        │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Migration &   │    │   Backup &      │    │   Access        │
│   Versioning    │    │   Recovery      │    │   Control       │
│                 │    │                 │    │                 │
│ • Schema v2     │    │ • Scheduled     │    │ • RBAC/ABAC     │
│ • Auto-migrate  │    │ • Point-in-time │    │ • Policies      │
│ • Rollback      │    │ • Export/Import │    │ • Audit         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## TDD Implementation Checklist

### Phase 0: Critical Infrastructure (Week 1)

#### Data Migration & Versioning

- [ ] Write failing test for schema version detection
- [ ] Implement MigrationManager
- [ ] Test migration up/down operations
- [ ] Test schema validation
- [ ] Test rollback scenarios
- [ ] Test data integrity during migration

#### Backup & Recovery

- [ ] Write failing test for backup creation
- [ ] Implement BackupManager
- [ ] Test incremental backups
- [ ] Test restore operations
- [ ] Test point-in-time recovery
- [ ] Test backup verification

#### Conflict Resolution

- [ ] Write failing test for conflict detection
- [ ] Implement OptimisticLockingStore
- [ ] Test version-based conflicts
- [ ] Test merge strategies
- [ ] Test concurrent updates
- [ ] Test conflict resolution policies

### Phase 1: Foundation (Weeks 2-3)

#### A2A Event Integration

- [ ] Write failing test for event publishing on store
- [ ] Implement EventAwareMemoryStore decorator
- [ ] Test event schema validation
- [ ] Test event delivery to bus
- [ ] Test error handling for event failures
- [ ] Add integration tests with actual bus

#### Observability Integration

- [ ] Write failing test for metrics collection
- [ ] Implement ObservedMemoryStore decorator
- [ ] Test all metric types (counter, histogram, gauge)
- [ ] Test distributed tracing spans
- [ ] Test error logging and context
- [ ] Test performance overhead

#### RAG Integration

- [ ] Write failing test for enhanced embedder interface
- [ ] Implement RAG embedder adapter
- [ ] Test batch embedding
- [ ] Test reranking functionality
- [ ] Test caching behavior
- [ ] Test hierarchical store integration

### Phase 2: Data Management (Weeks 4-5)

#### Memory Graph & Relationships

- [ ] Write failing test for memory linking
- [ ] Implement GraphMemoryStore
- [ ] Test relationship creation
- [ ] Test graph traversal
- [ ] Test path finding
- [ ] Test community detection

#### Deduplication

- [ ] Write failing test for duplicate detection
- [ ] Implement DeduplicatingMemoryStore
- [ ] Test exact match detection
- [ ] Test fuzzy matching
- [ ] Test merge strategies
- [ ] Test performance impact

#### Memory Templates

- [ ] Write failing test for template creation
- [ ] Implement TemplateMemoryStore
- [ ] Test field extraction
- [ ] Test schema validation
- [ ] Test LLM-based extraction
- [ ] Create 5 default templates

### Phase 3: Core Features (Weeks 6-7)

#### Plugin System

- [ ] Write failing test for plugin registration
- [ ] Implement PluginAwareMemoryStore
- [ ] Test plugin execution order
- [ ] Test plugin error isolation
- [ ] Test plugin lifecycle hooks
- [ ] Write example plugins (audit, compression)

#### Enhanced Security & Access Control

- [ ] Write failing test for RBAC
- [ ] Implement SecureMemoryStore with RBAC
- [ ] Test permission checks
- [ ] Test role management
- [ ] Test policy evaluation
- [ ] Test audit logging

#### Advanced Queries

- [ ] Write failing test for hybrid search
- [ ] Implement HybridQuery processor
- [ ] Test weight balancing
- [ ] Test filter combinations
- [ ] Test aggregation queries
- [ ] Test performance with large datasets

### Phase 4: Real-time & Streaming (Weeks 8-9)

#### Change Data Capture

- [ ] Write failing test for change streaming
- [ ] Implement StreamingMemoryStore
- [ ] Test change event generation
- [ ] Test subscription management
- [ ] Test change log compaction
- [ ] Test event sourcing patterns

#### WebSocket/SSE API

- [ ] Write failing test for WebSocket connections
- [ ] Implement RealtimeMemoryServer
- [ ] Test subscription handling
- [ ] Test broadcasting
- [ ] Test connection management
- [ ] Test reconnection logic

#### Rate Limiting

- [ ] Write failing test for rate limiting
- [ ] Implement RateLimitedMemoryStore
- [ ] Test various limit strategies
- [ ] Test quota management
- [ ] Test usage tracking
- [ ] Test limit reset

### Phase 5: Intelligence & Optimization (Weeks 10-11)

#### Memory Summarization

- [ ] Write failing test for summarization
- [ ] Implement IntelligentMemoryStore
- [ ] Test summary generation
- [ ] Test consolidation
- [ ] Test key point extraction
- [ ] Test timeline generation

#### Lifecycle Management

- [ ] Write failing test for lifecycle transitions
- [ ] Implement LifecycleMemoryStore
- [ ] Test stage transitions
- [ ] Test retention policies
- [ ] Test compaction
- [ ] Test archival

#### Performance Optimizations

- [ ] Write failing test for connection pooling
- [ ] Implement PooledMemoryStore
- [ ] Test batch operations
- [ ] Test streaming search
- [ ] Benchmark performance improvements
- [ ] Test resource cleanup

### Phase 6: Integration & Polish (Weeks 12-13)

#### Workflow Integration

- [ ] Write failing test for workflow triggers
- [ ] Implement WorkflowAwareMemoryStore
- [ ] Test trigger detection
- [ ] Test workflow execution
- [ ] Test error handling
- [ ] Test performance impact

#### Local Memory Integration

- [ ] Write failing test for MCP integration
- [ ] Implement LocalMemoryStore adapter
- [ ] Test all MCP tools
- [ ] Test REST API compatibility
- [ ] Test namespace isolation
- [ ] Test error scenarios

#### Documentation

- [ ] Update README with new features
- [ ] Create migration guide
- [ ] Document plugin API
- [ ] Document security policies
- [ ] Document query capabilities
- [ ] Create performance benchmarks

### Phase 7: Final Testing & Release (Week 14)

#### Integration Testing

- [ ] Full system integration tests
- [ ] Cross-package communication tests
- [ ] Performance regression tests
- [ ] Security audit
- [ ] Load testing
- [ ] Chaos testing

#### Release Preparation

- [ ] Version bump
- [ ] Changelog generation
- [ ] Migration scripts
- [ ] Deployment guides
- [ ] SDK updates
- [ ] Example applications

---

## Test Plans

### Unit Tests

#### Migration Tests

```typescript
describe('MigrationManager', () => {
  it('should detect schema version mismatch', async () => {
    // Given
    const manager = new MigrationManager(store);
    await manager.setVersion('1.0.0');
    
    // When
    const memory = createMemoryV2();
    
    // Then
    await expect(manager.validateSchema(memory)).rejects.toThrow('Schema version mismatch');
  });

  it('should migrate data between versions', async () => {
    // Given
    const manager = new MigrationManager(store);
    const migration: Migration = {
      version: '2.0.0',
      up: async (store) => {
        // Add new field to all memories
        const memories = await store.getAll();
        for (const memory of memories) {
          await store.upsert({
            ...memory,
            newField: 'default'
          });
        }
      },
      down: async (store) => {
        // Remove field
      }
    };
    
    // When
    await manager.registerMigration(migration);
    await manager.migrate('2.0.0');
    
    // Then
    const currentVersion = await manager.getCurrentVersion();
    expect(currentVersion).toBe('2.0.0');
  });
});
```

#### Backup Tests

```typescript
describe('BackupManager', () => {
  it('should create incremental backups', async () => {
    // Given
    const backupManager = new BackupManager(store);
    await store.upsert(createTestMemory());
    
    // When
    const backup1 = await backupManager.createBackup({ type: 'full' });
    await store.upsert(createTestMemory());
    const backup2 = await backupManager.createBackup({ type: 'incremental' });
    
    // Then
    expect(backup2.size).toBeLessThan(backup1.size);
    expect(backup2.type).toBe('incremental');
  });

  it('should restore to point in time', async () => {
    // Given
    const backupManager = new BackupManager(store);
    const memory1 = await store.upsert(createTestMemory());
    const checkpoint = new Date();
    await sleep(100);
    const memory2 = await store.upsert(createTestMemory());
    
    // When
    await backupManager.restore(checkpoint);
    
    // Then
    expect(await store.get(memory1.id)).not.toBeNull();
    expect(await store.get(memory2.id)).toBeNull();
  });
});
```

#### Graph Tests

```typescript
describe('MemoryGraph', () => {
  it('should find shortest path between memories', async () => {
    // Given
    const graph = new MemoryGraph();
    await graph.link('A', 'B', 'related');
    await graph.link('B', 'C', 'related');
    await graph.link('A', 'D', 'related');
    await graph.link('D', 'C', 'related');
    
    // When
    const paths = await graph.findPath('A', 'C');
    
    // Then
    expect(paths[0].length).toBe(2); // A -> B -> C
    expect(paths[0]).toEqual(['A', 'B', 'C']);
  });

  it('should detect communities', async () => {
    // Given
    const graph = new MemoryGraph();
    // Create two clusters
    await graph.link('A', 'B', 'similar');
    await graph.link('B', 'C', 'similar');
    await graph.link('C', 'A', 'similar');
    
    await graph.link('D', 'E', 'similar');
    await graph.link('E', 'F', 'similar');
    await graph.link('F', 'D', 'similar');
    
    // Weak link between clusters
    await graph.link('C', 'D', 'related');
    
    // When
    const communities = await graph.detectCommunities();
    
    // Then
    expect(communities).toHaveLength(2);
    expect(communities[0].members).toContain('A');
    expect(communities[1].members).toContain('D');
  });
});
```

### Integration Tests

#### End-to-End Flow Test

```typescript
describe('Memory System E2E', () => {
  it('should handle complete memory lifecycle', async () => {
    // Setup
    const system = await createMemorySystem({
      features: ['migration', 'backup', 'graph', 'dedup', 'cdc']
    });
    
    // Create and link memories
    const meeting = await system.createFromTemplate('meeting', meetingContent);
    const decision = await system.createFromTemplate('decision', decisionContent);
    await system.graph.link(meeting.id, decision.id, 'resulted_in');
    
    // Subscribe to changes
    const changes: ChangeEvent[] = [];
    const subscription = system.subscribe({
      filter: { kind: 'meeting' }
    }, (event) => changes.push(event));
    
    // Update meeting
    await system.update(meeting.id, {
      tags: [...meeting.tags, 'important']
    });
    
    // Check deduplication
    const duplicate = { ...meeting, id: 'new-id' };
    const stored = await system.upsert(duplicate);
    
    // Verify
    expect(stored.id).toBe(meeting.id); // Deduplicated
    expect(changes).toHaveLength(1); // Update event received
    
    // Backup and restore
    const backup = await system.backup();
    await system.delete(meeting.id);
    await system.restore(backup.id);
    
    // Verify restoration
    const restored = await system.get(meeting.id);
    expect(restored).not.toBeNull();
    
    // Check relationships preserved
    const related = await system.graph.getRelated(meeting.id);
    expect(related).toContainEqual(
      expect.objectContaining({ id: decision.id })
    );
  });
});
```

### Performance Tests

#### Throughput Test

```typescript
describe('Memory Performance', () => {
  it('should handle 10,000 operations/second with all features', async () => {
    // Given
    const store = createFullFeaturedMemoryStore();
    const operations = Array(10000).fill(0).map((_, i) =>
      store.upsert(createTestMemory({ id: `test-${i}` }))
    );

    // When
    const start = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - start;

    // Then
    expect(duration).toBeLessThan(1000); // 1 second
    const throughput = 10000 / (duration / 1000);
    expect(throughput).toBeGreaterThan(10000); // 10k ops/sec
  });

  it('should stream 100k memories efficiently', async () => {
    // Given
    const store = createOptimizedMemoryStore();
    
    // Create 100k memories
    for (let i = 0; i < 100000; i++) {
      await store.upsert(createTestMemory({ id: `mem-${i}` }));
    }
    
    // When
    const start = Date.now();
    let count = 0;
    
    for await (const batch of store.streamSearch({ text: 'test' })) {
      count += batch.length;
    }
    
    // Then
    expect(count).toBe(100000);
    expect(Date.now() - start).toBeLessThan(5000); // Under 5 seconds
  });
});
```

---

## Implementation Priority

### Critical Path (Must Have) - Weeks 1-3

1. **Data Migration & Versioning** - Foundation for all changes
2. **Backup & Recovery** - Data safety and reliability
3. **Conflict Resolution** - Data consistency
4. **A2A Event Integration** - Cross-package communication
5. **Observability Integration** - Production monitoring

### High Priority - Weeks 4-7

6. **Memory Graph & Relationships** - Connected intelligence
7. **Deduplication** - Data quality
8. **Fine-grained Access Control** - Enterprise security
9. **Change Data Capture** - Real-time capabilities
10. **Rate Limiting** - API protection
11. **WebSocket/SSE API** - Real-time subscriptions
12. **Local Memory MCP Integration** - Core functionality

### Medium Priority - Weeks 8-11

13. **RAG Integration** - Search quality
14. **Plugin System** - Extensibility
15. **Enhanced Security** - Advanced protection
16. **Advanced Queries** - Analytics
17. **Memory Templates** - Structured data
18. **Memory Summarization** - Intelligence
19. **Lifecycle Management** - Data governance
20. **Performance Optimizations** - Scale

### Low Priority (Future) - Post v2.0

21. **Workflow Integration** - Automation
22. **GraphQL API** - Alternative interface
23. **Multi-tenancy** - Enterprise isolation
24. **Advanced Analytics** - Usage insights
25. **Multi-region replication** - Global scale
26. **Compression** - Storage optimization

---

## Success Criteria

### Functional Criteria

- [ ] All critical infrastructure operational
- [ ] Zero data loss during migrations
- [ ] Successful backup/restore in < 1 minute
- [ ] Conflict resolution working for concurrent updates
- [ ] All MCP tools working with Local Memory
- [ ] A2A events flowing to other packages
- [ ] Observability metrics in dashboards
- [ ] Memory graph with relationship traversal
- [ ] Deduplication preventing duplicates
- [ ] RBAC/ABAC access control enforced
- [ ] Real-time WebSocket subscriptions working
- [ ] Rate limiting protecting APIs

### Performance Criteria

- [ ] 10,000+ operations/second throughput
- [ ] <10ms latency for 95% of operations
- [ ] <5ms overhead from decorators
- [ ] Memory usage <1.5x baseline
- [ ] Streaming 100k memories in <5 seconds
- [ ] Graph traversal <100ms for depth 3
- [ ] Deduplication check <50ms
- [ ] WebSocket broadcast <10ms

### Quality Criteria

- [ ] 95%+ test coverage maintained
- [ ] Zero critical security vulnerabilities
- [ ] Documentation complete with examples
- [ ] All integration tests passing
- [ ] Performance benchmarks established
- [ ] Migration path documented
- [ ] SDK available in TypeScript
- [ ] Example applications provided

### Reliability Criteria

- [ ] RTO < 5 minutes
- [ ] RPO < 1 minute
- [ ] 99.9% uptime SLA achievable
- [ ] Graceful degradation under load
- [ ] Automatic failover working
- [ ] Data integrity maintained
- [ ] Audit trail complete

---

## Appendices

### A. Environment Variables

```bash
# A2A Configuration
A2A_TRANSPORT_TYPE=nats
A2A_NATS_URL=nats://localhost:4222

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
MEMORY_METRICS_ENABLED=true
MEMORY_TRACING_ENABLED=true

# Local Memory
LOCAL_MEMORY_BASE_URL=http://localhost:3010/api/v1
LOCAL_MEMORY_API_KEY=your-api-key
LOCAL_MEMORY_NAMESPACE=default
LOCAL_MEMORY_WS_URL=ws://localhost:3011

# Security
MEMORY_SECURITY_POLICY_LEVEL=strict
MEMORY_CONTENT_FILTER_ENABLED=true
MEMORY_AUDIT_LOGGING=true
MEMORY_RBAC_ENABLED=true

# Backup & Recovery
MEMORY_BACKUP_ENABLED=true
MEMORY_BACKUP_SCHEDULE="0 0 * * *"
MEMORY_BACKUP_RETENTION_DAYS=30
MEMORY_BACKUP_DESTINATION=s3://backups/memories

# Performance
MEMORY_POOL_SIZE=10
MEMORY_CACHE_SIZE_MB=256
MEMORY_RATE_LIMIT_PER_SECOND=100
MEMORY_MAX_CONNECTIONS=1000

# Features
MEMORY_DEDUPLICATION_ENABLED=true
MEMORY_GRAPH_ENABLED=true
MEMORY_CDC_ENABLED=true
MEMORY_LIFECYCLE_ENABLED=true
```

### B. Migration Guide

#### From v1.0 to v2.0

1. **Backup existing data**

   ```bash
   npm run memories:backup -- --output backup-v1.tar.gz
   ```

2. **Install v2.0**

   ```bash
   npm install @cortex-os/memories@2.0.0
   ```

3. **Run migration**

   ```bash
   npm run memories:migrate -- --to 2.0.0
   ```

4. **Verify migration**

   ```bash
   npm run memories:verify
   ```

5. **Update configuration**
   - Add new environment variables
   - Update API clients for new endpoints
   - Configure new features

### C. Monitoring Dashboard

Key metrics to monitor:

#### System Health

- Memory operations/second by type
- Average query latency (p50, p95, p99)
- Error rates by operation
- Storage utilization
- Active connections

#### Data Quality

- Deduplication rate
- Schema validation failures
- Conflict resolution events
- Data integrity checks

#### Performance

- Cache hit rates
- Embedding generation time
- Graph traversal latency
- Batch operation throughput
- WebSocket message latency

#### Security

- Access denied events
- Policy violations
- Audit log entries
- Rate limit hits

#### Reliability

- Backup success rate
- Recovery time metrics
- Replication lag
- Change stream lag

### D. Example Plugins

```typescript
// Audit Plugin
export class AuditPlugin implements MemoryPlugin {
  name = 'audit';
  version = '1.0.0';

  async onAfterStore(memory: Memory, context: StoreContext): Promise<void> {
    await this.auditLog.record({
      action: 'memory.created',
      memoryId: memory.id,
      user: context.user,
      timestamp: new Date(),
      metadata: {
        namespace: context.namespace,
        tags: memory.tags
      }
    });
  }
}

// Compression Plugin
export class CompressionPlugin implements MemoryPlugin {
  name = 'compression';
  version = '1.0.0';

  async onBeforeStore(memory: Memory, context: StoreContext): Promise<Memory> {
    if (memory.text && memory.text.length > 1000) {
      return {
        ...memory,
        text: await this.compress(memory.text),
        metadata: {
          ...memory.metadata,
          compressed: true,
          originalSize: memory.text.length
        }
      };
    }
    return memory;
  }
}

// Analytics Plugin
export class AnalyticsPlugin implements MemoryPlugin {
  name = 'analytics';
  version = '1.0.0';

  async onAfterRetrieve(results: Memory[], context: QueryContext): Promise<Memory[]> {
    // Track query patterns
    await this.analytics.track({
      event: 'memory.search',
      properties: {
        queryType: context.queryType,
        resultCount: results.length,
        responseTime: context.duration,
        namespace: context.namespace
      }
    });
    
    return results;
  }
}
```

---

*This comprehensive TDD plan v2.0 ensures incremental, test-driven delivery of a production-ready, enterprise-grade memory management system with critical infrastructure, advanced features, and operational excellence.*
