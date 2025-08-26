/**
 * @file Enhanced RAG Pipeline
 * @description Enhanced RAG Pipeline with MLX embeddings and reranking integration
 * @author Cortex OS Team
 * @version 1.0.0
 */

import type { Subgraph, TenantCtx, VectorHit } from '@cortex-os/memory';
import { MemoryService } from '@cortex-os/memory';
import { RagPipeline, BuildContextInput } from './RagPipeline.js';
import {
  MLXEmbeddingsBridge,
  EmbeddingResult,
} from '../orchestration/src/bridges/mlx-embeddings-bridge.js';
import {
  MLXRerankerBridge,
  RankingResult,
  Candidate,
} from '../orchestration/src/bridges/mlx-reranker-bridge.js';
import { performance } from 'perf_hooks';
import { z } from 'zod';

// Enhanced input schema
const EnhancedBuildContextInputSchema = z.object({
  ctx: z.any(), // TenantCtx type
  query: z.string(),
  topK: z.number().positive().optional(),
  kgDepth: z.number().positive().optional(),
  tokenBudget: z.number().positive().optional(),
  embeddingModel: z.string().optional(),
  rerankingModel: z.string().optional(),
  qualityMode: z.enum(['speed', 'accuracy', 'balanced']).optional(),
  enableReranking: z.boolean().default(true),
  rerankingTopK: z.number().positive().optional(),
  domain: z.string().optional(),
  timeout: z.number().positive().optional(),
});

export type EnhancedBuildContextInput = z.infer<typeof EnhancedBuildContextInputSchema>;

export interface EnhancedContextResult {
  context: string;
  citations: Array<{
    id: string;
    uri?: string;
    score: number;
    originalScore?: number;
    rank: number;
    reranked: boolean;
  }>;
  metadata: {
    totalRetrieved: number;
    reranked: boolean;
    embeddingModel: string;
    rerankingModel?: string;
    processingTimeMs: number;
    cacheHitRate: number;
    qualityScore?: number;
    retrievalMetrics: {
      embeddingTimeMs: number;
      searchTimeMs: number;
      rerankingTimeMs?: number;
      kgAugmentationTimeMs: number;
    };
  };
}

interface AugmentedHit {
  hit: VectorHit;
  kg?: Subgraph;
  reranked?: boolean;
  originalScore?: number;
  rerankScore?: number;
}

/**
 * Enhanced RAG Pipeline
 *
 * Extends the base RAG pipeline with MLX embeddings and reranking capabilities,
 * providing improved retrieval quality and performance optimization.
 */
export class EnhancedRagPipeline extends RagPipeline {
  private embeddingsBridge?: MLXEmbeddingsBridge;
  private rerankerBridge?: MLXRerankerBridge;
  private fallbackToBase: boolean;

  private metrics = {
    totalRequests: 0,
    enhancedRequests: 0,
    fallbackRequests: 0,
    averageRetrievalTime: 0,
    averageRerankingTime: 0,
    averageQualityScore: 0,
  };

  constructor(
    memory: MemoryService,
    embeddingsBridge?: MLXEmbeddingsBridge,
    rerankerBridge?: MLXRerankerBridge,
    options?: {
      fallbackToBase?: boolean;
      defaultEmbeddingModel?: string;
      defaultRerankingModel?: string;
    },
  ) {
    super(memory);

    this.embeddingsBridge = embeddingsBridge;
    this.rerankerBridge = rerankerBridge;
    this.fallbackToBase = options?.fallbackToBase ?? true;

    this.setupEventHandlers();
  }

  /**
   * Build enhanced prompt context with MLX embeddings and reranking
   */
  async buildPromptContext(input: EnhancedBuildContextInput): Promise<EnhancedContextResult> {
    const validatedInput = EnhancedBuildContextInputSchema.parse(input);
    const startTime = performance.now();

    this.metrics.totalRequests++;

    try {
      // Try enhanced pipeline first
      if (this.embeddingsBridge) {
        return await this.buildEnhancedContext(validatedInput, startTime);
      } else if (this.fallbackToBase) {
        // Fallback to base pipeline
        return await this.buildFallbackContext(validatedInput, startTime);
      } else {
        throw new Error('No embeddings bridge available and fallback disabled');
      }
    } catch (error) {
      if (this.fallbackToBase) {
        console.warn('Enhanced pipeline failed, falling back to base:', error);
        this.metrics.fallbackRequests++;
        return await this.buildFallbackContext(validatedInput, startTime);
      }
      throw error;
    }
  }

  /**
   * Build context using enhanced MLX pipeline
   */
  private async buildEnhancedContext(
    input: EnhancedBuildContextInput,
    startTime: number,
  ): Promise<EnhancedContextResult> {
    this.metrics.enhancedRequests++;

    const retrievalMetrics = {
      embeddingTimeMs: 0,
      searchTimeMs: 0,
      rerankingTimeMs: 0,
      kgAugmentationTimeMs: 0,
    };

    // 1. Generate query embedding with MLX
    const embeddingStart = performance.now();
    const embeddingResult = await this.embeddingsBridge!.getEmbedding({
      text: input.query,
      model: input.embeddingModel,
      timeout: input.timeout,
    });
    retrievalMetrics.embeddingTimeMs = performance.now() - embeddingStart;

    // 2. Retrieve initial candidates (get more for reranking)
    const searchStart = performance.now();
    const initialTopK = input.enableReranking
      ? Math.max(input.topK || 6, (input.rerankingTopK || input.topK || 6) * 2)
      : input.topK || 6;

    const hits = await this.memory.search(input.ctx, {
      queryEmbedding: embeddingResult.embedding,
      topK: initialTopK,
    });
    retrievalMetrics.searchTimeMs = performance.now() - searchStart;

    // 3. Augment with knowledge graph
    const kgStart = performance.now();
    const augmented = await Promise.all(hits.map((h) => this.augmentWithKG(h, input.kgDepth ?? 2)));
    retrievalMetrics.kgAugmentationTimeMs = performance.now() - kgStart;

    // 4. Rerank results if enabled
    let finalResults: AugmentedHit[] = augmented.map((item) => ({
      ...item,
      reranked: false,
      originalScore: item.hit.score,
    }));

    let qualityScore: number | undefined;
    let rerankingModel: string | undefined;

    if (input.enableReranking && this.rerankerBridge && augmented.length > 1) {
      const rerankingStart = performance.now();

      try {
        const candidates: Candidate[] = augmented.map((item) => ({
          id: item.hit.id,
          text: item.hit.text,
          score: item.hit.score,
          metadata: item.hit.metadata,
        }));

        const rerankResult = await this.rerankerBridge.rerank({
          query: input.query,
          candidates,
          topK: input.rerankingTopK || input.topK || 6,
          model: input.rerankingModel,
          qualityMode: input.qualityMode || 'balanced',
          domain: input.domain,
          timeout: input.timeout,
        });

        // Map reranked results back to augmented hits
        const rerankedMap = new Map<string, RankingResult>();
        rerankResult.results.forEach((result) => {
          rerankedMap.set(result.id, result);
        });

        finalResults = augmented
          .map((item) => {
            const reranked = rerankedMap.get(item.hit.id);
            if (reranked) {
              return {
                ...item,
                reranked: true,
                originalScore: item.hit.score,
                rerankScore: reranked.score,
                hit: {
                  ...item.hit,
                  score: reranked.score,
                },
              };
            }
            return {
              ...item,
              reranked: false,
              originalScore: item.hit.score,
            };
          })
          .filter((item) => rerankedMap.has(item.hit.id))
          .sort((a, b) => (b.rerankScore || b.hit.score) - (a.rerankScore || a.hit.score))
          .slice(0, input.topK || 6);

        qualityScore = rerankResult.qualityScore;
        rerankingModel = rerankResult.model;

        retrievalMetrics.rerankingTimeMs = performance.now() - rerankingStart;
      } catch (rerankError) {
        console.warn('Reranking failed, using original order:', rerankError);
        // Keep original results without reranking
        finalResults = finalResults.slice(0, input.topK || 6);
      }
    } else {
      // No reranking, just slice to topK
      finalResults = finalResults.slice(0, input.topK || 6);
    }

    // 5. Build enhanced context
    const { context, citations } = this.buildEnhancedContextString(
      finalResults,
      input.tokenBudget ?? 6000,
    );

    const totalProcessingTime = performance.now() - startTime;

    // Update metrics
    this.updateMetrics(
      retrievalMetrics.embeddingTimeMs +
        retrievalMetrics.searchTimeMs +
        retrievalMetrics.rerankingTimeMs,
      retrievalMetrics.rerankingTimeMs,
      qualityScore,
    );

    return {
      context,
      citations: citations.map((citation) => ({
        ...citation,
        reranked: finalResults.find((r) => r.hit.id === citation.id)?.reranked || false,
      })),
      metadata: {
        totalRetrieved: hits.length,
        reranked: input.enableReranking && !!rerankingModel,
        embeddingModel: embeddingResult.model,
        rerankingModel,
        processingTimeMs: totalProcessingTime,
        cacheHitRate: embeddingResult.cached ? 1.0 : 0.0,
        qualityScore,
        retrievalMetrics,
      },
    };
  }

  /**
   * Build context using base pipeline as fallback
   */
  private async buildFallbackContext(
    input: EnhancedBuildContextInput,
    startTime: number,
  ): Promise<EnhancedContextResult> {
    // Use base pipeline method
    const baseResult = await super.buildPromptContext({
      ctx: input.ctx,
      query: input.query,
      topK: input.topK,
      kgDepth: input.kgDepth,
      tokenBudget: input.tokenBudget,
    });

    const totalProcessingTime = performance.now() - startTime;

    // Convert base result to enhanced format
    return {
      context: baseResult.context,
      citations: baseResult.citations.map((citation) => ({
        ...citation,
        rank: 0, // Base pipeline doesn't provide ranking
        reranked: false,
      })),
      metadata: {
        totalRetrieved: baseResult.citations.length,
        reranked: false,
        embeddingModel: 'base-pipeline',
        processingTimeMs: totalProcessingTime,
        cacheHitRate: 0,
        retrievalMetrics: {
          embeddingTimeMs: 0,
          searchTimeMs: totalProcessingTime,
          kgAugmentationTimeMs: 0,
        },
      },
    };
  }

  /**
   * Build enhanced context string from augmented hits
   */
  private buildEnhancedContextString(
    items: AugmentedHit[],
    budget: number,
  ): {
    context: string;
    citations: Array<{
      id: string;
      uri?: string;
      score: number;
      originalScore?: number;
      rank: number;
    }>;
  } {
    const parts: string[] = [];
    const citations: Array<{
      id: string;
      uri?: string;
      score: number;
      originalScore?: number;
      rank: number;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const score = item.rerankScore || item.hit.score;
      const rank = i + 1;

      // Add chunk header with enhanced metadata
      const chunkHeader = `# Chunk:${item.hit.id} score=${score.toFixed(3)}${
        item.reranked ? ` (reranked from ${item.originalScore?.toFixed(3)})` : ''
      } rank=${rank}`;

      parts.push(chunkHeader, item.hit.text);

      // Add KG information if available
      if (item.kg) {
        parts.push(
          `## KG neighbors (${item.kg.nodes.length} nodes, ${item.kg.rels.length} rels)`,
          JSON.stringify(item.kg),
        );
      }

      citations.push({
        id: item.hit.id,
        uri: item.hit.sourceURI,
        score,
        originalScore: item.originalScore,
        rank,
      });
    }

    // Build context within budget
    let acc = '';
    for (const part of parts) {
      if (acc.length + part.length + 2 > budget) break;
      acc += part + '\n\n';
    }

    return {
      context: acc.trim(),
      citations,
    };
  }

  /**
   * Stream enhanced context building with progressive results
   */
  async *buildPromptContextStreaming(
    input: EnhancedBuildContextInput,
  ): AsyncIterator<Partial<EnhancedContextResult> & { progress: number; isComplete: boolean }> {
    const validatedInput = EnhancedBuildContextInputSchema.parse(input);
    const startTime = performance.now();

    try {
      // Start with embedding
      yield { progress: 0.1, isComplete: false };

      const embeddingResult = await this.embeddingsBridge!.getEmbedding({
        text: input.query,
        model: input.embeddingModel,
        timeout: input.timeout,
      });

      yield { progress: 0.3, isComplete: false };

      // Retrieve candidates
      const hits = await this.memory.search(input.ctx, {
        queryEmbedding: embeddingResult.embedding,
        topK: Math.max(input.topK || 6, (input.rerankingTopK || input.topK || 6) * 2),
      });

      yield { progress: 0.5, isComplete: false };

      // Augment with KG
      const augmented = await Promise.all(
        hits.map((h) => this.augmentWithKG(h, input.kgDepth ?? 2)),
      );

      yield { progress: 0.7, isComplete: false };

      // If reranking is enabled, use streaming reranking
      if (input.enableReranking && this.rerankerBridge && augmented.length > 1) {
        const candidates: Candidate[] = augmented.map((item) => ({
          id: item.hit.id,
          text: item.hit.text,
          score: item.hit.score,
          metadata: item.hit.metadata,
        }));

        // Stream reranking results
        for await (const partialResult of this.rerankerBridge.rerankStreaming({
          query: input.query,
          candidates,
          topK: input.rerankingTopK || input.topK || 6,
          model: input.rerankingModel,
          qualityMode: input.qualityMode || 'balanced',
          domain: input.domain,
          timeout: input.timeout,
        })) {
          const progress = 0.7 + partialResult.progress * 0.25;

          if (partialResult.isComplete) {
            // Build final result
            const finalResult = await this.buildEnhancedContext(validatedInput, startTime);
            yield {
              ...finalResult,
              progress: 1.0,
              isComplete: true,
            };
          } else {
            // Partial results
            yield {
              progress,
              isComplete: false,
              metadata: {
                totalRetrieved: hits.length,
                reranked: true,
                embeddingModel: embeddingResult.model,
                processingTimeMs: partialResult.processingTimeMs,
                cacheHitRate: embeddingResult.cached ? 1.0 : 0.0,
                retrievalMetrics: {
                  embeddingTimeMs: 0,
                  searchTimeMs: 0,
                  rerankingTimeMs: partialResult.processingTimeMs,
                  kgAugmentationTimeMs: 0,
                },
              },
            };
          }
        }
      } else {
        // No reranking, build final result
        const finalResult = await this.buildEnhancedContext(validatedInput, startTime);
        yield {
          ...finalResult,
          progress: 1.0,
          isComplete: true,
        };
      }
    } catch (error) {
      if (this.fallbackToBase) {
        const fallbackResult = await this.buildFallbackContext(validatedInput, startTime);
        yield {
          ...fallbackResult,
          progress: 1.0,
          isComplete: true,
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Get pipeline metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      enhancementRate:
        this.metrics.totalRequests > 0
          ? this.metrics.enhancedRequests / this.metrics.totalRequests
          : 0,
      fallbackRate:
        this.metrics.totalRequests > 0
          ? this.metrics.fallbackRequests / this.metrics.totalRequests
          : 0,
    };
  }

  /**
   * Health check for enhanced pipeline
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const results = {
      embeddingsBridge: { healthy: false, details: {} },
      rerankerBridge: { healthy: false, details: {} },
      basePipeline: { healthy: true, details: {} }, // Assume base pipeline is healthy
    };

    // Check embeddings bridge
    if (this.embeddingsBridge) {
      try {
        results.embeddingsBridge = await this.embeddingsBridge.healthCheck();
      } catch (error) {
        results.embeddingsBridge = {
          healthy: false,
          details: { error: String(error) },
        };
      }
    }

    // Check reranker bridge
    if (this.rerankerBridge) {
      try {
        results.rerankerBridge = await this.rerankerBridge.healthCheck();
      } catch (error) {
        results.rerankerBridge = {
          healthy: false,
          details: { error: String(error) },
        };
      }
    }

    const healthyComponents = Object.values(results).filter((r) => r.healthy).length;
    const totalComponents = Object.keys(results).length;

    return {
      healthy: healthyComponents > 0, // At least one component should be healthy
      details: {
        components: results,
        healthyComponents,
        totalComponents,
        fallbackAvailable: this.fallbackToBase,
        metrics: this.getMetrics(),
      },
    };
  }

  // Private helper methods

  private updateMetrics(retrievalTime: number, rerankingTime: number, qualityScore?: number): void {
    const weight = 0.1; // Exponential moving average

    this.metrics.averageRetrievalTime =
      this.metrics.averageRetrievalTime * (1 - weight) + retrievalTime * weight;

    this.metrics.averageRerankingTime =
      this.metrics.averageRerankingTime * (1 - weight) + rerankingTime * weight;

    if (qualityScore !== undefined) {
      this.metrics.averageQualityScore =
        this.metrics.averageQualityScore * (1 - weight) + qualityScore * weight;
    }
  }

  private setupEventHandlers(): void {
    // Listen to bridge events for monitoring
    if (this.embeddingsBridge) {
      this.embeddingsBridge.on('error', (error) => {
        console.error('Embeddings bridge error:', error);
      });

      this.embeddingsBridge.on('metrics-update', (metrics) => {
        // Forward metrics or aggregate them
      });
    }

    if (this.rerankerBridge) {
      this.rerankerBridge.on('error', (error) => {
        console.error('Reranker bridge error:', error);
      });

      this.rerankerBridge.on('metrics-update', (metrics) => {
        // Forward metrics or aggregate them
      });
    }
  }
}
