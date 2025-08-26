/**
 * Dynamic Planning Engine with ReAct (Reasoning + Acting) Loop
 * Implements intelligent task planning with self-reflection and adaptive decision making
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { z } from 'zod';
import {
  Agent,
  ExecutionPlan,
  OrchestrationEvent,
  OrchestrationStrategy,
  PlanCheckpoint,
  PlanningContext,
  PlanningResult,
  PlanRisk,
  ReActConfig,
  ReActPhase,
  ReActState,
  ReActStep,
  ResourceRequirements,
  Schemas,
  Task,
} from './types.js';

interface ActionResult {
  action: string;
  description: string;
  reasoning: string;
}

/**
 * ReAct (Reasoning + Acting) Planning Engine
 * Implements the ReAct paradigm for autonomous task planning and execution
 */
export class ReActPlanningEngine extends EventEmitter {
  private logger: winston.Logger;
  private config: ReActConfig;
  private activeStates: Map<string, ReActState>;
  private planningHistory: Map<string, PlanningResult[]>;
  private learningData: Array<{
    context: string;
    decision: string;
    outcome: string;
    score: number;
    timestamp: Date;
  }>;

  constructor(config: Partial<ReActConfig> = {}) {
    super();

    this.config = {
      maxSteps: config.maxSteps || 50,
      maxThinkingTime: config.maxThinkingTime || 30000, // 30 seconds
      confidenceThreshold: config.confidenceThreshold || 0.8,
      tools: config.tools || ['search', 'calculate', 'analyze', 'validate'],
      fallbackStrategies: config.fallbackStrategies || ['sequential', 'simplified'],
      selfReflectionInterval: config.selfReflectionInterval || 5,
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'react-planning.log' }),
      ],
    });

    this.activeStates = new Map();
    this.planningHistory = new Map();
    this.learningData = [];
  }

  /**
   * Create an execution plan using ReAct loop
   */
  async createExecutionPlan(context: PlanningContext): Promise<PlanningResult> {
    const taskId = context.task.id;
    this.logger.info(`Starting ReAct planning for task ${taskId}`, {
      taskId,
      taskTitle: context.task.title,
    });

    // Initialize ReAct state
    const reactState = this.initializeReActState(taskId, context);
    this.activeStates.set(taskId, reactState);

    try {
      // Execute ReAct loop
      const plan = await this.executeReActLoop(reactState, context);

      // Create planning result
      const result: PlanningResult = {
        plan,
        alternatives: await this.generateAlternativePlans(context, plan),
        confidence: this.calculatePlanConfidence(plan, reactState),
        reasoning: this.extractReasoningFromSteps(reactState.steps),
        risks: await this.assessPlanRisks(plan, context),
      };

      // Store in history for learning
      const history = this.planningHistory.get(taskId) || [];
      history.push(result);
      this.planningHistory.set(taskId, history);

      // Learn from this planning session
      await this.learnFromPlanningSession(reactState, context, result);

      this.emit('planningCompleted', {
        type: 'plan_created',
        taskId,
        data: result,
        timestamp: new Date(),
        source: 'ReActPlanningEngine',
      } as OrchestrationEvent);

      return result;
    } catch (error) {
      this.logger.error(`ReAct planning failed for task ${taskId}`, {
        error: error instanceof Error ? error.message : String(error),
        taskId,
      });

      // Fallback to simple planning
      return this.fallbackPlanning(context);
    } finally {
      this.activeStates.delete(taskId);
    }
  }

  /**
   * Initialize ReAct state for a task
   */
  private initializeReActState(taskId: string, context: PlanningContext): ReActState {
    return {
      taskId,
      currentStep: 0,
      steps: [],
      context: {
        task: context.task,
        agents: context.availableAgents,
        resources: context.resources,
        constraints: context.constraints,
        preferences: context.preferences,
      },
      tools: this.config.tools,
      observations: [],
      reflections: [],
      actionHistory: [],
    };
  }

  /**
   * Execute the main ReAct loop
   */
  private async executeReActLoop(
    state: ReActState,
    context: PlanningContext,
  ): Promise<ExecutionPlan> {
    let plan: ExecutionPlan | null = null;

    while (state.currentStep < this.config.maxSteps && !plan) {
      // THOUGHT phase
      const thought = await this.generateThought(state, context);
      await this.addReActStep(state, ReActPhase.THOUGHT, thought);

      // ACTION phase
      const action = await this.selectAction(state, thought);
      await this.addReActStep(
        state,
        ReActPhase.ACTION,
        action.description,
        action.reasoning,
        action.action,
      );

      // Execute action and get observation
      const observation = await this.executeAction(action, state, context);
      await this.addReActStep(
        state,
        ReActPhase.OBSERVATION,
        observation.content,
        observation.reasoning,
        undefined,
        observation.content,
      );

      // REFLECTION phase (every N steps)
      if (state.currentStep % this.config.selfReflectionInterval === 0) {
        const reflection = await this.generateReflection(state);
        await this.addReActStep(state, ReActPhase.REFLECTION, reflection);
        state.reflections.push(reflection);
      }

      // Check if we have enough information to create a plan
      plan = await this.attemptPlanCreation(state, context);

      state.currentStep++;
    }

    if (!plan) {
      // If we couldn't create a plan, use fallback strategy
      plan = await this.createFallbackPlan(state, context);
    }

    return plan;
  }

  /**
   * Generate a thought based on current state
   */
  private async generateThought(state: ReActState, context: PlanningContext): Promise<string> {
    const recentSteps = state.steps.slice(-3);
    // Context for potential future use in thought generation
    const _currentContext = {
      task: context.task.description,
      availableAgents: context.availableAgents.length,
      constraints: Object.keys(context.constraints),
      recentActions: recentSteps.map((s) => s.content).join(' → '),
    };

    // Use pattern-based reasoning for thought generation
    const thoughtPatterns = [
      `Given the task "${context.task.title}", I need to consider ${context.availableAgents.length} available agents`,
      `The constraints include ${Object.keys(context.constraints).join(', ')}`,
      `Based on recent actions: ${recentSteps
        .map((s) => s.content)
        .slice(-2)
        .join(' and ')}, I should now`,
      `To achieve ${context.task.description}, the optimal strategy would be`,
      `Considering the complexity and resources, I need to plan for`,
    ];

    const thought =
      thoughtPatterns[Math.floor(Math.random() * thoughtPatterns.length)] +
      ` a ${context.preferences.strategy} approach that ${
        context.preferences.quality === 'fast'
          ? 'prioritizes speed'
          : context.preferences.quality === 'thorough'
            ? 'ensures thoroughness'
            : 'balances speed and quality'
      }.`;

    return thought;
  }

  /**
   * Select next action based on thought
   */
  private async selectAction(state: ReActState, thought: string): Promise<ActionResult> {
    const availableActions = [
      'analyze_task_complexity',
      'identify_required_capabilities',
      'estimate_resource_requirements',
      'select_orchestration_strategy',
      'create_phase_breakdown',
      'assign_agent_roles',
      'define_dependencies',
      'set_checkpoints',
      'assess_risks',
      'finalize_plan',
    ];

    // Determine next logical action based on what we've done
    const completedActions = state.actionHistory.map((a) => a.action);
    const nextAction =
      availableActions.find((action) => !completedActions.includes(action)) || 'finalize_plan';

    return {
      action: nextAction,
      description: `Execute ${nextAction.replace(/_/g, ' ')} to progress task planning`,
      reasoning: `Based on the thought "${thought.slice(0, 100)}...", the next logical step is to ${nextAction.replace(/_/g, ' ')}`,
    };
  }

  /**
   * Execute an action and return observation
   */
  private async executeAction(
    action: ActionResult,
    state: ReActState,
    context: PlanningContext,
  ): Promise<{
    content: string;
    reasoning: string;
  }> {
    const startTime = Date.now();

    try {
      let result: string;

      switch (action.action) {
        case 'analyze_task_complexity':
          result = this.analyzeTaskComplexity(context.task);
          break;
        case 'identify_required_capabilities':
          result = this.identifyRequiredCapabilities(context.task);
          break;
        case 'estimate_resource_requirements':
          result = this.estimateResourceRequirements(context.task, context.resources);
          break;
        case 'select_orchestration_strategy':
          result = this.selectOrchestrationStrategy(context);
          break;
        case 'create_phase_breakdown':
          result = this.createPhaseBreakdown(context.task);
          break;
        case 'assign_agent_roles':
          result = this.assignAgentRoles(context.availableAgents, context.task);
          break;
        case 'define_dependencies':
          result = this.defineDependencies(context.task);
          break;
        case 'set_checkpoints':
          result = this.setCheckpoints(context.task);
          break;
        case 'assess_risks':
          result = this.assessRisks(context.task, context.constraints);
          break;
        default:
          result = 'Action completed successfully';
      }

      // Record action in history
      state.actionHistory.push({
        action: action.action,
        result,
        timestamp: new Date(),
      });

      state.observations.push(result);

      return {
        content: result,
        reasoning: `Action ${action.action} completed in ${Date.now() - startTime}ms with result: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}`,
      };
    } catch (error) {
      const errorMsg = `Action ${action.action} failed: ${error instanceof Error ? error.message : String(error)}`;
      return {
        content: errorMsg,
        reasoning: `Action execution encountered an error and requires fallback strategy`,
      };
    }
  }

  /**
   * Generate reflection on current progress
   */
  private async generateReflection(state: ReActState): Promise<string> {
    const recentSteps = state.steps.slice(-this.config.selfReflectionInterval);
    const progress = state.actionHistory.length;
    const confidence =
      recentSteps.reduce((sum, step) => sum + step.confidence, 0) / recentSteps.length;

    const reflectionPoints = [
      `Progress: Completed ${progress} planning actions`,
      `Confidence: Average confidence is ${(confidence * 100).toFixed(1)}%`,
      `Strategy: Current approach is working ${confidence > 0.7 ? 'well' : 'but needs adjustment'}`,
      `Next focus: Should prioritize ${confidence < 0.6 ? 'simpler approaches' : 'detailed planning'}`,
    ];

    return reflectionPoints.join('. ') + '. Ready to continue with enhanced understanding.';
  }

  /**
   * Add a step to the ReAct sequence
   */
  private async addReActStep(
    state: ReActState,
    phase: ReActPhase,
    content: string,
    reasoning?: string,
    action?: string,
    observation?: string,
  ): Promise<void> {
    const step: ReActStep = {
      id: uuid(),
      phase,
      content,
      reasoning: reasoning || '',
      action,
      observation,
      confidence: this.calculateStepConfidence(content, state),
      timestamp: new Date(),
      agentId: 'react-planner',
    };

    state.steps.push(step);
    this.logger.debug(`Added ReAct step`, {
      taskId: state.taskId,
      phase,
      confidence: step.confidence,
    });
  }

  /**
   * Calculate confidence for a step
   */
  private calculateStepConfidence(content: string, state: ReActState): number {
    // Simple heuristic based on content length, specificity, and context
    const baseConfidence = Math.min(content.length / 200, 1) * 0.5;
    const specificityBonus = content.split(' ').length > 10 ? 0.2 : 0;
    const experienceBonus = Math.min(state.steps.length / 20, 0.3);

    return Math.min(baseConfidence + specificityBonus + experienceBonus, 1);
  }

  /**
   * Attempt to create execution plan from current state
   */
  private async attemptPlanCreation(
    state: ReActState,
    context: PlanningContext,
  ): Promise<ExecutionPlan | null> {
    // Check if we have enough information
    const requiredActions = [
      'analyze_task_complexity',
      'select_orchestration_strategy',
      'create_phase_breakdown',
    ];
    const completedActions = state.actionHistory.map((a) => a.action);
    const hasRequiredInfo = requiredActions.every((action) => completedActions.includes(action));

    if (!hasRequiredInfo || state.steps.length < 6) {
      return null;
    }

    // Create execution plan
    const plan: ExecutionPlan = {
      id: uuid(),
      taskId: context.task.id,
      strategy: this.extractStrategyFromState(state),
      phases: this.extractPhasesFromState(state),
      dependencies: this.extractDependenciesFromState(state),
      estimatedDuration: this.estimateDurationFromState(state, context),
      resourceRequirements: this.extractResourceRequirementsFromState(state, context),
      checkpoints: this.extractCheckpointsFromState(state),
      fallbackStrategies: this.config.fallbackStrategies,
      createdAt: new Date(),
    };

    // Validate plan
    const validation = await this.validatePlan(plan, context);
    if (!validation.isValid) {
      this.logger.warn(`Plan validation failed`, {
        taskId: context.task.id,
        errors: validation.errors,
      });
      return null;
    }

    return plan;
  }

  // ================================
  // Action Implementation Methods
  // ================================

  private analyzeTaskComplexity(task: Task): string {
    const factors = [
      task.description.length > 200 ? 'detailed description' : 'simple description',
      task.dependencies.length > 0 ? `${task.dependencies.length} dependencies` : 'no dependencies',
      task.requiredCapabilities.length > 3
        ? 'multiple capabilities needed'
        : 'few capabilities needed',
    ];

    return `Task complexity: ${factors.join(', ')}. Estimated complexity level: ${
      factors.length > 2 ? 'high' : factors.length > 1 ? 'medium' : 'low'
    }.`;
  }

  private identifyRequiredCapabilities(task: Task): string {
    return `Required capabilities: ${task.requiredCapabilities.join(', ') || 'basic execution'}. ${
      task.requiredCapabilities.length > 0
        ? 'Will need agents with specialized skills.'
        : 'Can be handled by general-purpose agents.'
    }`;
  }

  private estimateResourceRequirements(task: Task, _resources: Record<string, unknown>): string {
    const baseMemory = 100;
    const baseCompute = 50;
    const complexity = task.requiredCapabilities.length + task.dependencies.length;

    return `Resource estimate: ${baseMemory + complexity * 20}MB memory, ${baseCompute + complexity * 10}% compute. ${
      complexity > 5 ? 'High resource requirements.' : 'Moderate resource requirements.'
    }`;
  }

  private selectOrchestrationStrategy(context: PlanningContext): string {
    const { task, preferences } = context;
    const hasDependencies = task.dependencies.length > 0;
    const isComplex = task.requiredCapabilities.length > 3;

    let strategy = OrchestrationStrategy.SEQUENTIAL;

    if (preferences.strategy === OrchestrationStrategy.PARALLEL && !hasDependencies) {
      strategy = OrchestrationStrategy.PARALLEL;
    } else if (isComplex) {
      strategy = OrchestrationStrategy.HIERARCHICAL;
    } else if (preferences.quality === 'fast') {
      strategy = OrchestrationStrategy.ADAPTIVE;
    }

    return `Selected orchestration strategy: ${strategy}. Reasoning: ${
      strategy === OrchestrationStrategy.PARALLEL
        ? 'No dependencies, can parallelize'
        : strategy === OrchestrationStrategy.HIERARCHICAL
          ? 'Complex task needs hierarchy'
          : strategy === OrchestrationStrategy.ADAPTIVE
            ? 'Fast execution preferred'
            : 'Sequential execution for reliability'
    }.`;
  }

  private createPhaseBreakdown(task: Task): string {
    const phases = ['analysis', 'planning', 'execution', 'validation'];
    if (task.requiredCapabilities.includes('testing')) phases.push('testing');
    if (task.requiredCapabilities.includes('deployment')) phases.push('deployment');

    return `Phase breakdown: ${phases.join(' → ')}. Total phases: ${phases.length}.`;
  }

  private assignAgentRoles(agents: Agent[], task: Task): string {
    const roles = ['coordinator', 'executor', 'validator'];
    const assignment = agents
      .slice(0, Math.min(agents.length, roles.length))
      .map((agent, i) => `${agent.name}: ${roles[i]}`)
      .join(', ');

    return `Agent assignments: ${assignment}. ${agents.length} agents available for ${task.requiredCapabilities.length} capabilities.`;
  }

  private defineDependencies(task: Task): string {
    if (task.dependencies.length === 0) {
      return 'No external dependencies identified. Task can execute independently.';
    }

    return `Dependencies identified: ${task.dependencies.length} dependencies. Sequential execution required for dependent tasks.`;
  }

  private setCheckpoints(_task: Task): string {
    const checkpoints = ['25% completion', '50% completion', '75% completion', 'final validation'];
    return `Checkpoints defined: ${checkpoints.join(', ')}. Quality gates established for progress monitoring.`;
  }

  private assessRisks(task: Task, constraints: Record<string, unknown>): string {
    const risks = [];
    if (
      task.estimatedDuration &&
      constraints.maxDuration &&
      typeof constraints.maxDuration === 'number' &&
      task.estimatedDuration > constraints.maxDuration
    ) {
      risks.push('time constraint violation');
    }
    if (task.requiredCapabilities.length > 5) {
      risks.push('capability complexity');
    }

    return risks.length > 0
      ? `Risks identified: ${risks.join(', ')}. Mitigation strategies needed.`
      : 'Low risk assessment. Standard execution procedures apply.';
  }

  // ================================
  // Plan Extraction Methods
  // ================================

  private extractStrategyFromState(state: ReActState): OrchestrationStrategy {
    const strategyAction = state.actionHistory.find(
      (a) => a.action === 'select_orchestration_strategy',
    );
    if (strategyAction?.result.includes('parallel')) return OrchestrationStrategy.PARALLEL;
    if (strategyAction?.result.includes('hierarchical')) return OrchestrationStrategy.HIERARCHICAL;
    if (strategyAction?.result.includes('adaptive')) return OrchestrationStrategy.ADAPTIVE;
    return OrchestrationStrategy.SEQUENTIAL;
  }

  private extractPhasesFromState(state: ReActState): string[] {
    const phaseAction = state.actionHistory.find((a) => a.action === 'create_phase_breakdown');
    if (phaseAction) {
      const match = phaseAction.result.match(/breakdown: ([^.]+)/);
      if (match) {
        return match[1].split(' → ').map((p: string) => p.trim());
      }
    }
    return ['analysis', 'planning', 'execution', 'validation'];
  }

  private extractDependenciesFromState(state: ReActState): Record<string, string[]> {
    const phases = this.extractPhasesFromState(state);
    const dependencies: Record<string, string[]> = {};

    for (let i = 1; i < phases.length; i++) {
      dependencies[phases[i]] = [phases[i - 1]];
    }

    return dependencies;
  }

  private estimateDurationFromState(state: ReActState, context: PlanningContext): number {
    const phases = this.extractPhasesFromState(state);
    const baseTimePerPhase = 300000; // 5 minutes
    const complexityMultiplier = 1 + context.task.requiredCapabilities.length * 0.2;

    return phases.length * baseTimePerPhase * complexityMultiplier;
  }

  private extractResourceRequirementsFromState(
    _state: ReActState,
    context: PlanningContext,
  ): ResourceRequirements {
    return {
      minAgents: 1,
      maxAgents: Math.min(context.availableAgents.length, 5),
      requiredCapabilities: context.task.requiredCapabilities,
      memoryRequirement: 100 + context.task.requiredCapabilities.length * 20,
      computeRequirement: 50 + context.task.requiredCapabilities.length * 10,
    };
  }

  private extractCheckpointsFromState(state: ReActState): PlanCheckpoint[] {
    const phases = this.extractPhasesFromState(state);
    return phases.map((phase) => ({
      phase,
      criteria: [`${phase} completed successfully`],
      validation: `Verify ${phase} meets quality standards`,
    }));
  }

  // ================================
  // Utility Methods
  // ================================

  private async validatePlan(
    plan: ExecutionPlan,
    context: PlanningContext,
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      Schemas.ExecutionPlan.parse(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map((e) => e.message));
      }
    }

    if (plan.phases.length === 0) {
      errors.push('Plan must have at least one phase');
    }

    if (plan.estimatedDuration > context.constraints.maxDuration) {
      errors.push('Plan exceeds maximum duration constraint');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private calculatePlanConfidence(plan: ExecutionPlan, state: ReActState): number {
    const avgStepConfidence =
      state.steps.reduce((sum, step) => sum + step.confidence, 0) / state.steps.length;
    const completenessScore = Math.min(state.actionHistory.length / 8, 1);
    const validationScore = plan.phases.length > 0 ? 1 : 0;

    return avgStepConfidence * 0.5 + completenessScore * 0.3 + validationScore * 0.2;
  }

  private extractReasoningFromSteps(steps: ReActStep[]): string {
    const thoughtSteps = steps.filter((s) => s.phase === ReActPhase.THOUGHT);
    return thoughtSteps.map((s) => s.content).join(' → ');
  }

  private async generateAlternativePlans(
    context: PlanningContext,
    mainPlan: ExecutionPlan,
  ): Promise<ExecutionPlan[]> {
    // Generate simplified alternatives
    const alternatives: ExecutionPlan[] = [];

    // Sequential alternative
    if (mainPlan.strategy !== OrchestrationStrategy.SEQUENTIAL) {
      alternatives.push({
        ...mainPlan,
        id: uuid(),
        strategy: OrchestrationStrategy.SEQUENTIAL,
        estimatedDuration: mainPlan.estimatedDuration * 1.2,
      });
    }

    // Simplified alternative
    alternatives.push({
      ...mainPlan,
      id: uuid(),
      phases: ['execution', 'validation'],
      estimatedDuration: mainPlan.estimatedDuration * 0.7,
    });

    return alternatives;
  }

  private async assessPlanRisks(
    plan: ExecutionPlan,
    context: PlanningContext,
  ): Promise<PlanRisk[]> {
    const risks = [];

    if (plan.estimatedDuration > context.constraints.maxDuration * 0.9) {
      risks.push({
        description: 'Plan duration approaches maximum allowed time',
        probability: 0.7,
        impact: 0.8,
        mitigation: 'Consider parallel execution or phase reduction',
      });
    }

    if (plan.resourceRequirements.maxAgents > context.availableAgents.length) {
      risks.push({
        description: 'Insufficient agents for optimal execution',
        probability: 0.9,
        impact: 0.6,
        mitigation: 'Reduce parallelism or extend timeline',
      });
    }

    return risks;
  }

  private async learnFromPlanningSession(
    state: ReActState,
    context: PlanningContext,
    result: PlanningResult,
  ): Promise<void> {
    this.learningData.push({
      context: JSON.stringify({
        taskType: context.task.requiredCapabilities,
        complexity: context.task.description.length,
        resources: Object.keys(context.resources).length,
      }),
      decision: result.plan.strategy,
      outcome: 'planned', // This would be updated after execution
      score: result.confidence,
      timestamp: new Date(),
    });

    // Keep only recent learning data
    if (this.learningData.length > 1000) {
      this.learningData = this.learningData.slice(-1000);
    }
  }

  private async createFallbackPlan(
    state: ReActState,
    context: PlanningContext,
  ): Promise<ExecutionPlan> {
    this.logger.warn(`Creating fallback plan for task ${context.task.id}`);

    return {
      id: uuid(),
      taskId: context.task.id,
      strategy: OrchestrationStrategy.SEQUENTIAL,
      phases: ['execution', 'validation'],
      dependencies: { validation: ['execution'] },
      estimatedDuration: 600000, // 10 minutes
      resourceRequirements: {
        minAgents: 1,
        maxAgents: 2,
        requiredCapabilities: context.task.requiredCapabilities,
      },
      checkpoints: [
        {
          phase: 'execution',
          criteria: ['Basic execution completed'],
          validation: 'Verify minimum requirements met',
        },
      ],
      fallbackStrategies: [],
      createdAt: new Date(),
    };
  }

  private async fallbackPlanning(context: PlanningContext): Promise<PlanningResult> {
    const plan = await this.createFallbackPlan({} as ReActState, context);

    return {
      plan,
      alternatives: [],
      confidence: 0.5,
      reasoning: 'Fallback planning due to ReAct loop failure',
      risks: [
        {
          description: 'Using simplified fallback plan',
          probability: 1.0,
          impact: 0.3,
          mitigation: 'Monitor execution closely and be ready to adapt',
        },
      ],
    };
  }

  /**
   * Get planning statistics
   */
  getStatistics(): {
    activePlanningSessions: number;
    totalPlansCreated: number;
    averageConfidence: number;
    learningDataPoints: number;
  } {
    const totalPlans = Array.from(this.planningHistory.values()).flat().length;
    const avgConfidence =
      totalPlans > 0
        ? Array.from(this.planningHistory.values())
            .flat()
            .reduce((sum, plan) => sum + plan.confidence, 0) / totalPlans
        : 0;

    return {
      activePlanningSessions: this.activeStates.size,
      totalPlansCreated: totalPlans,
      averageConfidence: avgConfidence,
      learningDataPoints: this.learningData.length,
    };
  }

  /**
   * Clean up completed planning sessions
   */
  async cleanup(): Promise<void> {
    this.activeStates.clear();

    // Keep only recent history
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    for (const [taskId, history] of this.planningHistory.entries()) {
      const recentHistory = history.filter((h) => h.plan.createdAt > cutoffDate);
      if (recentHistory.length === 0) {
        this.planningHistory.delete(taskId);
      } else {
        this.planningHistory.set(taskId, recentHistory);
      }
    }

    this.logger.info('ReAct planning engine cleanup completed');
  }
}
