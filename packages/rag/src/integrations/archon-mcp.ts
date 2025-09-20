/**
 * Archon MCP Integration for RAG Package
 *
 * Leverages MCP for remote retrieval services and task manager
 * for document ingestion jobs as outlined in the Archon integration plan.
 */

// Align with actual RAG core types
import type { Chunk, Embedder, Store } from '../lib/types.js';
import type {
  AgentMCPClient,
  MCPIntegrationConfig,
  KnowledgeSearchFilters,
  KnowledgeSearchResult,
} from './agents-shim.js';
import { createAgentMCPClient } from './agents-shim.js';

// Lightweight store contract accepted for enhancement
export interface MinimalStore {
  upsert(chunks: Chunk[]): Promise<void>;
  // Deprecated: Archon integration removed. Use './remote-mcp' instead.
  // This file is intentionally empty to avoid breaking stale imports.
  export {};
      chunkSize?: number;
      batchSize?: number;
    } = {},
  ): Promise<{ taskId: string; jobId: string }> {
    try {
      // Create task for the ingestion job
      const task = (await this.mcpClient.createTask(
        title,
        `Ingest ${documents.length} documents into knowledge base`,
        {
          priority: options.priority || 'medium',
          tags: ['document-ingestion', 'rag', ...(options.tags || [])],
        },
      )) as { taskId?: string };

      // Process documents in batches
      const batchSize = options.batchSize || 10;
      let processed = 0;

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        try {
          await this.processBatch(batch, options);
          processed += batch.length;

          // Update task progress
          if (task.taskId) {
            await this.mcpClient.updateTaskStatus(
              task.taskId,
              'in_progress',
              `Processed ${processed}/${documents.length} documents`,
            );
          }
        } catch (error) {
          console.error(`[Archon RAG] Batch processing failed for batch ${i}:`, error);
          // Continue with next batch
        }
      }

      // Mark task as completed
      if (task.taskId) {
        await this.mcpClient.updateTaskStatus(
          task.taskId,
          'completed',
          `Successfully ingested ${processed}/${documents.length} documents`,
        );
      }

      return {
        taskId: task.taskId ?? `task-${Date.now()}`,
        jobId: `job-${Date.now()}`,
      };
    } catch (error) {
      console.error('[Archon RAG] Ingestion job creation failed:', error);
      throw error;
    }
  }

  private async processBatch(
    documents: Array<{
      filename: string;
      content: string;
      metadata?: Record<string, unknown>;
    }>,
    options: {
      chunkSize?: number;
      tags?: string[];
    },
  ): Promise<void> {
    for (const doc of documents) {
      try {
        await this.mcpClient.uploadDocument(doc.content, doc.filename, {
          tags: ['rag-ingested', ...(options.tags || [])],
          metadata: {
            ...doc.metadata,
            ingestedAt: new Date().toISOString(),
            chunkSize: options.chunkSize,
          },
        });
      } catch (error) {
        console.error(`[Archon RAG] Failed to upload document ${doc.filename}:`, error);
        // Continue with other documents
      }
    }
  }

  async cleanup(): Promise<void> {
    await this.mcpClient.disconnect();
  }
}

/**
 * Factory functions for creating Archon-enhanced RAG components
 */
export function createArchonEmbedder(
  config: ArchonRAGConfig,
  fallbackEmbedder?: Embedder,
): ArchonEmbedder {
  return new ArchonEmbedder(config, fallbackEmbedder);
}

export function createArchonEnhancedStore(
  localStore: StoreLike,
  config: ArchonRAGConfig,
): ArchonEnhancedStore {
  return new ArchonEnhancedStore(localStore, config);
}

export function createArchonIngestionManager(
  config: ArchonRAGConfig,
): ArchonDocumentIngestionManager {
  return new ArchonDocumentIngestionManager(config);
}
