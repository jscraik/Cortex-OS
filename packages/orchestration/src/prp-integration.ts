/**
 * @file apps/cortex-os/packages/orchestration/src/prp-integration.ts
 * @description Integration bridge between legacy OrchestrationEngine and new PRP neural orchestration
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status active
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { PRPOrchestrator } from '@cortex-os/prp-runner';
import type { PRPState } from '@cortex-os/kernel';
import type {
  Agent,
  ExecutionPlan,
  OrchestrationConfig,
  OrchestrationEvent,
  OrchestrationResult,
  OrchestrationState,
  PlanningContext,
  Task,
} from './types.js';
/**
 * PRP-powered Orchestration Engine
 * Replaces the multi-framework approach with unified neural orchestration
 * Maintains backward compatibility with existing OrchestrationEngine interface
 */
export class PRPOrchestrationEngine extends EventEmitter {
  private logger: winston.Logger;
  private config: OrchestrationConfig;
  private prpOrchestrator: PRPOrchestrator;
  private orchestrationStates: Map<string, OrchestrationState>;
  private activeOrchestrations: Map<string, Promise<OrchestrationResult>>;
  private neuronRegistry: Map<string, any>;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    super();

    this.config = {
      maxConcurrentOrchestrations: config.maxConcurrentOrchestrations || 10,
      defaultStrategy: config.defaultStrategy || 'neural_prp',
      enableMultiAgentCoordination: true, // Handled by neural orchestration
      enableAdaptiveDecisions: true, // Handled by cerebrum
      planningTimeout: config.planningTimeout || 300000,
      executionTimeout: config.executionTimeout || 1800000,
      fallbackStrategy: config.fallbackStrategy || 'sequential',
      qualityThreshold: config.qualityThreshold || 0.8,
      performanceMonitoring: config.performanceMonitoring !== false,
    } as OrchestrationConfig;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'prp-orchestration.log' }),
      ],
    });

    // Initialize PRP orchestrator
    this.prpOrchestrator = new PRPOrchestrator();
    this.neuronRegistry = new Map();
    
    // Register all neurons
    for (const [id, neuron] of this.neuronRegistry) {
      this.prpOrchestrator.registerNeuron(neuron);
    }

    this.orchestrationStates = new Map();
    this.activeOrchestrations = new Map();

    this.logger.info('PRP Orchestration Engine initialized with neural framework');
  }

  /**
   * Orchestrate a task using PRP neural orchestration
   * Maintains compatibility with existing OrchestrationEngine interface
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

    this.logger.info(`Starting PRP orchestration for task ${task.id}`, {
      orchestrationId,
      taskTitle: task.title,
      availableAgents: availableAgents.length,
    });

    try {
      // Convert task to PRP blueprint
      const blueprint = this.taskToPRPBlueprint(task, availableAgents, context);
      
      // Initialize orchestration state
      const state = this.initializeOrchestrationState(
        orchestrationId,
        task,
        availableAgents,
        context,
      );

      // Execute PRP cycle
      const orchestrationPromise = this.executePRPCycle(blueprint, state);
      this.activeOrchestrations.set(orchestrationId, orchestrationPromise);

      const result = await orchestrationPromise;

      // Emit completion event
      this.emit('orchestrationCompleted', {
        type: 'task_completed',
        taskId: task.id,
        data: result,
        timestamp: new Date(),
        source: 'PRPOrchestrationEngine',
      } as OrchestrationEvent);

      return result;
    } catch (error) {
      this.logger.error(`PRP orchestration failed for task ${task.id}`, {
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
    this.logger.info(`PRP orchestration ${orchestrationId} cancelled`);
    return true;
  }

  /**
   * Get comprehensive statistics from PRP orchestration
   */
  getComprehensiveStatistics(): Record<string, unknown> {
    return {
      orchestration: {
        activeOrchestrations: this.activeOrchestrations.size,
        totalStates: this.orchestrationStates.size,
        maxConcurrent: this.config.maxConcurrentOrchestrations,
        framework: 'PRP Neural Orchestration',
      },
      neurons: {
        registered: this.neuronRegistry.size,
        strategy_phase: Array.from(this.neuronRegistry.keys()).filter(id => 
          this.neuronRegistry.get(id)?.phase === 'strategy'
        ).length,
        build_phase: Array.from(this.neuronRegistry.keys()).filter(id => 
          this.neuronRegistry.get(id)?.phase === 'build'
        ).length,
        evaluation_phase: Array.from(this.neuronRegistry.keys()).filter(id => 
          this.neuronRegistry.get(id)?.phase === 'evaluation'
        ).length,
      },
      validation: {
        gates_active: 3, // strategy, build, evaluation
        quality_threshold: this.config.qualityThreshold,
        cerebrum_enabled: true,
      },
    };
  }

  // Private implementation methods
  private taskToPRPBlueprint(task: Task, agents: Agent[], context: Partial<PlanningContext>) {
    return {
      title: task.title,
      description: task.description || `Execute task: ${task.title}`,
      requirements: [
        ...task.requiredCapabilities,
        ...(context.preferences ? [`Preferred strategy: ${context.preferences.strategy}`] : []),
      ],
      context: {
        taskId: task.id,
        availableAgents: agents.map(a => ({ id: a.id, capabilities: a.capabilities })),
        constraints: context.constraints,
        resources: context.resources,
      },
    };
  }

  private initializeOrchestrationState(
    orchestrationId: string,
    task: Task,
    availableAgents: Agent[],
    context: Partial<PlanningContext>,
  ): OrchestrationState {
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
        strategy: 'neural_prp',
        quality: 'balanced',
        failureHandling: 'resilient',
      },
    };

    const state: OrchestrationState = {
      id: orchestrationId,
      taskId: task.id,
      status: 'initializing',
      strategy: 'neural_prp',
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

  private async executePRPCycle(
    blueprint: any,
    state: OrchestrationState,
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Execute PRP neural orchestration
      const prpResult: PRPState = await this.prpOrchestrator.executePRPCycle(blueprint);
      
      // Update orchestration state based on PRP results
      state.currentPhase = this.mapPRPPhaseToOrchestrationPhase(prpResult.phase);
      state.status = this.mapPRPPhaseToStatus(prpResult.phase);
      state.progress = this.calculateProgressFromPRPPhase(prpResult.phase);
      state.endTime = new Date();
      
      // Convert PRP results to OrchestrationResult format
      const plan = this.createExecutionPlanFromPRP(prpResult);
      const executionResults = this.extractExecutionResults(prpResult);
      const decisions = this.extractDecisions(prpResult);
      
      const totalDuration = Date.now() - startTime;
      const efficiency = this.calculateEfficiencyFromPRP(prpResult, totalDuration);
      const qualityScore = this.calculateQualityFromPRP(prpResult);
      
      return {
        orchestrationId: state.id,
        taskId: state.taskId,
        success: prpResult.phase === 'completed',
        plan,
        executionResults,
        coordinationResults: {
          strategy: prpResult.metadata.cerebrum.decision,
          reasoning: prpResult.metadata.cerebrum.reasoning,
          neuronOutputs: prpResult.outputs,
          validationResults: prpResult.validationResults,
        },
        decisions,
        performance: {
          totalDuration,
          planningTime: this.extractPhaseDuration(prpResult, 'strategy'),
          executionTime: this.extractPhaseDuration(prpResult, 'build'),
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
      throw error;
    }
  }

  // Helper methods for PRP to OrchestrationResult conversion
  private mapPRPPhaseToOrchestrationPhase(prpPhase: string): string {
    const mapping: Record<string, string> = {
      'strategy': 'planning',
      'build': 'execution',
      'evaluation': 'validation',
      'completed': 'completed',
      'recycled': 'failed',
    };
    return mapping[prpPhase] || 'unknown';
  }

  private mapPRPPhaseToStatus(prpPhase: string): string {
    const mapping: Record<string, string> = {
      'strategy': 'planning',
      'build': 'executing',
      'evaluation': 'validating',
      'completed': 'completed',
      'recycled': 'failed',
    };
    return mapping[prpPhase] || 'unknown';
  }

  private calculateProgressFromPRPPhase(prpPhase: string): number {
    const progressMapping: Record<string, number> = {
      'strategy': 30,
      'build': 70,
      'evaluation': 90,
      'completed': 100,
      'recycled': 0,
    };
    return progressMapping[prpPhase] || 0;
  }

  private createExecutionPlanFromPRP(prpResult: PRPState): ExecutionPlan {
    return {
      id: prpResult.id,
      taskId: prpResult.blueprint.title,
      strategy: 'neural_prp',
      phases: ['strategy', 'build', 'evaluation'],
      dependencies: {
        build: ['strategy'],
        evaluation: ['build'],
      },
      estimatedDuration: 1800000,
      resourceRequirements: {
        minAgents: 1,
        maxAgents: Object.keys(prpResult.outputs).length,
        requiredCapabilities: prpResult.blueprint.requirements,
      },
      checkpoints: [
        {
          phase: 'strategy',
          criteria: ['Product requirements defined', 'Security baseline established'],
          validation: 'Strategy phase validation passed',
        },
        {
          phase: 'build', 
          criteria: ['Implementation complete', 'Tests passing'],
          validation: 'Build phase validation passed',
        },
        {
          phase: 'evaluation',
          criteria: ['Quality gates passed', 'Cerebrum approval'],
          validation: 'Evaluation phase validation passed',
        },
      ],
      fallbackStrategies: ['sequential'],
      createdAt: new Date(prpResult.metadata.startTime),
    };
  }

  private extractExecutionResults(prpResult: PRPState): Record<string, unknown> {
    return {
      neuronOutputs: prpResult.outputs,
      validationResults: prpResult.validationResults,
      cerebralDecision: prpResult.metadata.cerebrum,
      phase: prpResult.phase,
      evidence: this.extractAllEvidence(prpResult),
    };
  }

  private extractDecisions(prpResult: PRPState): any[] {
    return [
      {
        id: prpResult.metadata.runId,
        type: 'cerebrum_decision',
        decision: prpResult.metadata.cerebrum.decision,
        reasoning: prpResult.metadata.cerebrum.reasoning,
        timestamp: new Date(),
      },
    ];
  }

  private extractAllEvidence(prpResult: PRPState): string[] {
    const evidence: string[] = [];
    
    // Extract evidence from validation results
    for (const [phase, validation] of Object.entries(prpResult.validationResults)) {
      evidence.push(...validation.evidence);
    }
    
    return evidence;
  }

  private calculateEfficiencyFromPRP(prpResult: PRPState, totalDuration: number): number {
    const successRate = prpResult.phase === 'completed' ? 1.0 : 0.0;
    const validationRate = Object.values(prpResult.validationResults)
      .reduce((sum, result) => sum + (result.passed ? 1 : 0), 0) / 
      Math.max(Object.keys(prpResult.validationResults).length, 1);
    
    return successRate * 0.6 + validationRate * 0.4;
  }

  private calculateQualityFromPRP(prpResult: PRPState): number {
    const totalBlockers = Object.values(prpResult.validationResults)
      .reduce((sum, result) => sum + result.blockers.length, 0);
    const totalMajors = Object.values(prpResult.validationResults)
      .reduce((sum, result) => sum + result.majors.length, 0);
    
    // Quality decreases with blockers and majors
    const blockerPenalty = totalBlockers * 0.2;
    const majorPenalty = totalMajors * 0.05;
    
    return Math.max(0, 1.0 - blockerPenalty - majorPenalty);
  }

  private extractPhaseDuration(prpResult: PRPState, phase: string): number {
    // Placeholder - in real implementation, track phase durations
    const estimatedDurations: Record<string, number> = {
      'strategy': 300000, // 5 minutes
      'build': 900000,    // 15 minutes  
      'evaluation': 300000, // 5 minutes
    };
    return estimatedDurations[phase] || 0;
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    this.orchestrationStates.clear();
    this.activeOrchestrations.clear();
    this.logger.info('PRP orchestration engine cleanup completed');
  }
}
