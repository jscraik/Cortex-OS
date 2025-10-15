declare module '@cortex-os/contracts' {
  import type { ZodType } from 'zod';

  export type BranchId = `branch_${string}`;
  export type CheckpointId = `ckpt_${string}`;

  export interface EvidenceRef {
    uri: string;
    digest?: string;
    mediaType?: string;
  }

  export interface StateEnvelope {
    plan?: unknown;
    worldModel?: unknown;
    toolCtx?: Record<string, unknown>;
    scratch?: Record<string, unknown>;
    memRefs?: string[];
    rngSeed?: number;
    evidence?: EvidenceRef[];
  }

  export interface CheckpointMeta {
    id: CheckpointId;
    parent?: CheckpointId;
    branch?: BranchId;
    createdAt: string;
    score?: number;
    labels?: string[];
    sizeBytes?: number;
  }

  export interface CheckpointRecord {
    meta: CheckpointMeta;
    state: StateEnvelope;
  }

  export const CheckpointRecordSchema: {
    parse(record: CheckpointRecord): CheckpointRecord;
  };

  export type SkillCategory =
    | 'coding'
    | 'communication'
    | 'security'
    | 'analysis'
    | 'automation'
    | 'integration'
    | 'testing'
    | 'documentation'
    | 'other';

  export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

  export interface SkillPersuasiveFraming {
    authority?: string;
    commitment?: string;
    scarcity?: string;
    socialProof?: string;
    reciprocity?: string;
  }

  export interface SkillMetadata {
    version: string;
    author: string;
    category: SkillCategory;
    tags: string[];
    difficulty: SkillDifficulty;
    estimatedTokens: number;
    requiredTools?: string[];
    prerequisites?: string[];
    relatedSkills?: string[];
    createdAt?: string;
    updatedAt?: string;
    deprecated?: boolean;
    replacedBy?: string;
  }

  export interface SkillFrontmatter {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    category: SkillCategory;
    tags: string[];
    difficulty: SkillDifficulty;
    estimatedTokens: number;
    requiredTools?: string[];
    prerequisites?: string[];
    relatedSkills?: string[];
    deprecated?: boolean;
    replacedBy?: string;
    persuasiveFraming?: SkillPersuasiveFraming;
  }

  export interface SkillExample {
    title: string;
    input: string;
    output: string;
    explanation?: string;
  }

  export interface Skill {
    id: string;
    name: string;
    description: string;
    content: string;
    metadata: SkillMetadata;
    persuasiveFraming?: SkillPersuasiveFraming;
    examples?: SkillExample[];
    warnings?: string[];
    successCriteria: string[];
    failureIndicators?: string[];
  }

  export interface SkillSearchQuery {
    query: string;
    category?: SkillCategory | 'all';
    tags?: string[];
    difficulty?: SkillDifficulty | 'all';
    topK?: number;
    similarityThreshold?: number;
    includeDeprecated?: boolean;
  }

  export interface SkillSearchResult {
    skill: Skill;
    relevanceScore: number;
    matchedFields: string[];
    highlightedContent?: string;
  }

  export interface A2AQueueMessagePart {
    text?: string;
    data?: unknown;
  }

  export interface A2AQueueMessageSection {
    role: 'user' | 'assistant' | 'system' | string;
    parts: A2AQueueMessagePart[];
  }

  export interface A2AQueueMessageInput {
    id?: string;
    topic?: string;
    message?: A2AQueueMessageSection;
    context?: A2AQueueMessageSection[];
    metadata?: Record<string, unknown>;
  }

  export interface A2AQueueMessageResult {
    success?: boolean;
    status?: 'completed' | 'failed' | 'cancelled' | 'running' | 'pending';
    id: string;
    message?: A2AQueueMessageSection;
    artifacts?: Array<Record<string, unknown>>;
    error?: { code: number; message: string; data?: unknown };
  }

  export interface A2AOutboxSyncInput {
    action: 'processPending' | 'processRetries' | 'cleanup' | 'dlqStats';
    olderThanDays?: number;
  }

  export interface A2AOutboxSyncResult {
    processed?: number;
    successful?: number;
    failed?: number;
    deadLettered?: number;
    durationMs?: number;
    cleanupDeleted?: number;
    olderThanDays?: number;
    dlqStats?: Record<string, unknown>;
  }

  export interface A2AEventStreamEvent {
    id: string;
    type: 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'taskRunning';
    status: string;
    timestamp: string;
    error?: { code: number; message: string };
  }

  export interface A2AEventStreamSubscribeInput {
    includeCurrent?: boolean;
    events?: string[];
    since?: string;
  }

  export interface A2AEventStreamSubscribeResult {
    subscriptionId: string;
    events: A2AEventStreamEvent[];
    note?: string;
  }

  export const A2AQueueMessageInputSchema: ZodType<A2AQueueMessageInput>;
  export const A2AQueueMessageResultSchema: ZodType<A2AQueueMessageResult>;
  export const A2AOutboxSyncInputSchema: ZodType<A2AOutboxSyncInput>;
  export const A2AOutboxSyncResultSchema: ZodType<A2AOutboxSyncResult>;
  export const A2AEventStreamSubscribeInputSchema: ZodType<A2AEventStreamSubscribeInput>;
  export const A2AEventStreamSubscribeResultSchema: ZodType<A2AEventStreamSubscribeResult>;
}

declare module '@cortex-os/contracts/skill-events' {
  import type { z } from 'zod';
  import type {
    Skill,
    SkillFrontmatter,
    SkillMetadata,
    SkillPersuasiveFraming,
    SkillSearchQuery,
    SkillSearchResult,
  } from '@cortex-os/contracts';

  export const skillSchema: z.ZodType<Skill>;
  export const skillFrontmatterSchema: z.ZodType<SkillFrontmatter>;
  export const skillMetadataSchema: z.ZodType<SkillMetadata>;
  export const skillPersuasiveFramingSchema: z.ZodType<SkillPersuasiveFraming>;
  export const skillSearchQuerySchema: z.ZodType<SkillSearchQuery>;
  export const skillSearchResultSchema: z.ZodType<SkillSearchResult>;
}

declare module '@cortex-os/tool-spec' {
  export interface MemoryStoreInput {
    id?: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    importance?: number;
  }

  export interface MemorySearchInput {
    query: string;
    topK?: number;
    tags?: string[];
    threshold?: number;
  }

  export interface MemoryAnalysisInput {
    memoryId: string;
    analysisType: string;
  }

  export interface MemoryStatsInput {
    includeTrends?: boolean;
  }

  export interface MemoryRelationshipsInput {
    sourceId: string;
    targetId?: string;
    relationshipType: string;
  }
}

declare module '@cortex-os/utils' {
  export class SecureNeo4j {
    constructor(uri: string, user: string, password: string);
    neighborhood(
      nodeId: string,
      depth: number,
    ): Promise<{ nodes?: Array<{ id: string; label?: string | null }>; edges?: unknown[] } | undefined>;
    upsertNode(payload: { id: string; label: string; props: Record<string, unknown> }): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@cortex-os/a2a' {
  export interface A2ABus {
    publish(event: unknown): Promise<void>;
  }

  export function getA2ABus(): Promise<A2ABus>;
}

declare module '@cortex-os/a2a-contracts' {
  export interface Envelope<TData = unknown> {
    id: string;
    type: string;
    source: string;
    specversion: '1.0';
    data?: TData;
    subject?: string;
    time?: string;
    headers?: Record<string, string>;
    ttlMs?: number;
    causationId?: string;
    correlationId?: string;
    traceparent?: string;
    tracestate?: string;
    baggage?: string;
  }

  export interface OutboxConfig {
    maxRetries?: number;
    initialRetryDelayMs?: number;
    maxRetryDelayMs?: number;
    backoffMultiplier?: number;
    batchSize?: number;
    processingIntervalMs?: number;
    dlqThreshold?: number;
    messageTtlMs?: number;
    enableIdempotency?: boolean;
  }

  export interface OutboxProcessingResult {
    processed: number;
    successful: number;
    failed: number;
    deadLettered: number;
    duration: number;
  }

  export enum OutboxMessageStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
    DEAD_LETTER = 'DEAD_LETTER',
  }

  export interface OutboxMessage {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    metadata?: Record<string, unknown>;
    status: OutboxMessageStatus;
    createdAt: Date;
    processedAt?: Date;
    publishedAt?: Date;
    retryCount: number;
    maxRetries: number;
    lastError?: string;
    nextRetryAt?: Date;
    idempotencyKey?: string;
    correlationId?: string;
    causationId?: string;
    traceparent?: string;
    tracestate?: string;
    baggage?: string;
  }

  export interface OutboxRepository {
    save(message: Omit<OutboxMessage, 'id' | 'createdAt'>): Promise<OutboxMessage>;
    saveBatch(messages: Array<Omit<OutboxMessage, 'id' | 'createdAt'>>): Promise<OutboxMessage[]>;
    findByStatus(status: OutboxMessageStatus, limit?: number): Promise<OutboxMessage[]>;
    findReadyForRetry(limit?: number): Promise<OutboxMessage[]>;
    findByAggregate(aggregateType: string, aggregateId: string): Promise<OutboxMessage[]>;
    updateStatus(id: string, status: OutboxMessageStatus, error?: string): Promise<void>;
    markProcessed(id: string, publishedAt?: Date): Promise<void>;
    incrementRetry(id: string, error: string): Promise<void>;
    moveToDeadLetter(id: string, error: string): Promise<void>;
    cleanup(olderThan: Date): Promise<number>;
    existsByIdempotencyKey(idempotencyKey: string): Promise<boolean>;
  }

  export const MemoryStoreEventSchema: {
    parse<T>(event: T): T;
  };
}

declare module '@cortex-os/a2a-contracts/outbox-types' {
  export {
    OutboxConfig,
    OutboxMessage,
    OutboxMessageStatus,
    OutboxProcessingResult,
    OutboxRepository,
  } from '@cortex-os/a2a-contracts';
}

declare module '@cortex-os/a2a-core' {
  export interface OutboxIntegrationOptions {
    repository: import('@cortex-os/a2a-contracts').OutboxRepository;
    publisher: {
      publish(message: import('@cortex-os/a2a-contracts').OutboxMessage): Promise<void>;
      publishBatch(messages: import('@cortex-os/a2a-contracts').OutboxMessage[]): Promise<void>;
    };
    telemetry?: {
      enabled?: boolean;
    };
  }

  export function createOutboxIntegration(options: OutboxIntegrationOptions): Promise<void>;
}

declare module '@cortex-os/telemetry' {
  export interface Span {
    setAttribute(key: string, value: unknown): void;
    setAttributes(attributes: Record<string, unknown>): void;
    end(): void;
  }

  export function withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T>;
}

declare module '@cortex-os/mcp-core/client' {
  export interface McpClient {
    listTools(): Promise<string[]>;
    callTool(toolName: string, payload: Record<string, unknown>): Promise<{ success?: boolean; data?: unknown }>;
    dispose?(): Promise<void>;
  }

  export function createEnhancedClient(server: import('@cortex-os/mcp-core/types').McpServerInfo): McpClient;
}

declare module '@cortex-os/mcp-core/types' {
  export interface McpServerInfo {
    name: string;
    host: string;
    port: number;
    protocol: string;
  }
}

declare module '@cortex-os/mcp-registry/fs-store' {
  export interface McpRegistryRecord {
    servers: Array<{
      slug: string;
      name: string;
      host: string;
      port: number;
      protocol: string;
    }>;
  }

  export function readAll(): Promise<McpRegistryRecord>;
}

declare module 'ioredis' {
  type RedisValue = string | number | Buffer;

  export interface ScanStreamOptions {
    match?: string;
    count?: number;
  }

  export interface PipelineCommand<T = RedisValue> {
    exec(): Promise<[Error | null, T][]>;
  }

  export default class Redis {
    constructor(options: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      retryDelayOnFailover?: number;
      enableReadyCheck?: boolean;
      maxRetriesPerRequest?: number;
      lazyConnect?: boolean;
    });

    on(event: 'connect', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;

    config(command: string, option: string, value: string): Promise<'OK'>;
    info(section?: string): Promise<string>;
    dbsize(): Promise<number>;
    get(key: string): Promise<string | null>;
    getBuffer(key: string): Promise<Buffer | null>;
    set(key: string, value: RedisValue, mode?: string, duration?: number): Promise<'OK' | null>;
    setex(key: string, seconds: number, value: RedisValue): Promise<'OK' | null>;
    del(...keys: string[]): Promise<number>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    pipeline(): PipelineCommand;
    scanStream(options?: ScanStreamOptions): NodeJS.ReadableStream;
    keys(pattern: string): Promise<string[]>;
    quit(): Promise<'OK'>;
  }
}
