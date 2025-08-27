/**
 * Enhanced A2A Message Router with MLX-First Intelligence
 * Uses semantic understanding and intelligent routing for agent communication
 */

import { MLXFirstModelProvider } from '../../orchestration/src/providers/mlx-first-provider.js';

// Define types locally for now
export interface Agent {
  id: string;
  capabilities: string[];
  currentLoad: number;
}

export interface Message {
  id: string;
  content: string;
  type: 'request' | 'response' | 'notification';
  sender: string;
  timestamp: number;
  priority?: number;
}

export interface IntelligentRoutingConfig {
  enableSemanticRouting: boolean;
  enablePriorityScoring: boolean;
  enableContextAwareness: boolean;
  fallbackToRulesBased: boolean;
}

export interface RoutingDecision {
  targetAgent: Agent;
  priority: number;
  confidence: number;
  reasoning: string;
  provider: 'mlx' | 'ollama' | 'rules';
}

export class IntelligentA2ARouter {
  private readonly modelProvider: MLXFirstModelProvider;
  private readonly config: IntelligentRoutingConfig;
  private readonly agentCapabilities = new Map<string, string[]>();
  private readonly routingHistory: Array<{ message: Message; decision: RoutingDecision }> = [];

  constructor(config: IntelligentRoutingConfig) {
    this.modelProvider = new MLXFirstModelProvider();
    this.config = config;
  }

  /**
   * Intelligently route messages using MLX-first semantic understanding
   */
  async routeMessage(message: Message, availableAgents: Agent[]): Promise<RoutingDecision> {
    if (!this.config.enableSemanticRouting) {
      return this.fallbackRouting(message, availableAgents);
    }

    try {
      // Step 1: Generate message embedding for semantic similarity
      const messageEmbedding = await this.modelProvider.embed({
        texts: [this.extractMessageContent(message)],
      });

      // Step 2: Score agent capabilities using MLX reasoning
      const agentScores = await this.scoreAgentCompatibility(
        message,
        availableAgents,
        messageEmbedding.embeddings[0],
      );

      // Step 3: Use MLX reasoning for final routing decision
      const decision = await this.makeRoutingDecision(message, agentScores);

      // Step 4: Learn from routing for future improvements
      this.recordRoutingDecision(message, decision);

      return decision;
    } catch (error) {
      console.warn('MLX routing failed, falling back to rules-based:', error);
      return this.fallbackRouting(message, availableAgents);
    }
  }

  /**
   * Score agent compatibility using MLX reasoning
   */
  private async scoreAgentCompatibility(
    message: Message,
    agents: Agent[],
    messageEmbedding: number[],
  ): Promise<Array<{ agent: Agent; score: number; reasoning: string }>> {
    const scores: Array<{ agent: Agent; score: number; reasoning: string }> = [];

    for (const agent of agents) {
      try {
        // Get agent capabilities embedding
        const capabilities = this.agentCapabilities.get(agent.id) || [];
        const capabilityText = capabilities.join(', ');

        if (capabilityText) {
          const agentEmbedding = await this.modelProvider.embed({
            texts: [capabilityText],
          });

          // Calculate semantic similarity
          const similarity = this.cosineSimilarity(messageEmbedding, agentEmbedding.embeddings[0]);

          // Use MLX reasoning to determine compatibility
          const reasoning = await this.modelProvider.generate('quickReasoning', {
            task: 'agent_compatibility',
            prompt: `Analyze if this agent can handle the message:
            
Message: "${this.extractMessageContent(message)}"
Agent: ${agent.id}
Capabilities: ${capabilityText}
Semantic Similarity: ${similarity.toFixed(3)}

Rate compatibility (0-1) and explain reasoning:`,
            maxTokens: 100,
          });

          const compatibilityRegex = /(\d+\.?\d*)/;
          const compatibilityMatch = compatibilityRegex.exec(reasoning.content);
          const compatibilityScore = compatibilityMatch
            ? parseFloat(compatibilityMatch[1])
            : similarity;

          scores.push({
            agent,
            score: Math.max(0, Math.min(1, compatibilityScore)),
            reasoning: reasoning.content,
          });
        } else {
          // Fallback scoring for agents without capabilities
          scores.push({
            agent,
            score: 0.1,
            reasoning: 'No capabilities defined for agent',
          });
        }
      } catch (error) {
        console.warn(`Failed to score agent ${agent.id}:`, error);
        scores.push({
          agent,
          score: 0.05,
          reasoning: 'Error during scoring',
        });
      }
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Make final routing decision using MLX reasoning
   */
  private async makeRoutingDecision(
    message: Message,
    agentScores: Array<{ agent: Agent; score: number; reasoning: string }>,
  ): Promise<RoutingDecision> {
    const topAgents = agentScores.slice(0, 3); // Consider top 3 candidates

    const decisionPrompt = `Make a routing decision for this message:

Message: "${this.extractMessageContent(message)}"
Priority: ${message.priority || 'normal'}

Top Agent Candidates:
${topAgents.map((a, i) => `${i + 1}. ${a.agent.id} (score: ${a.score.toFixed(3)}) - ${a.reasoning}`).join('\n')}

Consider:
- Message urgency and priority
- Agent current load
- Task complexity
- Context awareness

Choose the best agent and explain your decision. Format: AGENT_ID|PRIORITY|CONFIDENCE|REASONING`;

    try {
      const decision = await this.modelProvider.generate('quickReasoning', {
        task: 'routing_decision',
        prompt: decisionPrompt,
        maxTokens: 150,
      });

      const parts = decision.content.split('|');
      if (parts.length >= 4) {
        const selectedAgent =
          topAgents.find((a) => a.agent.id === parts[0].trim())?.agent || topAgents[0].agent;

        return {
          targetAgent: selectedAgent,
          priority: parseFloat(parts[1]) || 5,
          confidence: parseFloat(parts[2]) || 0.5,
          reasoning: parts[3] || 'MLX routing decision',
          provider: decision.provider,
        };
      }
    } catch (error) {
      console.warn('MLX decision making failed:', error);
    }

    // Fallback to highest scoring agent
    const best = topAgents[0];
    return {
      targetAgent: best.agent,
      priority: 5,
      confidence: best.score,
      reasoning: best.reasoning,
      provider: 'mlx',
    };
  }

  /**
   * Register agent capabilities for semantic matching
   */
  registerAgentCapabilities(agentId: string, capabilities: string[]) {
    this.agentCapabilities.set(agentId, capabilities);
  }

  /**
   * Intelligent message prioritization using MLX
   */
  async prioritizeMessages(messages: Message[]): Promise<Message[]> {
    if (!this.config.enablePriorityScoring || messages.length <= 1) {
      return messages;
    }

    try {
      // Use MLX reranking for message prioritization
      const messageTexts = messages.map((m) => this.extractMessageContent(m));
      const priorityQuery = 'urgent important high-priority critical immediate action required';

      const { scores } = await this.modelProvider.rerank(priorityQuery, messageTexts);

      // Combine with existing priorities
      const prioritizedMessages = messages
        .map((message, index) => ({
          message,
          combinedScore: (message.priority || 5) + scores[index] * 10,
        }))
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .map((item) => item.message);

      return prioritizedMessages;
    } catch (error) {
      console.warn('MLX prioritization failed, using default order:', error);
      return messages.sort((a, b) => (b.priority || 5) - (a.priority || 5));
    }
  }

  /**
   * Context-aware message batching
   */
  async batchRelatedMessages(messages: Message[]): Promise<Message[][]> {
    if (!this.config.enableContextAwareness || messages.length <= 1) {
      return messages.map((m) => [m]);
    }

    try {
      // Generate embeddings for all messages
      const messageTexts = messages.map((m) => this.extractMessageContent(m));
      const embeddings = await this.modelProvider.embed({ texts: messageTexts });

      // Group similar messages using clustering
      const batches: Message[][] = [];
      const processed = new Set<number>();
      const similarityThreshold = 0.7;

      for (let i = 0; i < messages.length; i++) {
        if (processed.has(i)) continue;

        const batch = [messages[i]];
        processed.add(i);

        for (let j = i + 1; j < messages.length; j++) {
          if (processed.has(j)) continue;

          const similarity = this.cosineSimilarity(
            embeddings.embeddings[i],
            embeddings.embeddings[j],
          );

          if (similarity > similarityThreshold) {
            batch.push(messages[j]);
            processed.add(j);
          }
        }

        batches.push(batch);
      }

      return batches;
    } catch (error) {
      console.warn('MLX batching failed, using individual messages:', error);
      return messages.map((m) => [m]);
    }
  }

  /**
   * Fallback rules-based routing
   */
  private fallbackRouting(message: Message, agents: Agent[]): RoutingDecision {
    // Simple rules-based routing
    const defaultAgent = agents.find((a) => a.capabilities?.includes('general')) || agents[0];

    return {
      targetAgent: defaultAgent,
      priority: message.priority || 5,
      confidence: 0.3,
      reasoning: 'Rules-based fallback routing',
      provider: 'rules',
    };
  }

  /**
   * Helper methods
   */
  private extractMessageContent(message: Message): string {
    // Since content is defined as string in our Message interface
    return message.content;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private recordRoutingDecision(message: Message, decision: RoutingDecision) {
    this.routingHistory.push({ message, decision });

    // Keep only recent history
    if (this.routingHistory.length > 1000) {
      this.routingHistory.splice(0, 500);
    }
  }

  /**
   * Analytics and insights
   */
  getRoutingAnalytics() {
    const total = this.routingHistory.length;
    if (total === 0) {
      return {
        totalDecisions: 0,
        providerBreakdown: { mlx: 0, ollama: 0, rules: 0 },
        averageConfidence: 0,
        mlxSuccessRate: 0,
      };
    }
    const mlxDecisions = this.routingHistory.filter((h) => h.decision.provider === 'mlx').length;
    const ollamaDecisions = this.routingHistory.filter(
      (h) => h.decision.provider === 'ollama',
    ).length;
    const rulesDecisions = this.routingHistory.filter(
      (h) => h.decision.provider === 'rules',
    ).length;

    const avgConfidence =
      this.routingHistory.reduce((sum, h) => sum + h.decision.confidence, 0) / total;

    return {
      totalDecisions: total,
      providerBreakdown: {
        mlx: mlxDecisions,
        ollama: ollamaDecisions,
        rules: rulesDecisions,
      },
      averageConfidence: avgConfidence,
      mlxSuccessRate: mlxDecisions / total,
    };
  }
}
