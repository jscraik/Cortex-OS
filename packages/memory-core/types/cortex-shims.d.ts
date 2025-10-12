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
  export const MemoryStoreEventSchema: {
    parse<T>(event: T): T;
  };
}
