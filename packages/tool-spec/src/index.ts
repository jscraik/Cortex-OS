import { z } from 'zod';
import Ajv from 'ajv';

// Import schemas
import memoryStoreSchema from './schemas/memory.store.schema.json';
import memorySearchSchema from './schemas/memory.search.schema.json';
import memoryAnalysisSchema from './schemas/memory.analysis.schema.json';
import memoryRelationshipsSchema from './schemas/memory.relationships.schema.json';
import memoryStatsSchema from './schemas/memory.stats.schema.json';

// Generate Zod schemas from JSON schemas
export const MemoryStoreInputSchema = z.object({
  content: z.string().min(1).max(8192),
  importance: z.number().int().min(1).max(10).default(5),
  tags: z.array(z.string().min(1).max(50)).max(32).optional(),
  domain: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  metadata: z.record(z.any()).max(50).optional(),
});

export const MemorySearchInputSchema = z.object({
  query: z.string().min(1).max(1000),
  search_type: z.enum(['semantic', 'tags', 'hybrid', 'keyword']).default('semantic'),
  tags: z.array(z.string()).max(10).optional(),
  domain: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  session_filter_mode: z.enum(['all', 'session']).default('all'),
  score_threshold: z.number().min(0).max(1).default(0.5),
  hybrid_weight: z.number().min(0).max(1).default(0.6),
});

export const MemoryAnalysisInputSchema = z.object({
  analysis_type: z.enum(['summary', 'temporal_patterns', 'tag_clusters', 'concept_network', 'custom']).optional(),
  domain: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  concept: z.string().optional(),
  question: z.string().max(500).optional(),
  max_memories: z.number().int().min(10).max(1000).default(100),
  output_format: z.enum(['json', 'markdown', 'text']).default('json'),
});

export const MemoryRelationshipsInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    source_id: z.string(),
    target_id: z.string(),
    relationship_type: z.enum(['references', 'extends', 'contradicts', 'supports', 'precedes', 'follows', 'related_to']),
    strength: z.number().min(0).max(1).default(0.5),
    bidirectional: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('delete'),
    source_id: z.string(),
    target_id: z.string(),
    relationship_type: z.enum(['references', 'extends', 'contradicts', 'supports', 'precedes', 'follows', 'related_to']),
  }),
  z.object({
    action: z.literal('find'),
    memory_id: z.string(),
    include_types: z.array(z.enum(['references', 'extends', 'contradicts', 'supports', 'precedes', 'follows', 'related_to'])).optional(),
  }),
  z.object({
    action: z.literal('map_graph'),
    memory_id: z.string(),
    max_depth: z.number().int().min(1).max(10).default(3),
    max_nodes: z.number().int().min(10).max(1000).default(100),
  }),
]);

export const MemoryStatsInputSchema = z.object({
  domain: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  include: z.array(z.enum([
    'total_count',
    'domain_distribution',
    'tag_distribution',
    'importance_distribution',
    'temporal_distribution',
    'storage_size',
    'index_stats',
    'qdrant_stats',
    'recent_activity'
  ])).default(['total_count', 'domain_distribution', 'tag_distribution']),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  granularity: z.enum(['day', 'week', 'month', 'year']).default('day'),
});

// Export types
export type MemoryStoreInput = z.infer<typeof MemoryStoreInputSchema>;
export type MemorySearchInput = z.infer<typeof MemorySearchInputSchema>;
export type MemoryAnalysisInput = z.infer<typeof MemoryAnalysisInputSchema>;
export type MemoryRelationshipsInput = z.infer<typeof MemoryRelationshipsInputSchema>;
export type MemoryStatsInput = z.infer<typeof MemoryStatsInputSchema>;

// Tool definitions
export interface ToolSpec {
  name: string;
  schema: any;
  zodSchema: z.ZodSchema;
  description: string;
}

export const TOOL_SPECS: Record<string, ToolSpec> = {
  'memory.store': {
    name: 'memory.store',
    schema: memoryStoreSchema,
    zodSchema: MemoryStoreInputSchema,
    description: 'Store a memory with content, importance, tags, and domain',
  },
  'memory.search': {
    name: 'memory.search',
    schema: memorySearchSchema,
    zodSchema: MemorySearchInputSchema,
    description: 'Search memories using semantic, keyword, or hybrid search',
  },
  'memory.analysis': {
    name: 'memory.analysis',
    schema: memoryAnalysisSchema,
    zodSchema: MemoryAnalysisInputSchema,
    description: 'Analyze memories to extract insights, patterns, and summaries',
  },
  'memory.relationships': {
    name: 'memory.relationships',
    schema: memoryRelationshipsSchema,
    zodSchema: MemoryRelationshipsInputSchema,
    description: 'Manage and query relationships between memories',
  },
  'memory.stats': {
    name: 'memory.stats',
    schema: memoryStatsSchema,
    zodSchema: MemoryStatsInputSchema,
    description: 'Get statistics and metrics about stored memories',
  },
};

// Validation helpers
const ajv = new Ajv({ allErrors: true });

export function validateToolInput(toolName: string, input: unknown): boolean {
  const spec = TOOL_SPECS[toolName];
  if (!spec) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const validate = ajv.compile(spec.schema);
  if (!validate(input)) {
    throw new Error(`Validation failed: ${JSON.stringify(validate.errors)}`);
  }

  return true;
}

export function getToolSpec(toolName: string): ToolSpec | undefined {
  return TOOL_SPECS[toolName];
}

export function listToolSpecs(): ToolSpec[] {
  return Object.values(TOOL_SPECS);
}

// Export schemas for external use
export const SCHEMAS = {
  memoryStore: memoryStoreSchema,
  memorySearch: memorySearchSchema,
  memoryAnalysis: memoryAnalysisSchema,
  memoryRelationships: memoryRelationshipsSchema,
  memoryStats: memoryStatsSchema,
};