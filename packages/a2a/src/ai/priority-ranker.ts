/**
 * @file Message Priority Ranker
 * @description AI-enhanced priority ranking for A2A messages using reranking models
 */

import { z } from 'zod';
import { RerankingRequest } from './adapter.js';
import { AICapability } from './config.js';
import { AIModelManager } from './manager.js';

/**
 * Message priority schema
 */
export const MessagePrioritySchema = z.object({
  messageId: z.string(),
  content: z.string(),
  originalRank: z.number().min(0),
  aiRank: z.number().min(0),
  priorityScore: z.number().min(0).max(1),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  reasoning: z.string(),
  metadata: z.object({
    contentLength: z.number(),
    keywordMatches: z.array(z.string()).default([]),
    timestamp: z.date(),
    confidence: z.number().min(0).max(1),
  }),
});

export type MessagePriority = z.infer<typeof MessagePrioritySchema>;

/**
 * Priority ranking context schema
 */
export const PriorityContextSchema = z.object({
  urgentKeywords: z
    .array(z.string())
    .default(['urgent', 'critical', 'emergency', 'asap', 'immediate', 'breaking']),
  importantKeywords: z
    .array(z.string())
    .default(['important', 'priority', 'deadline', 'required', 'needed']),
  businessCritical: z
    .array(z.string())
    .default(['production', 'outage', 'failure', 'error', 'down']),
  timeConstraints: z
    .object({
      maxProcessingTime: z.number().default(5000),
      deadlineAware: z.boolean().default(true),
    })
    .default({}),
  agentCapabilities: z.record(z.array(z.string())).default({}),
  currentWorkloads: z.record(z.number()).default({}),
});

export type PriorityContext = z.infer<typeof PriorityContextSchema>;

/**
 * Ranking result schema
 */
export const RankingResultSchema = z.object({
  rankedMessages: z.array(MessagePrioritySchema),
  totalMessages: z.number(),
  processingTime: z.number(),
  algorithmUsed: z.enum(['ai-reranking', 'keyword-based', 'hybrid']),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    modelUsed: z.string().optional(),
    fallbackUsed: z.boolean().default(false),
    criticalCount: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    lowCount: z.number(),
  }),
});

export type RankingResult = z.infer<typeof RankingResultSchema>;

/**
 * Message Priority Ranker
 */
export class MessagePriorityRanker {
  private readonly aiManager: AIModelManager;
  private readonly rankingHistory: Array<{
    result: RankingResult;
    timestamp: Date;
    actualProcessingOrder?: string[];
    effectiveness?: number;
  }> = [];

  constructor(aiManager: AIModelManager) {
    this.aiManager = aiManager;
  }

  /**
   * Rank messages by priority using AI reranking
   */
  async rankMessages(
    messages: Array<{ id: string; content: string }>,
    context: PriorityContext = {},
  ): Promise<RankingResult> {
    const startTime = Date.now();
    const validatedContext = PriorityContextSchema.parse(context);

    if (messages.length === 0) {
      return this.createEmptyResult(startTime);
    }

    // Try AI-enhanced reranking first
    const adapter = await this.aiManager.getBestAdapter(AICapability.PRIORITY_RANKING);

    if (adapter) {
      try {
        const aiResult = await this.performAIReranking(messages, validatedContext, startTime);

        this.addToHistory(aiResult);
        return aiResult;
      } catch (error) {
        console.warn(`AI reranking failed, using fallback: ${error}`);
      }
    }

    // Fallback to keyword-based ranking
    const fallbackResult = this.performKeywordRanking(messages, validatedContext, startTime);
    this.addToHistory(fallbackResult);
    return fallbackResult;
  }

  /**
   * Perform AI-enhanced reranking
   */
  private async performAIReranking(
    messages: Array<{ id: string; content: string }>,
    context: PriorityContext,
    startTime: number,
  ): Promise<RankingResult> {
    const adapter = await this.aiManager.getBestAdapter(AICapability.PRIORITY_RANKING);
    if (!adapter) {
      throw new Error('No AI adapter available for priority ranking');
    }

    // Prepare query for reranking
    const query = this.buildRerankingQuery(context);
    const messageContents = messages.map((m) => m.content);

    const rerankingRequest: RerankingRequest = {
      query,
      items: messageContents,
      topK: messages.length,
    };

    const response = await adapter.rerank(rerankingRequest);

    // Convert reranking results to priority messages
    const rankedMessages = response.rankedItems.map((item, index) => {
      const originalMessage = messages[item.index];
      const keywordAnalysis = this.analyzeKeywords(originalMessage.content, context);

      return MessagePrioritySchema.parse({
        messageId: originalMessage.id,
        content: originalMessage.content,
        originalRank: item.index,
        aiRank: index,
        priorityScore: item.score,
        urgencyLevel: this.determineUrgencyLevel(item.score, keywordAnalysis),
        reasoning: `AI reranking score: ${item.score.toFixed(3)}. ${keywordAnalysis.reasoning}`,
        metadata: {
          contentLength: originalMessage.content.length,
          keywordMatches: keywordAnalysis.matches,
          timestamp: new Date(),
          confidence: item.score,
        },
      });
    });

    const processingTime = Date.now() - startTime;
    const counts = this.calculateUrgencyCounts(rankedMessages);

    return RankingResultSchema.parse({
      rankedMessages,
      totalMessages: messages.length,
      processingTime,
      algorithmUsed: 'ai-reranking',
      confidence: Math.min(...rankedMessages.map((m) => m.metadata.confidence)),
      metadata: {
        modelUsed: adapter.getName(),
        fallbackUsed: false,
        ...counts,
      },
    });
  }

  /**
   * Build reranking query based on context
   */
  private buildRerankingQuery(context: PriorityContext): string {
    const allKeywords = [
      ...context.urgentKeywords,
      ...context.importantKeywords,
      ...context.businessCritical,
    ];

    return `Prioritize messages based on urgency, importance, and business impact. 
Key indicators: ${allKeywords.join(', ')}. 
Rank by: 1) Critical system issues, 2) Time-sensitive requests, 3) Important business operations, 4) General communications.`;
  }

  /**
   * Perform keyword-based ranking as fallback
   */
  private performKeywordRanking(
    messages: Array<{ id: string; content: string }>,
    context: PriorityContext,
    startTime: number,
  ): RankingResult {
    const scoredMessages = messages.map((message, index) => {
      const keywordAnalysis = this.analyzeKeywords(message.content, context);
      const score = this.calculateKeywordScore(keywordAnalysis, message.content);

      return {
        message,
        originalIndex: index,
        score,
        keywordAnalysis,
      };
    });

    // Sort by score (highest first)
    scoredMessages.sort((a, b) => b.score - a.score);

    const rankedMessages = scoredMessages.map((item, newIndex) => {
      return MessagePrioritySchema.parse({
        messageId: item.message.id,
        content: item.message.content,
        originalRank: item.originalIndex,
        aiRank: newIndex,
        priorityScore: item.score,
        urgencyLevel: this.determineUrgencyLevel(item.score, item.keywordAnalysis),
        reasoning: item.keywordAnalysis.reasoning,
        metadata: {
          contentLength: item.message.content.length,
          keywordMatches: item.keywordAnalysis.matches,
          timestamp: new Date(),
          confidence: Math.min(0.8, item.score + 0.2), // Keyword-based confidence
        },
      });
    });

    const processingTime = Date.now() - startTime;
    const counts = this.calculateUrgencyCounts(rankedMessages);

    return RankingResultSchema.parse({
      rankedMessages,
      totalMessages: messages.length,
      processingTime,
      algorithmUsed: 'keyword-based',
      confidence: 0.7, // Lower confidence for keyword-only approach
      metadata: {
        modelUsed: 'keyword-algorithm',
        fallbackUsed: true,
        ...counts,
      },
    });
  }

  /**
   * Analyze keywords in message content
   */
  private analyzeKeywords(
    content: string,
    context: PriorityContext,
  ): {
    matches: string[];
    urgentMatches: number;
    importantMatches: number;
    criticalMatches: number;
    reasoning: string;
  } {
    const lowerContent = content.toLowerCase();
    const matches: string[] = [];

    let urgentMatches = 0;
    let importantMatches = 0;
    let criticalMatches = 0;

    // Check urgent keywords
    for (const keyword of context.urgentKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        urgentMatches++;
      }
    }

    // Check important keywords
    for (const keyword of context.importantKeywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        importantMatches++;
      }
    }

    // Check business critical keywords
    for (const keyword of context.businessCritical) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        criticalMatches++;
      }
    }

    const reasoning = this.buildKeywordReasoning(urgentMatches, importantMatches, criticalMatches);

    return {
      matches,
      urgentMatches,
      importantMatches,
      criticalMatches,
      reasoning,
    };
  }

  /**
   * Calculate priority score based on keyword analysis
   */
  private calculateKeywordScore(
    analysis: ReturnType<typeof this.analyzeKeywords>,
    content: string,
  ): number {
    let score = 0.1; // Base score

    // Weight different keyword types
    score += analysis.criticalMatches * 0.4; // Business critical gets highest weight
    score += analysis.urgentMatches * 0.3; // Urgent keywords
    score += analysis.importantMatches * 0.2; // Important keywords

    // Content length factor (longer messages might be more detailed/important)
    const lengthFactor = Math.min(0.1, content.length / 1000);
    score += lengthFactor;

    // Special patterns
    if (/\b(error|failed|failure|exception)\b/i.test(content)) {
      score += 0.2;
    }

    if (/\b(deadline|due|expires?)\b/i.test(content)) {
      score += 0.15;
    }

    return Math.min(1.0, score);
  }

  /**
   * Determine urgency level based on score and keyword analysis
   */
  private determineUrgencyLevel(
    score: number,
    analysis: ReturnType<typeof this.analyzeKeywords>,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Business critical keywords override score
    if (analysis.criticalMatches > 0) {
      return 'critical';
    }

    // Use score thresholds
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Build reasoning text from keyword analysis
   */
  private buildKeywordReasoning(
    urgentMatches: number,
    importantMatches: number,
    criticalMatches: number,
  ): string {
    const reasons: string[] = [];

    if (criticalMatches > 0) {
      reasons.push(`${criticalMatches} business-critical indicators`);
    }
    if (urgentMatches > 0) {
      reasons.push(`${urgentMatches} urgent keywords`);
    }
    if (importantMatches > 0) {
      reasons.push(`${importantMatches} important keywords`);
    }

    if (reasons.length === 0) {
      return 'No priority keywords detected, standard priority assigned';
    }

    return `Priority based on: ${reasons.join(', ')}`;
  }

  /**
   * Calculate urgency level distribution
   */
  private calculateUrgencyCounts(messages: MessagePriority[]): {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  } {
    const counts = { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };

    for (const message of messages) {
      switch (message.urgencyLevel) {
        case 'critical':
          counts.criticalCount++;
          break;
        case 'high':
          counts.highCount++;
          break;
        case 'medium':
          counts.mediumCount++;
          break;
        case 'low':
          counts.lowCount++;
          break;
      }
    }

    return counts;
  }

  /**
   * Create empty result for edge cases
   */
  private createEmptyResult(startTime: number): RankingResult {
    return RankingResultSchema.parse({
      rankedMessages: [],
      totalMessages: 0,
      processingTime: Date.now() - startTime,
      algorithmUsed: 'keyword-based',
      confidence: 1.0,
      metadata: {
        modelUsed: 'none',
        fallbackUsed: false,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      },
    });
  }

  /**
   * Report actual processing effectiveness for learning
   */
  reportProcessingEffectiveness(
    rankingId: string,
    actualProcessingOrder: string[],
    effectiveness: number,
  ): void {
    const entry = this.rankingHistory.find((h) =>
      h.result.rankedMessages.some((m) => m.messageId === rankingId),
    );

    if (entry) {
      entry.actualProcessingOrder = actualProcessingOrder;
      entry.effectiveness = effectiveness;
    }
  }

  /**
   * Get priority ranking statistics
   */
  getPriorityRankingStats(): {
    totalRankings: number;
    averageProcessingTime: number;
    algorithmDistribution: Record<string, number>;
    averageEffectiveness: number;
    urgencyDistribution: Record<string, number>;
  } {
    const totalRankings = this.rankingHistory.length;

    const averageProcessingTime =
      totalRankings > 0
        ? this.rankingHistory.reduce((sum, h) => sum + h.result.processingTime, 0) / totalRankings
        : 0;

    const algorithmDistribution: Record<string, number> = {};
    const urgencyDistribution: Record<string, number> = {};
    let totalEffectiveness = 0;
    let effectivenessCount = 0;

    for (const entry of this.rankingHistory) {
      const algorithm = entry.result.algorithmUsed;
      algorithmDistribution[algorithm] = (algorithmDistribution[algorithm] || 0) + 1;

      if (entry.effectiveness !== undefined) {
        totalEffectiveness += entry.effectiveness;
        effectivenessCount++;
      }

      // Count urgency levels across all messages
      urgencyDistribution.critical =
        (urgencyDistribution.critical || 0) + entry.result.metadata.criticalCount;
      urgencyDistribution.high = (urgencyDistribution.high || 0) + entry.result.metadata.highCount;
      urgencyDistribution.medium =
        (urgencyDistribution.medium || 0) + entry.result.metadata.mediumCount;
      urgencyDistribution.low = (urgencyDistribution.low || 0) + entry.result.metadata.lowCount;
    }

    return {
      totalRankings,
      averageProcessingTime,
      algorithmDistribution,
      averageEffectiveness: effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 0,
      urgencyDistribution,
    };
  }

  /**
   * Get recent rankings
   */
  getRecentRankings(limit = 10): RankingResult[] {
    return this.rankingHistory.slice(-limit).map((entry) => entry.result);
  }

  /**
   * Clear ranking history
   */
  clearHistory(): void {
    this.rankingHistory.length = 0;
  }

  /**
   * Add ranking result to history
   */
  private addToHistory(result: RankingResult): void {
    this.rankingHistory.push({
      result,
      timestamp: new Date(),
    });

    // Keep only last 500 rankings
    if (this.rankingHistory.length > 500) {
      this.rankingHistory.shift();
    }
  }
}
