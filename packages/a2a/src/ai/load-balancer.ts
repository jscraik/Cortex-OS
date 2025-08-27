/**
 * @file Intelligent Load Balancer
 * @description AI-enhanced load balancing for A2A message distribution
 */

import { z } from 'zod';
import { AIRequest } from './adapter.js';
import { AICapability } from './config.js';
import { AIModelManager } from './manager.js';

/**
 * Agent workload schema
 */
export const AgentWorkloadSchema = z.object({
  agentId: z.string(),
  currentLoad: z.number().min(0).max(1),
  queueSize: z.number().min(0),
  averageResponseTime: z.number().min(0),
  successRate: z.number().min(0).max(1),
  capabilities: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  lastActivity: z.date().optional(),
  maxConcurrency: z.number().min(1).default(10),
});

export type AgentWorkload = z.infer<typeof AgentWorkloadSchema>;

/**
 * Load balancing decision schema
 */
export const LoadBalancingDecisionSchema = z.object({
  selectedAgent: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  expectedLoad: z.number().min(0).max(1),
  estimatedResponseTime: z.number().min(0),
  alternativeAgents: z.array(z.string()).default([]),
  loadDistribution: z.record(z.number()).default({}),
  metadata: z.object({
    algorithm: z.enum(['ai', 'round-robin', 'least-connections', 'weighted']),
    processingTime: z.number(),
    totalAgents: z.number(),
    averageLoad: z.number(),
  }),
});

export type LoadBalancingDecision = z.infer<typeof LoadBalancingDecisionSchema>;

/**
 * Load balancing context schema
 */
export const LoadBalancingContextSchema = z.object({
  messageComplexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
  requiredCapabilities: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimatedDuration: z.number().optional(),
  maxWaitTime: z.number().default(30000),
  preferredAgents: z.array(z.string()).default([]),
  excludedAgents: z.array(z.string()).default([]),
});

export type LoadBalancingContext = z.infer<typeof LoadBalancingContextSchema>;

/**
 * Intelligent Load Balancer
 */
export class IntelligentLoadBalancer {
  private readonly aiManager: AIModelManager;
  private readonly agentWorkloads: Map<string, AgentWorkload> = new Map();
  private readonly balancingHistory: Array<{
    decision: LoadBalancingDecision;
    timestamp: Date;
    actualResponseTime?: number;
    success?: boolean;
  }> = [];

  constructor(aiManager: AIModelManager) {
    this.aiManager = aiManager;
  }

  /**
   * Select optimal agent for message processing
   */
  async selectAgent(
    agents: string[],
    context: LoadBalancingContext = {},
  ): Promise<LoadBalancingDecision> {
    const startTime = Date.now();
    const validatedContext = LoadBalancingContextSchema.parse(context);

    // Filter available agents based on context
    const eligibleAgents = this.filterEligibleAgents(agents, validatedContext);

    if (eligibleAgents.length === 0) {
      throw new Error('No eligible agents available for load balancing');
    }

    // Get AI-enhanced load balancing decision
    const adapter = await this.aiManager.getBestAdapter(AICapability.LOAD_BALANCING);

    if (adapter) {
      try {
        const aiDecision = await this.getAILoadBalancingDecision(
          eligibleAgents,
          validatedContext,
          startTime,
        );

        // Store decision in history
        this.addToHistory(aiDecision);

        return aiDecision;
      } catch (error) {
        console.warn(`AI load balancing failed, using fallback: ${error}`);
      }
    }

    // Fallback to algorithmic load balancing
    return this.getFallbackLoadBalancingDecision(eligibleAgents, validatedContext, startTime);
  }

  /**
   * Get AI-enhanced load balancing decision
   */
  private async getAILoadBalancingDecision(
    agents: string[],
    context: LoadBalancingContext,
    startTime: number,
  ): Promise<LoadBalancingDecision> {
    const adapter = await this.aiManager.getBestAdapter(AICapability.LOAD_BALANCING);
    if (!adapter) {
      throw new Error('No AI adapter available for load balancing');
    }

    const loadBalancingPrompt = this.buildLoadBalancingPrompt(agents, context);

    const request: AIRequest = {
      prompt: loadBalancingPrompt,
      capability: AICapability.LOAD_BALANCING,
      maxTokens: 1024,
      temperature: 0.1, // Low temperature for consistent decisions
    };

    const response = await adapter.generateText(request);
    const decision = this.parseLoadBalancingResponse(response.content, agents, startTime);

    return decision;
  }

  /**
   * Build load balancing prompt for AI
   */
  private buildLoadBalancingPrompt(agents: string[], context: LoadBalancingContext): string {
    const agentStats = agents
      .map((agentId) => {
        const workload = this.agentWorkloads.get(agentId);
        return `${agentId}: Load=${(workload?.currentLoad || 0).toFixed(2)}, Queue=${workload?.queueSize || 0}, Response=${workload?.averageResponseTime || 0}ms, Success=${((workload?.successRate || 1) * 100).toFixed(1)}%`;
      })
      .join('\n');

    return `Analyze agent workloads and select the optimal agent for message processing:

AVAILABLE AGENTS:
${agentStats}

MESSAGE CONTEXT:
- Complexity: ${context.messageComplexity}
- Required capabilities: ${context.requiredCapabilities.join(', ') || 'none'}
- Priority: ${context.priority}
- Estimated duration: ${context.estimatedDuration || 'unknown'}ms
- Max wait time: ${context.maxWaitTime}ms

CONSTRAINTS:
- Preferred agents: ${context.preferredAgents.join(', ') || 'none'}
- Excluded agents: ${context.excludedAgents.join(', ') || 'none'}

Consider:
1. Current load distribution and queue sizes
2. Agent response times and success rates
3. Message complexity vs agent capabilities
4. Priority and urgency requirements
5. Overall system balance and fairness

Respond with JSON:
{
  "selectedAgent": "agent_id",
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "expectedLoad": 0.0-1.0,
  "estimatedResponseTime": 1000,
  "alternativeAgents": ["agent1", "agent2"],
  "loadDistribution": {"agent1": 0.5, "agent2": 0.3}
}

JSON Response:`;
  }

  /**
   * Parse AI load balancing response
   */
  private parseLoadBalancingResponse(
    response: string,
    agents: string[],
    startTime: number,
  ): LoadBalancingDecision {
    try {
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate selected agent
      if (!agents.includes(parsed.selectedAgent)) {
        parsed.selectedAgent = agents[0];
        parsed.confidence = Math.max(0, (parsed.confidence || 0.5) - 0.3);
        parsed.reasoning = `Selected agent unavailable, fallback to ${parsed.selectedAgent}. ${parsed.reasoning || ''}`;
      }

      const processingTime = Date.now() - startTime;
      const currentLoads = agents.map((id) => this.agentWorkloads.get(id)?.currentLoad || 0);
      const averageLoad = currentLoads.reduce((sum, load) => sum + load, 0) / currentLoads.length;

      return LoadBalancingDecisionSchema.parse({
        ...parsed,
        metadata: {
          algorithm: 'ai',
          processingTime,
          totalAgents: agents.length,
          averageLoad,
        },
      });
    } catch (error) {
      throw new Error(`Failed to parse load balancing response: ${error}`);
    }
  }

  /**
   * Fallback load balancing using algorithms
   */
  private getFallbackLoadBalancingDecision(
    agents: string[],
    context: LoadBalancingContext,
    startTime: number,
  ): LoadBalancingDecision {
    let selectedAgent: string;
    let algorithm: 'round-robin' | 'least-connections' | 'weighted';

    // Choose algorithm based on context
    if (context.priority === 'urgent') {
      // Use least-connections for urgent messages
      selectedAgent = this.selectByLeastConnections(agents);
      algorithm = 'least-connections';
    } else if (context.messageComplexity === 'complex') {
      // Use weighted selection for complex messages
      selectedAgent = this.selectByWeightedLoad(agents);
      algorithm = 'weighted';
    } else {
      // Use round-robin for simple messages
      selectedAgent = this.selectByRoundRobin(agents);
      algorithm = 'round-robin';
    }

    const selectedWorkload = this.agentWorkloads.get(selectedAgent);
    const processingTime = Date.now() - startTime;
    const currentLoads = agents.map((id) => this.agentWorkloads.get(id)?.currentLoad || 0);
    const averageLoad = currentLoads.reduce((sum, load) => sum + load, 0) / currentLoads.length;

    return LoadBalancingDecisionSchema.parse({
      selectedAgent,
      confidence: 0.7,
      reasoning: `Fallback ${algorithm} selection: chosen based on ${context.priority} priority and ${context.messageComplexity} complexity`,
      expectedLoad: (selectedWorkload?.currentLoad || 0) + 0.1,
      estimatedResponseTime: selectedWorkload?.averageResponseTime || 1000,
      alternativeAgents: agents.filter((id) => id !== selectedAgent).slice(0, 2),
      loadDistribution: Object.fromEntries(
        agents.map((id) => [id, this.agentWorkloads.get(id)?.currentLoad || 0]),
      ),
      metadata: {
        algorithm,
        processingTime,
        totalAgents: agents.length,
        averageLoad,
      },
    });
  }

  /**
   * Filter agents based on context constraints
   */
  private filterEligibleAgents(agents: string[], context: LoadBalancingContext): string[] {
    let eligible = [...agents];

    // Apply exclusions
    eligible = eligible.filter((id) => !context.excludedAgents.includes(id));

    // Apply preferences (if specified, only use preferred agents)
    if (context.preferredAgents.length > 0) {
      const preferred = eligible.filter((id) => context.preferredAgents.includes(id));
      if (preferred.length > 0) {
        eligible = preferred;
      }
    }

    // Filter by capabilities
    if (context.requiredCapabilities.length > 0) {
      eligible = eligible.filter((id) => {
        const workload = this.agentWorkloads.get(id);
        if (!workload) return true; // Allow if no workload data

        return context.requiredCapabilities.every((cap) => workload.capabilities.includes(cap));
      });
    }

    // Filter by availability (not overloaded)
    eligible = eligible.filter((id) => {
      const workload = this.agentWorkloads.get(id);
      return !workload || workload.currentLoad < 0.95; // Max 95% load
    });

    return eligible;
  }

  /**
   * Least connections selection
   */
  private selectByLeastConnections(agents: string[]): string {
    let minLoad = Infinity;
    let selected = agents[0];

    for (const agentId of agents) {
      const workload = this.agentWorkloads.get(agentId);
      const load = workload ? workload.queueSize + workload.currentLoad : 0;

      if (load < minLoad) {
        minLoad = load;
        selected = agentId;
      }
    }

    return selected;
  }

  /**
   * Weighted load selection
   */
  private selectByWeightedLoad(agents: string[]): string {
    const weights = agents.map((agentId) => {
      const workload = this.agentWorkloads.get(agentId);
      if (!workload) return 1.0;

      // Calculate weight based on inverse load and success rate
      const loadFactor = 1.0 - workload.currentLoad;
      const successFactor = workload.successRate;
      const responseFactor = Math.max(0.1, 1.0 - workload.averageResponseTime / 10000);

      return loadFactor * successFactor * responseFactor;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (let i = 0; i < agents.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return agents[i];
      }
    }

    return agents[0];
  }

  /**
   * Round-robin selection
   */
  private selectByRoundRobin(agents: string[]): string {
    // Simple round-robin based on history length
    return agents[this.balancingHistory.length % agents.length];
  }

  /**
   * Update agent workload information
   */
  updateAgentWorkload(agentId: string, workload: Partial<AgentWorkload>): void {
    const existing = this.agentWorkloads.get(agentId);
    const updated = AgentWorkloadSchema.parse({
      agentId,
      currentLoad: 0,
      queueSize: 0,
      averageResponseTime: 1000,
      successRate: 1.0,
      capabilities: [],
      priority: 'medium',
      maxConcurrency: 10,
      ...existing,
      ...workload,
      lastActivity: new Date(),
    });

    this.agentWorkloads.set(agentId, updated);
  }

  /**
   * Report task completion for learning
   */
  reportTaskCompletion(agentId: string, responseTime: number, success: boolean): void {
    // Update the last decision in history if it matches
    const lastDecision = this.balancingHistory[this.balancingHistory.length - 1];
    if (lastDecision && lastDecision.decision.selectedAgent === agentId) {
      lastDecision.actualResponseTime = responseTime;
      lastDecision.success = success;
    }

    // Update agent workload statistics
    const workload = this.agentWorkloads.get(agentId);
    if (workload) {
      // Update average response time (exponential moving average)
      workload.averageResponseTime = workload.averageResponseTime * 0.8 + responseTime * 0.2;

      // Update success rate (exponential moving average)
      workload.successRate = workload.successRate * 0.9 + (success ? 1.0 : 0.0) * 0.1;

      // Reduce current load slightly
      workload.currentLoad = Math.max(0, workload.currentLoad - 0.1);
      workload.lastActivity = new Date();
    }
  }

  /**
   * Get load balancing statistics
   */
  getLoadBalancingStats(): {
    totalDecisions: number;
    averageResponseTime: number;
    successRate: number;
    agentUtilization: Record<string, number>;
    algorithmDistribution: Record<string, number>;
  } {
    const totalDecisions = this.balancingHistory.length;
    const completedDecisions = this.balancingHistory.filter(
      (h) => h.actualResponseTime !== undefined,
    );

    const averageResponseTime =
      completedDecisions.length > 0
        ? completedDecisions.reduce((sum, h) => sum + (h.actualResponseTime || 0), 0) /
          completedDecisions.length
        : 0;

    const successfulDecisions = this.balancingHistory.filter((h) => h.success === true).length;
    const successRate = totalDecisions > 0 ? successfulDecisions / totalDecisions : 0;

    const agentUtilization: Record<string, number> = {};
    const algorithmDistribution: Record<string, number> = {};

    for (const entry of this.balancingHistory) {
      const agent = entry.decision.selectedAgent;
      agentUtilization[agent] = (agentUtilization[agent] || 0) + 1;

      const algorithm = entry.decision.metadata.algorithm;
      algorithmDistribution[algorithm] = (algorithmDistribution[algorithm] || 0) + 1;
    }

    return {
      totalDecisions,
      averageResponseTime,
      successRate,
      agentUtilization,
      algorithmDistribution,
    };
  }

  /**
   * Get current agent workloads
   */
  getAgentWorkloads(): Map<string, AgentWorkload> {
    return new Map(this.agentWorkloads);
  }

  /**
   * Clear load balancing history
   */
  clearHistory(): void {
    this.balancingHistory.length = 0;
  }

  /**
   * Add decision to history
   */
  private addToHistory(decision: LoadBalancingDecision): void {
    this.balancingHistory.push({
      decision,
      timestamp: new Date(),
    });

    // Keep only last 1000 decisions
    if (this.balancingHistory.length > 1000) {
      this.balancingHistory.shift();
    }
  }
}
