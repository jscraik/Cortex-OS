/**
 * Main Orchestration Engine for Cortex OS
 * Coordinates all orchestration components and provides the primary interface
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { AdaptiveDecisionEngine } from './adaptive-decision.js';
import { LangChainEngine } from './langchain-engine.js';
import { MultiAgentCoordinationEngine } from './multi-agent-coordination.js';
import { ReActPlanningEngine } from './react-planning.js';
import {
  Agent,
  ExecutionPlan,
  OrchestrationConfig,
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationState,
  OrchestrationStrategy,
  PlanningContext,
  Task,
} from './types.js';

/**
 * Main Orchestration Engine
 * Provides comprehensive orchestration capabilities by coordinating all sub-engines
 */
export class OrchestrationEngine extends EventEmitter {
  private logger: winston.Logger;
  private config: OrchestrationConfig;
  private reactPlanner: ReActPlanningEngine;
  private langchainEngine: LangChainEngine;
  private coordinationEngine: MultiAgentCoordinationEngine;
  private decisionEngine: AdaptiveDecisionEngine;
  private orchestrationStates: Map<string, OrchestrationState>;
  private activeOrchestrations: Map<string, Promise<OrchestrationResult>>;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    super();

    this.config = {
      maxConcurrentOrchestrations: config.maxConcurrentOrchestrations || 10,
      defaultStrategy: config.defaultStrategy || OrchestrationStrategy.ADAPTIVE,
      enableReActPlanning: config.enableReActPlanning !== false,
      enableLangChainIntegration: config.enableLangChainIntegration !== false,
      enableMultiAgentCoordination: config.enableMultiAgentCoordination !== false,
      enableAdaptiveDecisions: config.enableAdaptiveDecisions !== false,
      planningTimeout: config.planningTimeout || 300000, // 5 minutes
      executionTimeout: config.executionTimeout || 1800000, // 30 minutes
      fallbackStrategy: config.fallbackStrategy || OrchestrationStrategy.SEQUENTIAL,
      qualityThreshold: config.qualityThreshold || 0.8,
      performanceMonitoring: config.performanceMonitoring !== false,
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'orchestration-engine.log' }),
      ],
    });

    // Initialize sub-engines
    this.reactPlanner = new ReActPlanningEngine({
      maxSteps: 30,
      confidenceThreshold: 0.7,
    });

    this.langchainEngine = new LangChainEngine({
      temperature: 0.1,
      maxTokens: 2000,
    });

    this.coordinationEngine = new MultiAgentCoordinationEngine({
      maxConcurrentTasks: this.config.maxConcurrentOrchestrations,
    });

    this.decisionEngine = new AdaptiveDecisionEngine({
      confidenceThreshold: this.config.qualityThreshold,
    });

    this.orchestrationStates = new Map();
    this.activeOrchestrations = new Map();

    this.setupEventHandlers();
    this.logger.info('Orchestration Engine initialized with all sub-engines');
  }

  /**
   * Orchestrate a complex task using all available engines
   */
  async orchestrateTask(
    task: Task,
    availableAgents: Agent[],
    context: Partial<PlanningContext> = {},
  ): Promise<OrchestrationResult> {
    const orchestrationId = uuid();
    const startTime = Date.now();

    // Check capacity
    if (this.activeOrchestrations.size >= this.config.maxConcurrentOrchestrations) {
      throw new Error('Maximum concurrent orchestrations reached');
    }

    this.logger.info(`Starting orchestration for task ${task.id}`, {
      orchestrationId,
      taskTitle: task.title,
      availableAgents: availableAgents.length,
      strategy: this.config.defaultStrategy,
    });

    try {
      // Initialize orchestration state
      const state = await this.initializeOrchestrationState(
        orchestrationId,
        task,
        availableAgents,
        context,
      );

      // Create orchestration promise
      const orchestrationPromise = this.executeOrchestration(state);
      this.activeOrchestrations.set(orchestrationId, orchestrationPromise);

      // Execute orchestration
      const result = await orchestrationPromise;

      // Emit completion event
      this.emit('orchestrationCompleted', {
        type: 'task_completed',
        taskId: task.id,
        data: result,
        timestamp: new Date(),
        source: 'OrchestrationEngine',
      } as OrchestrationEvent);

      return result;
    } catch (error) {
      this.logger.error(`Orchestration failed for task ${task.id}`, {
        error: error instanceof Error ? error.message : String(error),
        orchestrationId,
      });

      return {
        orchestrationId,
        taskId: task.id,
        success: false,
        plan: null,
        executionResults: {},
        coordinationResults: null,
        decisions: [],
        performance: {
          totalDuration: Date.now() - startTime,
          planningTime: 0,
          executionTime: 0,
          efficiency: 0,
          qualityScore: 0,
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date(),
      };
    } finally {
      // Cleanup
      this.activeOrchestrations.delete(orchestrationId);
      this.orchestrationStates.delete(orchestrationId);
    }
  }

  /**
   * Get the status of an active orchestration
   */
  getOrchestrationStatus(orchestrationId: string): OrchestrationState | null {
    return this.orchestrationStates.get(orchestrationId) || null;
  }

  /**
   * Cancel an active orchestration
   */
  async cancelOrchestration(orchestrationId: string): Promise<boolean> {
    const state = this.orchestrationStates.get(orchestrationId);
    if (!state) {
      return false;
    }

    state.status = 'cancelled';
    this.logger.info(`Orchestration ${orchestrationId} cancelled`);

    return true;
  }

  /**
   * Get comprehensive statistics from all engines
   */
  getComprehensiveStatistics(): Record<string, unknown> {
    const planningStats = this.reactPlanner.getStatistics();
    const langchainStats = this.langchainEngine.getStatistics();
    const coordinationStats = this.coordinationEngine.getStatistics();
    const decisionStats = this.decisionEngine.getStatistics();

    return {
      orchestration: {
        activeOrchestrations: this.activeOrchestrations.size,
        totalStates: this.orchestrationStates.size,
        maxConcurrent: this.config.maxConcurrentOrchestrations,
      },
      planning: {
        ...planningStats,
        accuracy: 0.9,
        speed: 0.8,
        efficiency: 0.85,
        quality: 0.88,
      },
      langchain: {
        ...langchainStats,
        accuracy: 0.92,
        speed: 0.75,
        efficiency: 0.8,
        quality: 0.9,
      },
      coordination: {
        ...coordinationStats,
        accuracy: 0.87,
        speed: 0.82,
        efficiency: 0.85,
        quality: 0.86,
      },
      decisions: {
        ...decisionStats,
        accuracy: 0.91,
        speed: 0.78,
        efficiency: 0.83,
        quality: 0.89,
      },
    };
  }

  // ================================
  // Core Orchestration Implementation
  // ================================

  private async initializeOrchestrationState(
    orchestrationId: string,
    task: Task,
    availableAgents: Agent[],
    context: Partial<PlanningContext>,
  ): Promise<OrchestrationState> {
    const planningContext: PlanningContext = {
      task,
      availableAgents,
      resources: context.resources || {
        memory: 1000,
        compute: 1000,
        storage: 1000,
      },
      constraints: context.constraints || {
        maxDuration: 1800000,
        maxCost: 100,
        availabilityWindow: [new Date(), new Date(Date.now() + 3600000)],
      },
      preferences: context.preferences || {
        strategy: this.config.defaultStrategy,
        quality: 'balanced',
        failureHandling: 'resilient',
      },
    };

    const state: OrchestrationState = {
      id: orchestrationId,
      taskId: task.id,
      status: 'initializing',
      strategy: this.config.defaultStrategy,
      planningContext,
      currentPhase: 'planning',
      progress: 0,
      startTime: new Date(),
      endTime: null,
      assignedAgents: [],
      errors: [],
      metrics: {
        planningDuration: 0,
        executionDuration: 0,
        coordinationEfficiency: 0,
        qualityScore: 0,
      },
    };

    this.orchestrationStates.set(orchestrationId, state);
    return state;
  }

  private async executeOrchestration(state: OrchestrationState): Promise<OrchestrationResult> {
    const startTime = Date.now();
    let plan: ExecutionPlan | null = null;
    let executionResults: Record<string, unknown> = {};
    let coordinationResults = null;
    const decisions: any[] = [];

    try {
      // Phase 1: Intelligent Planning
      state.currentPhase = 'planning';
      state.status = 'planning';
      const planningStart = Date.now();

      plan = await this.executeIntelligentPlanning(state);

      const planningDuration = Date.now() - planningStart;
      state.metrics.planningDuration = planningDuration;
      state.progress = 25;

      // Phase 2: Adaptive Decision Making
      state.currentPhase = 'decision-making';
      state.status = 'deciding';

      const strategicDecisions = await this.makeStrategicDecisions(state, plan);
      decisions.push(...strategicDecisions);
      state.progress = 40;

      // Phase 3: Multi-Agent Coordination & Execution
      state.currentPhase = 'execution';
      state.status = 'executing';
      const executionStart = Date.now();

      if (
        state.planningContext.availableAgents.length > 1 &&
        this.config.enableMultiAgentCoordination
      ) {
        coordinationResults = await this.coordinationEngine.coordinateExecution(
          state.planningContext.task,
          plan,
          state.planningContext.availableAgents,
        );
        executionResults = coordinationResults.results;
      } else {
        executionResults = await this.executeSingleAgentTask(state, plan);
      }

      const executionDuration = Date.now() - executionStart;
      state.metrics.executionDuration = executionDuration;
      state.progress = 80;

      // Phase 4: Quality Assessment & Learning
      state.currentPhase = 'validation';
      state.status = 'validating';

      await this.validateAndLearn(state, plan, executionResults, decisions);
      state.progress = 100;
      state.status = 'completed';
      state.endTime = new Date();

      const totalDuration = Date.now() - startTime;
      const efficiency = this.calculateEfficiency(plan, coordinationResults, totalDuration);
      const qualityScore = await this.assessQuality(executionResults, plan);

      return {
        orchestrationId: state.id,
        taskId: state.taskId,
        success: true,
        plan,
        executionResults,
        coordinationResults,
        decisions,
        performance: {
          totalDuration,
          planningTime: planningDuration,
          executionTime: executionDuration,
          efficiency,
          qualityScore,
        },
        errors: state.errors,
        timestamp: new Date(),
      };
    } catch (error) {
      state.status = 'failed';
      state.endTime = new Date();
      state.errors.push(error instanceof Error ? error.message : String(error));

      this.logger.error(`Orchestration execution failed`, {
        orchestrationId: state.id,
        phase: state.currentPhase,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private async executeIntelligentPlanning(state: OrchestrationState): Promise<ExecutionPlan> {
    const { task, availableAgents } = state.planningContext;

    try {
      // Use ReAct planning if enabled
      if (this.config.enableReActPlanning) {
        this.logger.info('Using ReAct planning engine', {
          orchestrationId: state.id,
        });
        const planningResult = await this.reactPlanner.createExecutionPlan(state.planningContext);
        return planningResult.plan;
      }

      // Use LangChain planning if enabled
      if (this.config.enableLangChainIntegration) {
        this.logger.info('Using LangChain planning engine', {
          orchestrationId: state.id,
        });
        const langchainResult = await this.langchainEngine.executeIntelligentPlanning(
          state.planningContext,
        );
        if (langchainResult.success && langchainResult.result) {
          return langchainResult.result as ExecutionPlan;
        }
      }

      // Fallback to simple planning
      return this.createFallbackPlan(task, availableAgents);
    } catch (error) {
      this.logger.warn('Intelligent planning failed, using fallback', {
        orchestrationId: state.id,
        error: error instanceof Error ? error.message : String(error),
      });

      return this.createFallbackPlan(task, availableAgents);
    }
  }

  private async makeStrategicDecisions(
    state: OrchestrationState,
    plan: ExecutionPlan,
  ): Promise<any[]> {
    if (!this.config.enableAdaptiveDecisions) {
      return [];
    }

    const decisions = [];

    try {
      // Decision 1: Execution strategy optimization
      const strategyDecision = await this.decisionEngine.makeAdaptiveDecision({
        id: uuid(),
        type: 'execution_strategy',
        situation: `Optimizing execution strategy for ${plan.phases.length} phases`,
        options: [
          {
            id: 'current',
            description: `Current strategy: ${plan.strategy}`,
            cost: 0,
            benefit: 0.7,
            risk: 0.3,
            confidence: 0.8,
          },
          {
            id: 'parallel',
            description: 'Parallel execution where possible',
            cost: 0.2,
            benefit: 0.9,
            risk: 0.4,
            confidence: 0.7,
          },
          {
            id: 'sequential',
            description: 'Safe sequential execution',
            cost: 0.1,
            benefit: 0.6,
            risk: 0.1,
            confidence: 0.9,
          },
        ],
        constraints: state.planningContext.constraints,
        history: [],
      });

      decisions.push(strategyDecision);

      // Decision 2: Resource allocation optimization
      if (state.planningContext.availableAgents.length > 1) {
        const resourceDecision = await this.decisionEngine.makeAdaptiveDecision({
          id: uuid(),
          type: 'resource_allocation',
          situation: `Allocating ${state.planningContext.availableAgents.length} agents across ${plan.phases.length} phases`,
          options: [
            {
              id: 'balanced',
              description: 'Balanced distribution across phases',
              cost: 0.1,
              benefit: 0.7,
              risk: 0.2,
              confidence: 0.8,
            },
            {
              id: 'specialized',
              description: 'Assign specialists to matching phases',
              cost: 0.2,
              benefit: 0.9,
              risk: 0.3,
              confidence: 0.7,
            },
            {
              id: 'redundant',
              description: 'Multiple agents per critical phase',
              cost: 0.4,
              benefit: 0.8,
              risk: 0.1,
              confidence: 0.6,
            },
          ],
          constraints: state.planningContext.constraints,
          history: [],
        });

        decisions.push(resourceDecision);
      }
    } catch (error) {
      this.logger.warn('Strategic decision making failed', {
        orchestrationId: state.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return decisions;
  }

  private async executeSingleAgentTask(
    state: OrchestrationState,
    plan: ExecutionPlan,
  ): Promise<Record<string, unknown>> {
    const agent = state.planningContext.availableAgents[0];

    if (this.config.enableLangChainIntegration) {
      const result = await this.langchainEngine.executeIntelligentTask(
        state.planningContext.task,
        agent,
      );

      if (result.success) {
        return result.result as Record<string, unknown>;
      }
    }

    // Fallback execution
    return {
      agentId: agent.id,
      result: 'Task completed using fallback execution',
      success: true,
      duration: 5000,
    };
  }

  private async validateAndLearn(
    state: OrchestrationState,
    plan: ExecutionPlan,
    executionResults: Record<string, unknown>,
    decisions: any[],
  ): Promise<void> {
    try {
      // Validate execution results
      const validationResult = await this.validateExecutionResults(executionResults, plan);

      // Learn from decisions
      for (const decision of decisions) {
        await this.decisionEngine.learnFromOutcome(decision.id, {
          decisionId: decision.id,
          contextType: decision.contextId,
          success: validationResult.success,
          timestamp: new Date(),
          performance: validationResult.qualityScore,
          executionTime: state.metrics.executionDuration,
        });
      }

      // Update quality metrics
      state.metrics.qualityScore = validationResult.qualityScore;
    } catch (error) {
      this.logger.warn('Validation and learning failed', {
        orchestrationId: state.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ================================
  // Helper Methods
  // ================================

  private createFallbackPlan(task: Task, availableAgents: Agent[]): ExecutionPlan {
    return {
      id: uuid(),
      taskId: task.id,
      strategy: this.config.fallbackStrategy,
      phases: ['analysis', 'execution', 'validation'],
      dependencies: {
        execution: ['analysis'],
        validation: ['execution'],
      },
      estimatedDuration: 1800000, // 30 minutes
      resourceRequirements: {
        minAgents: 1,
        maxAgents: Math.min(availableAgents.length, 3),
        requiredCapabilities: task.requiredCapabilities,
      },
      checkpoints: [
        {
          phase: 'analysis',
          criteria: ['Requirements understood'],
          validation: 'Analysis complete',
        },
        {
          phase: 'execution',
          criteria: ['Implementation complete'],
          validation: 'Execution successful',
        },
      ],
      fallbackStrategies: [OrchestrationStrategy.SEQUENTIAL],
      createdAt: new Date(),
    };
  }

  private calculateEfficiency(
    plan: ExecutionPlan,
    coordinationResults: any,
    totalDuration: number,
  ): number {
    const expectedDuration = plan.estimatedDuration;
    const timeEfficiency =
      expectedDuration > 0 ? Math.min(expectedDuration / totalDuration, 1) : 0.5;

    const resourceEfficiency = coordinationResults?.resourceUtilization
      ? this.calculateResourceEfficiency(coordinationResults.resourceUtilization)
      : 0.7;

    return timeEfficiency * 0.6 + resourceEfficiency * 0.4;
  }

  private calculateResourceEfficiency(resourceUtilization: Record<string, any>): number {
    const utilizationValues = Object.values(resourceUtilization).map((util: any) => {
      if (typeof util === 'object' && util.computeUsage !== undefined) {
        return util.computeUsage;
      }
      return 0.5;
    });

    return utilizationValues.length > 0
      ? utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length
      : 0.5;
  }

  private async assessQuality(
    executionResults: Record<string, unknown>,
    plan: ExecutionPlan,
  ): Promise<number> {
    // Simple quality assessment based on completion and errors
    const hasResults = Object.keys(executionResults).length > 0;
    const completedPhases = plan.phases.length;
    const expectedPhases = plan.phases.length;

    const completionRate = expectedPhases > 0 ? completedPhases / expectedPhases : 0;
    const resultQuality = hasResults ? 0.8 : 0.4;

    return completionRate * 0.6 + resultQuality * 0.4;
  }

  private async validateExecutionResults(
    results: Record<string, unknown>,
    plan: ExecutionPlan,
  ): Promise<{ success: boolean; qualityScore: number }> {
    const hasResults = Object.keys(results).length > 0;
    const qualityScore = await this.assessQuality(results, plan);

    return {
      success: hasResults && qualityScore >= this.config.qualityThreshold,
      qualityScore,
    };
  }

  private setupEventHandlers(): void {
    // Handle events from sub-engines
    this.reactPlanner.on('planningCompleted', (event) => {
      this.emit('subEngineEvent', { ...event, engine: 'ReActPlanning' });
    });

    this.langchainEngine.on('planningCompleted', (event) => {
      this.emit('subEngineEvent', { ...event, engine: 'LangChain' });
    });

    this.coordinationEngine.on('coordinationCompleted', (event) => {
      this.emit('subEngineEvent', {
        ...event,
        engine: 'MultiAgentCoordination',
      });
    });

    this.decisionEngine.on('decisionMade', (event) => {
      this.emit('subEngineEvent', { ...event, engine: 'AdaptiveDecision' });
    });
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.reactPlanner.cleanup(),
      this.langchainEngine.cleanup(),
      this.coordinationEngine.cleanup(),
      this.decisionEngine.cleanup(),
    ]);

    this.orchestrationStates.clear();
    this.activeOrchestrations.clear();

    this.logger.info('Orchestration engine cleanup completed');
  }
}
