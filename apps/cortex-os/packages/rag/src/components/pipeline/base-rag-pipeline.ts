/**
 * @file Base RAG Pipeline
 * @description Simple base RAG pipeline implementation for fallback scenarios
 * @author Cortex OS Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { ProcessingDispatcher, ProcessingFile, DocumentChunk } from '../chunkers/dispatch.js';

export interface BaseRagOptions {
  maxChunks?: number;
  chunkOverlap?: number;
  enableCaching?: boolean;
}

/**
 * Simple base RAG pipeline for fallback scenarios
 */
export class RagPipeline extends EventEmitter {
  private dispatcher: ProcessingDispatcher;
  private readonly options: Required<BaseRagOptions>;

  constructor(options: BaseRagOptions = {}) {
    super();

    this.options = {
      maxChunks: 100,
      chunkOverlap: 20,
      enableCaching: true,
      ...options,
    };

    this.dispatcher = new ProcessingDispatcher({
      maxChunkSize: 4096,
      enableParallel: false,
    });
  }

  /**
   * Process a single file into chunks
   */
  async processFile(file: ProcessingFile): Promise<DocumentChunk[]> {
    try {
      const result = await this.dispatcher.dispatch(file, {
        strategy: 'NATIVE_TEXT',
        processing: {
          chunker: 'text',
          maxChunkSize: this.options.maxChunks,
          overlap: this.options.chunkOverlap,
        },
        reason: 'Base pipeline processing',
      });

      if (!result.success || !result.chunks) {
        throw new Error(result.error || 'Processing failed');
      }

      return result.chunks;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Simple text-based search through chunks
   */
  async search(
    query: string,
    chunks: DocumentChunk[],
    maxResults = 10,
  ): Promise<
    Array<{
      chunk: DocumentChunk;
      score: number;
      rank: number;
    }>
  > {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: Array<{ chunk: DocumentChunk; score: number; rank: number }> = [];

    for (const chunk of chunks) {
      const content = chunk.content.toLowerCase();
      let score = 0;

      // Simple TF-IDF-like scoring
      for (const term of queryTerms) {
        const termCount = (content.match(new RegExp(term, 'g')) || []).length;
        if (termCount > 0) {
          score += termCount / chunk.content.length;
        }
      }

      if (score > 0) {
        results.push({ chunk, score, rank: 0 });
      }
    }

    // Sort by score and assign ranks
    results.sort((a, b) => b.score - a.score);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results.slice(0, maxResults);
  }

  /**
   * Get pipeline health status
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const dispatcherHealth = await this.dispatcher.healthCheck();
      return {
        healthy: Object.values(dispatcherHealth).every(Boolean),
        details: {
          dispatcher: dispatcherHealth,
          options: this.options,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: String(error) },
      };
    }
  }
}
