/**
 * @file Intelligent Message Router
 * @description AI-enhanced routing for A2A messages using semantic analysis
 */

import { z } from 'zod';
import { AIRequest } from './adapter.js';
import { A2AAIConfig, AICapability } from './config.js';
import { AIModelManager } from './manager.js';

/**
 * Route analysis result schema
 */
export const RouteAnalysisSchema = z.object({
  targetAgent: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimatedComplexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
  suggestedTimeout: z.number().positive().optional(),
  metadata: z.record(z.any()).default({}),
});

export type RouteAnalysis = z.infer<typeof RouteAnalysisSchema>;

/**
 * Routing context schema
 */
export const RoutingContextSchema = z.object({
  availableAgents: z.array(z.string()),
  agentCapabilities: z.record(z.array(z.string())).default({}),
  agentWorkloads: z.record(z.number()).default({}),
  messageHistory: z.array(z.string()).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  constraints: z
    .object({
      maxTimeout: z.number().optional(),
      preferredAgents: z.array(z.string()).default([]),
      excludedAgents: z.array(z.string()).default([]),
    })
    .default({}),
});

export type RoutingContext = z.infer<typeof RoutingContextSchema>;

/**
 * Intelligent Message Router
 */
export class IntelligentMessageRouter {
  private readonly aiManager: AIModelManager;
  private readonly routingHistory: Map<string, RouteAnalysis[]> = new Map();

  constructor(aiManager: AIModelManager) {
    this.aiManager = aiManager;
  }

  /**
   * Analyze message and determine optimal routing
   */
  async analyzeRoute(message: string, context: RoutingContext): Promise<RouteAnalysis> {
    const validatedContext = RoutingContextSchema.parse(context);

    // Get the best adapter for semantic routing
    const adapter = await this.aiManager.getBestAdapter(AICapability.SEMANTIC_ROUTING);

    if (!adapter) {
      // Fallback to simple routing if no AI available
      return this.fallbackRouting(message, validatedContext);
    }

    try {
      // Build routing prompt
      const routingPrompt = this.buildRoutingPrompt(message, validatedContext);

      const request: AIRequest = {
        prompt: routingPrompt,
        capability: AICapability.SEMANTIC_ROUTING,
        maxTokens: 1024,
        temperature: 0.2, // Lower temperature for more consistent routing decisions
      };

      const response = await adapter.generateText(request);
      const analysis = this.parseRoutingResponse(response.content, validatedContext);

      // Store in routing history for learning
      this.addToHistory(message, analysis);

      return analysis;
    } catch (error) {
      console.warn(`AI routing failed, using fallback: ${error}`);
      return this.fallbackRouting(message, validatedContext);
    }
  }

  /**
   * Build routing analysis prompt
   */
  private buildRoutingPrompt(message: string, context: RoutingContext): string {
    const agentList = context.availableAgents.join(', ');
    const capabilities = Object.entries(context.agentCapabilities)
      .map(([agent, caps]) => `${agent}: ${caps.join(', ')}`)
      .join('\n');

    const workloads = Object.entries(context.agentWorkloads)
      .map(([agent, load]) => `${agent}: ${load}% load`)
      .join('\n');

    return `Analyze this A2A message and determine the optimal routing:

MESSAGE: "${message}"

AVAILABLE AGENTS: ${agentList}

AGENT CAPABILITIES:
${capabilities}

CURRENT WORKLOADS:
${workloads}

REQUIRED CAPABILITIES: ${context.requiredCapabilities.join(', ')}

CONSTRAINTS:
- Preferred agents: ${context.constraints.preferredAgents.join(', ') || 'none'}
- Excluded agents: ${context.constraints.excludedAgents.join(', ') || 'none'}
- Max timeout: ${context.constraints.maxTimeout || 'none'}

Provide your analysis in this exact JSON format:
{
  "targetAgent": "agent_name",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of choice",
  "priority": "low|medium|high|urgent",
  "estimatedComplexity": "simple|moderate|complex",
  "suggestedTimeout": 30000,
  "metadata": {
    "analysisTime": "timestamp",
    "alternativeAgents": ["agent1", "agent2"]
  }
}

Consider:
1. Agent capabilities vs message requirements
2. Current workload distribution
3. Message complexity and urgency
4. Historical routing success patterns
5. Constraints and preferences

JSON Response:`;
  }

  /**
   * Parse AI routing response
   */
  private parseRoutingResponse(response: string, context: RoutingContext): RouteAnalysis {
    try {
      // Extract JSON from response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and ensure target agent is available
      if (!context.availableAgents.includes(parsed.targetAgent)) {
        parsed.targetAgent = context.availableAgents[0] || 'default';
        parsed.confidence = Math.max(0, (parsed.confidence || 0.5) - 0.3);
        parsed.reasoning = `Original target unavailable, fallback to ${parsed.targetAgent}. ${parsed.reasoning || ''}`;
      }

      return RouteAnalysisSchema.parse(parsed);
    } catch (error) {
      console.warn(`Failed to parse routing response: ${error}`);
      return this.fallbackRouting('', context);
    }
  }

  /**
   * Fallback routing when AI is unavailable
   */
  private fallbackRouting(message: string, context: RoutingContext): RouteAnalysis {
    // Simple heuristic-based routing
    const availableAgents = context.availableAgents;

    if (availableAgents.length === 0) {
      throw new Error('No available agents for routing');
    }

    // Choose agent with lowest workload
    let targetAgent = availableAgents[0];
    let lowestLoad = context.agentWorkloads[targetAgent] || 0;

    for (const agent of availableAgents) {
      const load = context.agentWorkloads[agent] || 0;
      if (load < lowestLoad) {
        targetAgent = agent;
        lowestLoad = load;
      }
    }

    // Determine priority based on message keywords
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap'];
    const highKeywords = ['important', 'priority', 'needed', 'required'];

    const lowerMessage = message.toLowerCase();
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    if (urgentKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      priority = 'urgent';
    } else if (highKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      priority = 'high';
    }

    return RouteAnalysisSchema.parse({
      targetAgent,
      confidence: 0.6, // Moderate confidence for fallback routing
      reasoning: `Fallback routing: Selected ${targetAgent} with ${lowestLoad}% load`,
      priority,
      estimatedComplexity: 'moderate',
      suggestedTimeout: 30000,
      metadata: {
        fallbackUsed: true,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Add routing decision to history for pattern learning
   */
  private addToHistory(message: string, analysis: RouteAnalysis): void {
    const messageKey = this.getMessageKey(message);

    if (!this.routingHistory.has(messageKey)) {
      this.routingHistory.set(messageKey, []);
    }

    const history = this.routingHistory.get(messageKey);
    if (!history) return;

    history.push({
      ...analysis,
      metadata: {
        ...analysis.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    // Keep only last 10 entries per message pattern
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get routing history for analysis
   */
  getRoutingHistory(messagePattern?: string): Map<string, RouteAnalysis[]> {
    if (messagePattern) {
      const key = this.getMessageKey(messagePattern);
      const history = this.routingHistory.get(key);
      return history ? new Map([[key, history]]) : new Map();
    }

    return new Map(this.routingHistory);
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRoutings: number;
    agentDistribution: Record<string, number>;
    averageConfidence: number;
    priorityDistribution: Record<string, number>;
  } {
    let totalRoutings = 0;
    const agentDistribution: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    for (const [, analyses] of this.routingHistory) {
      for (const analysis of analyses) {
        totalRoutings++;
        totalConfidence += analysis.confidence;

        agentDistribution[analysis.targetAgent] =
          (agentDistribution[analysis.targetAgent] || 0) + 1;

        priorityDistribution[analysis.priority] =
          (priorityDistribution[analysis.priority] || 0) + 1;
      }
    }

    return {
      totalRoutings,
      agentDistribution,
      averageConfidence: totalRoutings > 0 ? totalConfidence / totalRoutings : 0,
      priorityDistribution,
    };
  }

  /**
   * Clear routing history
   */
  clearHistory(): void {
    this.routingHistory.clear();
  }

  /**
   * Generate message key for grouping similar messages
   */
  private getMessageKey(message: string): string {
    // Simple hash of normalized message for grouping
    const normalized = message
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Take first 50 characters as key
    return normalized.substring(0, 50);
  }
}

/**
 * Factory function to create router with AI manager
 */
export function createIntelligentRouter(aiConfig?: Partial<A2AAIConfig>): IntelligentMessageRouter {
  const aiManager = new AIModelManager(aiConfig || {});
  return new IntelligentMessageRouter(aiManager);
}
