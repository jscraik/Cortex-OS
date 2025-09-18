/**
 * MCP Client integration for subagents
 *
 * Provides access to memory MCP tools for subagent execution
 */

import { z } from 'zod';
import type { MemoryStore } from '@cortex-os/memories';

// MCP Tool schemas matching the memory MCP interface
const MemoryStoreSchema = z.object({
  kind: z.string().min(1).max(32),
  text: z.string().min(1),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

const MemorySearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).default(10),
  kind: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const MemoryUpdateSchema = z.object({
  id: z.string().min(3).max(128),
  text: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const MemoryDeleteSchema = z.object({
  id: z.string().min(3).max(128),
});

const MemoryGetSchema = z.object({
  id: z.string().min(3).max(128),
  namespace: z.string().min(1).default('default'),
});

// MCP Response schemas
const MCPResponseSchema = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string(),
  })),
  metadata: z.object({
    correlationId: z.string(),
    timestamp: z.string(),
    tool: z.string(),
  }),
  isError: z.boolean().optional(),
});

// Memory MCP Client for subagents
export class MemoryMCPClient {
  private memoryStore: MemoryStore;

  constructor(memoryStore: MemoryStore) {
    this.memoryStore = memoryStore;
  }

  /**
   * Store a memory item
   */
  async store(params: unknown): Promise<any> {
    try {
      const input = MemoryStoreSchema.parse(params);

      const memory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: input.kind,
        text: input.text,
        tags: input.tags,
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provenance: { source: 'subagent' },
      };

      const result = await this.memoryStore.upsert(memory);

      return {
        stored: true,
        id: result.id,
        kind: result.kind,
        tags: result.tags,
        textLength: result.text?.length || 0,
        metadataKeys: result.metadata ? Object.keys(result.metadata).length : 0,
      };
    } catch (error) {
      throw new Error(`Memory store failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search for memories
   */
  async search(params: unknown): Promise<any> {
    try {
      const input = MemorySearchSchema.parse(params);

      const results = await this.memoryStore.searchByText({
        text: input.query,
        topK: input.limit,
        filterTags: input.tags,
      });

      // Filter by kind if specified
      const filtered = input.kind
        ? results.filter(r => r.kind === input.kind)
        : results;

      return {
        query: input.query,
        filters: {
          kind: input.kind ?? null,
          tags: input.tags ?? [],
        },
        results: filtered.slice(0, input.limit).map(r => ({
          id: r.id,
          kind: r.kind,
          text: r.text,
          score: 0.9, // Default score for text search
          tags: r.tags,
          createdAt: r.createdAt,
        })),
        totalFound: filtered.length,
      };
    } catch (error) {
      throw new Error(`Memory search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a memory item
   */
  async update(params: unknown): Promise<any> {
    try {
      const input = MemoryUpdateSchema.parse(params);

      // Get existing memory
      const existing = await this.memoryStore.get(input.id);
      if (!existing) {
        throw new Error(`Memory not found: ${input.id}`);
      }

      // Apply updates
      const updates: Partial<typeof existing> = {};
      if (input.text !== undefined) updates.text = input.text;
      if (input.tags !== undefined) updates.tags = input.tags;
      if (input.metadata !== undefined) updates.metadata = input.metadata;
      updates.updatedAt = new Date().toISOString();

      const updated = await this.memoryStore.upsert({ ...existing, ...updates });

      return {
        id: updated.id,
        updated: true,
        changes: {
          text: input.text !== undefined,
          tags: input.tags !== undefined,
          metadata: input.metadata !== undefined,
        },
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      throw new Error(`Memory update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a memory item
   */
  async delete(params: unknown): Promise<any> {
    try {
      const input = MemoryDeleteSchema.parse(params);

      await this.memoryStore.delete(input.id);

      return {
        id: input.id,
        deleted: true,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Memory delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific memory item
   */
  async get(params: unknown): Promise<any> {
    try {
      const input = MemoryGetSchema.parse(params);

      const memory = await this.memoryStore.get(input.id);

      if (!memory) {
        return {
          id: input.id,
          namespace: input.namespace,
          found: false,
        };
      }

      return {
        id: memory.id,
        namespace: input.namespace,
        found: true,
        memory: {
          id: memory.id,
          kind: memory.kind,
          text: memory.text,
          tags: memory.tags,
          metadata: memory.metadata,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
        },
      };
    } catch (error) {
      throw new Error(`Memory get failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List memory items with pagination
   */
  async list(params: unknown): Promise<any> {
    try {
      const input = z.object({
        namespace: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().min(1).optional(),
        tags: z.array(z.string()).max(32).optional(),
      }).parse(params);

      // For now, return empty implementation
      // In a real implementation, this would support pagination
      return {
        namespace: input.namespace ?? null,
        limit: input.limit,
        cursor: input.cursor ?? null,
        tags: input.tags ?? [],
        items: [],
        nextCursor: null,
      };
    } catch (error) {
      throw new Error(`Memory list failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get memory statistics
   */
  async stats(params: unknown): Promise<any> {
    try {
      const input = z.object({
        includeDetails: z.boolean().default(false),
      }).parse(params);

      // Basic stats implementation
      return {
        totalItems: 0, // Would need to query actual count
        totalSize: 0,
        itemsByKind: {},
        lastActivity: new Date().toISOString(),
        ...(input.includeDetails && {
          details: {
            storageBackend: 'sqlite',
            indexedFields: ['kind', 'tags', 'createdAt'],
            averageItemSize: 0,
          },
        }),
      };
    } catch (error) {
      throw new Error(`Memory stats failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Tool factory for memory MCP tools
export function createMemoryTools(memoryStore: MemoryStore) {
  const client = new MemoryMCPClient(memoryStore);

  return {
    'memories.store': {
      name: 'memories.store',
      description: 'Store information in the memory system',
      schema: MemoryStoreSchema,
      call: async (args: any) => client.store(args),
    },
    'memories.search': {
      name: 'memories.search',
      description: 'Retrieve information from the memory system',
      schema: MemorySearchSchema,
      call: async (args: any) => client.search(args),
    },
    'memories.update': {
      name: 'memories.update',
      description: 'Update existing memory items',
      schema: MemoryUpdateSchema,
      call: async (args: any) => client.update(args),
    },
    'memories.delete': {
      name: 'memories.delete',
      description: 'Delete memory items',
      schema: MemoryDeleteSchema,
      call: async (args: any) => client.delete(args),
    },
    'memories.get': {
      name: 'memories.get',
      description: 'Retrieve a specific memory item by identifier',
      schema: MemoryGetSchema,
      call: async (args: any) => client.get(args),
    },
    'memories.list': {
      name: 'memories.list',
      description: 'List memory items with pagination support',
      schema: z.object({
        namespace: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().min(1).optional(),
        tags: z.array(z.string()).max(32).optional(),
      }),
      call: async (args: any) => client.list(args),
    },
    'memories.stats': {
      name: 'memories.stats',
      description: 'Get memory system statistics',
      schema: z.object({
        includeDetails: z.boolean().default(false),
      }),
      call: async (args: any) => client.stats(args),
    },
  };
}