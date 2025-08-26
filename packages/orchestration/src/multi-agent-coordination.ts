/**
 * Multi-Agent Coordination Engine for Cortex OS
 * Manages production coordination between multiple agents working on complex tasks
 * Integrates LangGraph, CrewAI, AutoGen, and A2A-SDK for real orchestration
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { AgentProtocolBridge, CrossFrameworkTaskRequest } from './agent-protocol-bridge.js';
import { AutoGenManager, AutoGenTaskRequest } from './autogen-manager.js';
import { AgentTaskPayload, PythonAgentBridge } from './bridges/python-agent-bridge.js';
import { CrewAICoordinationRequest, CrewAICoordinator } from './crewai-coordinator.js';
import { MLXAgent } from './integrations/mlx-agent.js';
import { A2AProtocol } from './protocols/a2a-protocol.js';
import {
  Agent,
  AgentCoordination,
  AgentRole,
  CoordinationResult,
  CoordinationState,
  CoordinationStrategy,
  ExecutionPlan,
  MessageProtocol,
  MultiAgentConfig,
  OrchestrationEvent,
  PhaseExecutionData,
  ResourceRequirements,
  SynchronizationPoint,
  Task,
} from './types.js';

/**
 * Multi-Agent Coordination Engine
 * Handles sophisticated coordination between multiple agents using production frameworks
 */
export class MultiAgentCoordinationEngine extends EventEmitter {
  private logger: winston.Logger;
  private config: MultiAgentConfig;
  private coordinationStates: Map<string, CoordinationState>;
  private agentCommunications: Map<string, MessageProtocol[]>;
  private synchronizationPoints: Map<string, SynchronizationPoint[]>;
  private resourceAllocations: Map<string, Map<string, ResourceRequirements>>;
  private performanceMetrics: Map<string, Record<string, unknown>>;
  private a2aProtocol: A2AProtocol;
  private mlxAgents: Map<string, MLXAgent>;
  private activeExecutions: Map<string, Promise<any>>;
  private pythonAgentBridge: PythonAgentBridge;

  // New framework coordinators
  private crewaiCoordinator: CrewAICoordinator;
  private autogenManager: AutoGenManager;
  private agentProtocolBridge: AgentProtocolBridge;

  constructor(config: Partial<MultiAgentConfig> = {}) {
    super();

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      communicationTimeout: config.communicationTimeout || 5000,
      synchronizationTimeout: config.synchronizationTimeout || 15000,
      conflictResolutionStrategy: config.conflictResolutionStrategy || 'priority-based',
      loadBalancingStrategy: config.loadBalancingStrategy || 'capability-based',
      failureRecoveryStrategy: config.failureRecoveryStrategy || 'redistribute',
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'coordination-engine.log' }),
      ],
    });

    this.coordinationStates = new Map();
    this.agentCommunications = new Map();
    this.synchronizationPoints = new Map();
    this.resourceAllocations = new Map();
    this.performanceMetrics = new Map();
    this.mlxAgents = new Map();
    this.activeExecutions = new Map();

    // Initialize A2A protocol for agent communication
    this.a2aProtocol = new A2AProtocol({
      agentId: 'coordination-engine',
      encryption: true,
      authentication: 'token',
    });

    // Initialize Python agent bridge for AI agents
    this.pythonAgentBridge = new PythonAgentBridge();

    // Initialize new framework coordinators
    this.crewaiCoordinator = new CrewAICoordinator({
      enableLogging: this.config.enablePerformanceMonitoring,
    });

    this.autogenManager = new AutoGenManager({
      enableLogging: this.config.enablePerformanceMonitoring,
      conversationMemory: true,
    });

    this.agentProtocolBridge = new AgentProtocolBridge({
      enableLogging: this.config.enablePerformanceMonitoring,
    });

    // Register framework bridges with the protocol bridge
    this.agentProtocolBridge.registerFrameworkBridge('crewai', this.crewaiCoordinator);
    this.agentProtocolBridge.registerFrameworkBridge('autogen', this.autogenManager);

    this.startPerformanceMonitoring();
  }

  /**
   * Initialize the coordination engine including Python agent bridge
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Multi-Agent Coordination Engine');

    try {
      // Initialize Python agent bridge
      await this.pythonAgentBridge.initialize();
      this.logger.info('Python agent bridge initialized successfully');
    } catch (error) {
      this.logger.warn('Failed to initialize Python agent bridge, falling back to A2A only', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  /**
   * Coordinate execution of a complex task across multiple agents
   */
  async coordinateExecution(
    task: Task,
    plan: ExecutionPlan,
    availableAgents: Agent[],
  ): Promise<CoordinationResult> {
    // Ensure the engine is initialized
    if (!this.pythonAgentBridge.getStatistics().isInitialized) {
      await this.initialize();
    }

    const coordinationId = uuid();
    const startTime = Date.now();

    this.logger.info(`Starting multi-agent coordination for task ${task.id}`, {
      coordinationId,
      taskId: task.id,
      availableAgents: availableAgents.length,
      strategy: plan.strategy,
    });

    try {
      // Validate execution plan before proceeding
      const phaseSet = new Set(plan.phases);
      const invalidDeps: Array<{ phase: string; dep: string }> = [];
      for (const [phase, deps] of Object.entries(plan.dependencies || {})) {
        for (const dep of deps) {
          if (!phaseSet.has(phase) || !phaseSet.has(dep)) {
            invalidDeps.push({ phase, dep });
          }
        }
      }
      if (invalidDeps.length > 0) {
        const msg = `Invalid execution plan: unknown phases/dependencies ${invalidDeps
          .map((d) => `${d.phase}->${d.dep}`)
          .join(', ')}`;
        this.logger.error(msg, { coordinationId, taskId: task.id });
        return {
          coordinationId,
          success: false,
          results: {},
          agentPerformance: {},
          communicationStats: {
            messagesSent: 0,
            messagesReceived: 0,
            errors: 1,
          },
          synchronizationEvents: [],
          resourceUtilization: {},
          executionTime: Date.now() - startTime,
          completedPhases: [],
          errors: [msg],
        };
      }

      // Initialize coordination state
      const coordination = await this.initializeCoordination(
        coordinationId,
        task,
        plan,
        availableAgents,
      );

      // Assign agents to phases/subtasks
      const agentAssignments = await this.assignAgentsToPhases(coordination, plan, availableAgents);

      // Set up communication channels
      await this.setupCommunicationChannels(coordinationId, agentAssignments);

      // Create synchronization points
      await this.createSynchronizationPoints(coordinationId, plan);

      // Execute coordinated workflow
      const executionResult = await this.executeCoordinatedWorkflow(coordination, agentAssignments);

      // Monitor and manage coordination
      const monitoringResult = await this.monitorCoordination(coordinationId);

      const executionTime = Date.now() - startTime;

      const result: CoordinationResult = {
        coordinationId,
        success: executionResult.success,
        results: executionResult.results,
        agentPerformance: monitoringResult.performance,
        communicationStats: monitoringResult.communication,
        synchronizationEvents: monitoringResult.synchronization,
        resourceUtilization: this.calculateResourceUtilization(coordinationId),
        executionTime,
        completedPhases: executionResult.completedPhases,
        errors: executionResult.errors || [],
      };

      this.emit('coordinationCompleted', {
        type: 'coordination_started',
        taskId: task.id,
        data: result,
        timestamp: new Date(),
        source: 'MultiAgentCoordinationEngine',
      } as OrchestrationEvent);

      return result;
    } catch (error) {
      this.logger.error(`Multi-agent coordination failed for task ${task.id}`, {
        error: error instanceof Error ? error.message : String(error),
        coordinationId,
      });

      return {
        coordinationId,
        success: false,
        results: {},
        agentPerformance: {},
        communicationStats: { messagesSent: 0, messagesReceived: 0, errors: 1 },
        synchronizationEvents: [],
        resourceUtilization: {},
        executionTime: Date.now() - startTime,
        completedPhases: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    } finally {
      await this.cleanupCoordination(coordinationId);
    }
  }

  /**
   * Initialize coordination state for multi-agent execution
   */
  private async initializeCoordination(
    coordinationId: string,
    task: Task,
    plan: ExecutionPlan,
    availableAgents: Agent[],
  ): Promise<AgentCoordination> {
    const coordination: AgentCoordination = {
      id: coordinationId,
      taskId: task.id,
      strategy: this.determineCoordinationStrategy(plan, availableAgents),
      participants: availableAgents.map((agent) => ({
        agentId: agent.id,
        role: this.assignAgentRole(agent, task),
        capabilities: agent.capabilities,
        status: 'ready',
        currentPhase: null,
        performance: {
          tasksCompleted: 0,
          averageTime: 0,
          successRate: 1.0,
          lastActivity: new Date(),
        },
      })),
      phases: plan.phases.map((phase) => ({
        id: uuid(),
        name: phase,
        status: 'pending',
        assignedAgents: [],
        dependencies: plan.dependencies[phase] || [],
        startTime: null,
        endTime: null,
        results: null,
      })),
      communicationChannels: [],
      synchronizationPoints: [],
      status: 'initialized',
      startTime: new Date(),
      endTime: null,
    };

    const state: CoordinationState = {
      coordination,
      activeAgents: new Set(availableAgents.map((a) => a.id)),
      completedPhases: new Set(),
      failedPhases: new Set(),
      pendingCommunications: [],
      resourceLocks: new Map(),
      conflictLog: [],
    };

    this.coordinationStates.set(coordinationId, state);
    return coordination;
  }

  /**
   * Assign agents to execution phases based on capabilities and load
   */
  private async assignAgentsToPhases(
    coordination: AgentCoordination,
    plan: ExecutionPlan,
    availableAgents: Agent[],
  ): Promise<Map<string, string[]>> {
    const assignments = new Map<string, string[]>();

    for (const phase of coordination.phases) {
      const suitableAgents = availableAgents.filter((agent) =>
        this.isAgentSuitableForPhase(agent, phase.name, plan),
      );

      // Select optimal agents based on load balancing strategy
      const selectedAgents = await this.selectOptimalAgents(suitableAgents, phase.name, plan);

      assignments.set(
        phase.id,
        selectedAgents.map((a) => a.id),
      );

      // Update phase assignments
      phase.assignedAgents = selectedAgents.map((a) => a.id);

      // Update participant assignments
      for (const agentId of selectedAgents.map((a) => a.id)) {
        const participant = coordination.participants.find((p) => p.agentId === agentId);
        if (participant) {
          participant.currentPhase = phase.id;
        }
      }

      this.logger.info(`Assigned ${selectedAgents.length} agents to phase ${phase.name}`, {
        coordinationId: coordination.id,
        phase: phase.name,
        agents: selectedAgents.map((a) => a.id),
      });
    }

    return assignments;
  }

  /**
   * Set up communication channels between agents
   */
  private async setupCommunicationChannels(
    coordinationId: string,
    assignments: Map<string, string[]>,
  ): Promise<void> {
    const channels: MessageProtocol[] = [];

    // Create channels between agents working on dependent phases
    for (const agentIds of assignments.values()) {
      for (let i = 0; i < agentIds.length; i++) {
        for (let j = i + 1; j < agentIds.length; j++) {
          channels.push({
            id: uuid(),
            fromAgent: agentIds[i],
            toAgent: agentIds[j],
            type: 'peer-to-peer',
            status: 'active',
            messageQueue: [],
            lastActivity: new Date(),
          });
        }
      }
    }

    // Create supervisor channels for hierarchical coordination
    const supervisorAgent = this.findSupervisorAgent(coordinationId);
    if (supervisorAgent) {
      for (const agentIds of assignments.values()) {
        for (const agentId of agentIds) {
          if (agentId !== supervisorAgent) {
            channels.push({
              id: uuid(),
              fromAgent: supervisorAgent,
              toAgent: agentId,
              type: 'supervisor-subordinate',
              status: 'active',
              messageQueue: [],
              lastActivity: new Date(),
            });
          }
        }
      }
    }

    this.agentCommunications.set(coordinationId, channels);
    this.logger.info(`Set up ${channels.length} communication channels`, {
      coordinationId,
    });
  }

  /**
   * Create synchronization points for phase coordination
   */
  private async createSynchronizationPoints(
    coordinationId: string,
    plan: ExecutionPlan,
  ): Promise<void> {
    const syncPoints: SynchronizationPoint[] = [];
    const phaseNames = plan.phases;

    // Create sync points between dependent phases
    for (const [phase, dependencies] of Object.entries(plan.dependencies)) {
      // Validate that the phase exists in the plan
      if (!phaseNames.includes(phase)) {
        throw new Error(
          `Phase '${phase}' is defined in dependencies but does not exist in the plan phases`,
        );
      }

      // Validate that all dependencies exist in the plan
      for (const dependency of dependencies) {
        if (!phaseNames.includes(dependency)) {
          throw new Error(
            `Dependency '${dependency}' for phase '${phase}' does not exist in the plan phases`,
          );
        }
      }

      if (dependencies.length > 0) {
        syncPoints.push({
          id: uuid(),
          type: 'phase-dependency',
          dependentPhase: phase,
          prerequisites: dependencies,
          status: 'pending',
          waitingAgents: [],
          completedPrerequisites: [],
          timeout: this.config.synchronizationTimeout,
          createdAt: new Date(),
        });
      }
    }

    // Create checkpoint sync points
    for (const checkpoint of plan.checkpoints || []) {
      syncPoints.push({
        id: uuid(),
        type: 'checkpoint',
        dependentPhase: checkpoint.phase,
        prerequisites: [checkpoint.phase],
        status: 'pending',
        waitingAgents: [],
        completedPrerequisites: [],
        timeout: this.config.synchronizationTimeout,
        createdAt: new Date(),
      });
    }

    this.synchronizationPoints.set(coordinationId, syncPoints);
    this.logger.info(`Created ${syncPoints.length} synchronization points`, {
      coordinationId,
    });
  }

  /**
   * Execute the coordinated workflow
   */
  private async executeCoordinatedWorkflow(
    coordination: AgentCoordination,
    assignments: Map<string, string[]>,
  ): Promise<{
    success: boolean;
    results: Record<string, unknown>;
    completedPhases: string[];
    errors?: string[];
  }> {
    const results: Record<string, unknown> = {};
    const completedPhases: string[] = [];
    const errors: string[] = [];

    try {
      // Execute phases in dependency order
      const executionOrder = this.calculateExecutionOrder(coordination.phases);

      for (const phaseGroup of executionOrder) {
        // Execute phases in parallel if they don't depend on each other
        const phasePromises = phaseGroup.map(async (phase) => {
          try {
            // Wait for synchronization if needed
            await this.waitForSynchronization(coordination.id, phase.id);

            // Execute phase with assigned agents
            const phaseResult = await this.executePhase(
              coordination.id,
              phase,
              assignments.get(phase.id) || [],
            );

            results[phase.name] = phaseResult;
            completedPhases.push(phase.name);

            // Signal completion to waiting phases
            await this.signalPhaseCompletion(coordination.id, phase.id);

            return phaseResult;
          } catch (error) {
            const errorMsg = `Phase ${phase.name} failed: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMsg);
            this.logger.error(errorMsg, { coordinationId: coordination.id });
            throw error;
          }
        });

        // Wait for all phases in this group to complete
        await Promise.all(phasePromises);
      }

      return {
        success: errors.length === 0,
        results,
        completedPhases,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        results,
        completedPhases,
        errors,
      };
    }
  }

  /**
   * Monitor coordination progress and performance
   */
  private async monitorCoordination(coordinationId: string): Promise<{
    performance: Record<string, Record<string, unknown>>;
    communication: {
      messagesSent: number;
      messagesReceived: number;
      errors: number;
    };
    synchronization: Array<{
      id: string;
      type: string;
      status: string;
      completedPrerequisites: number;
      totalPrerequisites: number;
    }>;
  }> {
    const state = this.coordinationStates.get(coordinationId);
    const communications = this.agentCommunications.get(coordinationId) || [];
    const syncPoints = this.synchronizationPoints.get(coordinationId) || [];

    const performance: Record<string, Record<string, unknown>> = {};

    if (state) {
      for (const participant of state.coordination.participants) {
        performance[participant.agentId] = {
          ...participant.performance,
          status: participant.status,
          currentPhase: participant.currentPhase,
        };
      }
    }

    const communicationStats = {
      messagesSent: communications.reduce((sum, ch) => sum + ch.messageQueue.length, 0),
      messagesReceived: communications.filter((ch) => ch.status === 'active').length,
      errors: communications.filter((ch) => ch.status === 'error').length,
    };

    const synchronizationEvents = syncPoints.map((sp) => ({
      id: sp.id,
      type: sp.type,
      status: sp.status,
      completedPrerequisites: sp.completedPrerequisites.length,
      totalPrerequisites: sp.prerequisites.length,
    }));

    return {
      performance,
      communication: communicationStats,
      synchronization: synchronizationEvents,
    };
  }

  // ================================
  // Helper Methods
  // ================================

  private determineCoordinationStrategy(
    plan: ExecutionPlan,
    agents: Agent[],
  ): CoordinationStrategy {
    const hasHierarchy = agents.some((a) => a.role === AgentRole.COORDINATOR);
    const hasDependencies = Object.keys(plan.dependencies).length > 0;
    const agentCount = agents.length;

    if (hasHierarchy && agentCount > 5) {
      return CoordinationStrategy.HIERARCHICAL;
    } else if (!hasDependencies && agentCount <= 3) {
      return CoordinationStrategy.PEER_TO_PEER;
    } else if (hasDependencies) {
      return CoordinationStrategy.PIPELINE;
    } else {
      return CoordinationStrategy.BROADCAST;
    }
  }

  private assignAgentRole(agent: Agent, task: Task): AgentRole {
    if (agent.capabilities.includes('coordination')) {
      return AgentRole.COORDINATOR;
    } else if (agent.capabilities.some((cap) => task.requiredCapabilities.includes(cap))) {
      return AgentRole.SPECIALIST;
    } else {
      return AgentRole.WORKER;
    }
  }

  private isAgentSuitableForPhase(agent: Agent, phaseName: string, plan: ExecutionPlan): boolean {
    // Check if agent has required capabilities for this phase
    const phaseRequirements = this.getPhaseRequirements(phaseName, plan);
    return agent.capabilities.some((cap) => phaseRequirements.includes(cap));
  }

  private getPhaseRequirements(phaseName: string, plan: ExecutionPlan): string[] {
    // Extract requirements based on phase name and plan context
    const baseRequirements: Record<string, string[]> = {
      analysis: ['analysis', 'research'],
      planning: ['planning', 'strategy'],
      execution: ['implementation', 'coding'],
      testing: ['testing', 'validation'],
      deployment: ['deployment', 'operations'],
      validation: ['validation', 'quality_assurance'],
    };

    return baseRequirements[phaseName] || plan.resourceRequirements.requiredCapabilities;
  }

  private async selectOptimalAgents(
    suitableAgents: Agent[],
    phaseName: string,
    plan: ExecutionPlan,
  ): Promise<Agent[]> {
    // Sort agents by load and capability match
    const rankedAgents = suitableAgents
      .map((agent) => ({
        agent,
        score: this.calculateAgentScore(agent, phaseName, plan),
      }))
      .sort((a, b) => b.score - a.score);

    // Select top agents based on requirements
    const maxAgents = Math.min(rankedAgents.length, plan.resourceRequirements.maxAgents || 2);

    return rankedAgents.slice(0, maxAgents).map((item) => item.agent);
  }

  private calculateAgentScore(agent: Agent, phaseName: string, plan: ExecutionPlan): number {
    const phaseRequirements = this.getPhaseRequirements(phaseName, plan);
    const capabilityMatch =
      agent.capabilities.filter((cap) => phaseRequirements.includes(cap)).length /
      phaseRequirements.length;

    const loadFactor = 1.0; // Would be calculated from current load in real implementation
    const experienceFactor = 1.0; // Would be based on historical performance

    return capabilityMatch * 0.6 + loadFactor * 0.2 + experienceFactor * 0.2;
  }

  private findSupervisorAgent(coordinationId: string): string | null {
    const state = this.coordinationStates.get(coordinationId);
    if (!state) return null;

    const supervisor = state.coordination.participants.find(
      (p) => p.role === AgentRole.COORDINATOR,
    );
    return supervisor?.agentId || null;
  }

  private calculateExecutionOrder(phases: PhaseExecutionData[]): PhaseExecutionData[][] {
    // Simple implementation - in reality would use topological sort
    const groups: PhaseExecutionData[][] = [];
    const processed = new Set<string>();

    while (processed.size < phases.length) {
      const currentGroup = phases.filter(
        (phase) =>
          !processed.has(phase.id) && phase.dependencies.every((dep: string) => processed.has(dep)),
      );

      if (currentGroup.length === 0) {
        // Circular dependency or other issue - add remaining phases
        const remaining = phases.filter((phase) => !processed.has(phase.id));
        groups.push(remaining);
        remaining.forEach((phase) => processed.add(phase.id));
      } else {
        groups.push(currentGroup);
        currentGroup.forEach((phase) => processed.add(phase.id));
      }
    }

    return groups;
  }

  private async waitForSynchronization(coordinationId: string, phaseId: string): Promise<void> {
    const syncPoints = this.synchronizationPoints.get(coordinationId) || [];
    const relevantSyncPoint = syncPoints.find((sp) => sp.dependentPhase === phaseId);

    if (relevantSyncPoint && relevantSyncPoint.status === 'pending') {
      // Use event-driven synchronization instead of polling
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.logger.warn(`Synchronization timeout for phase ${phaseId}`, {
            coordinationId,
          });
          reject(new Error(`Synchronization timeout for phase ${phaseId}`));
        }, this.config.synchronizationTimeout);

        // Listen for synchronization completion
        const onSyncComplete = (syncPoint: SynchronizationPoint) => {
          if (syncPoint.id === relevantSyncPoint.id && syncPoint.status === 'completed') {
            clearTimeout(timeoutId);
            this.off('synchronizationComplete', onSyncComplete);
            resolve();
          }
        };

        this.on('synchronizationComplete', onSyncComplete);

        // Check if already completed
        if (relevantSyncPoint.status === 'completed') {
          clearTimeout(timeoutId);
          this.off('synchronizationComplete', onSyncComplete);
          resolve();
        }
      });
    }
  }

  private async executePhase(
    coordinationId: string,
    phase: PhaseExecutionData,
    agentIds: string[],
  ): Promise<Record<string, unknown>> {
    this.logger.info(`Executing phase ${phase.name} with ${agentIds.length} agents`, {
      coordinationId,
      phase: phase.name,
      agents: agentIds,
    });

    phase.status = 'executing';
    phase.startTime = new Date();

    try {
      // Execute phase with real agent coordination instead of simulation
      const executionPromises = agentIds.map(async (agentId) => {
        return this.executeAgentTask(coordinationId, agentId, phase);
      });

      const agentResults = await Promise.allSettled(executionPromises);

      // Process results from all agents
      const results = this.aggregateAgentResults(agentResults, agentIds);

      phase.status = 'completed';
      phase.endTime = new Date();
      phase.results = {
        success: results.success,
        duration:
          phase.endTime && phase.startTime
            ? phase.endTime.getTime() - phase.startTime.getTime()
            : null,
        participants: agentIds,
        agentResults: results.data,
        errors: results.errors,
      };

      return phase.results;
    } catch (error) {
      phase.status = 'failed';
      phase.endTime = new Date();
      throw error;
    }
  }

  private async signalPhaseCompletion(coordinationId: string, phaseId: string): Promise<void> {
    const syncPoints = this.synchronizationPoints.get(coordinationId) || [];

    for (const syncPoint of syncPoints) {
      if (syncPoint.prerequisites.includes(phaseId)) {
        syncPoint.completedPrerequisites.push(phaseId);

        if (syncPoint.completedPrerequisites.length === syncPoint.prerequisites.length) {
          syncPoint.status = 'completed';
          this.logger.info(`Synchronization point completed`, {
            coordinationId,
            syncPointId: syncPoint.id,
          });

          // Emit event for event-driven synchronization
          this.emit('synchronizationComplete', syncPoint);
        }
      }
    }
  }

  /**
   * Execute a task for a specific agent using Python agents and A2A protocol
   */
  private async executeAgentTask(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<any> {
    this.logger.info('Executing agent task', {
      coordinationId,
      agentId,
      phase: phase.name,
    });

    // Check if this is an MLX agent
    const mlxAgent = this.mlxAgents.get(agentId);
    if (mlxAgent) {
      this.logger.info('Executing task with MLX agent', { agentId });
      return this.executeMlxAgentTask(mlxAgent, phase);
    }

    // Determine which framework to use
    const frameworkChoice = await this.selectOptimalFramework(coordinationId, agentId, phase);
    this.logger.info(`Selected framework: ${frameworkChoice}`, {
      coordinationId,
      agentId,
      phase: phase.name,
    });

    try {
      switch (frameworkChoice) {
        case 'crewai':
          return await this.executeCrewAITask(coordinationId, agentId, phase);
        case 'autogen':
          return await this.executeAutoGenTask(coordinationId, agentId, phase);
        case 'cross-framework':
          return await this.executeCrossFrameworkTask(coordinationId, agentId, phase);
        case 'python-bridge':
          if (this.pythonAgentBridge && this.pythonAgentBridge.getStatistics().isInitialized) {
            return await this.executePythonAgentTask(coordinationId, agentId, phase);
          }
          // Fallback to A2A if bridge not ready
          this.logger.warn('Python bridge not initialized, falling back to A2A', {
            coordinationId,
            agentId,
          });
          break;
      }

      // Fallback to A2A protocol
      this.logger.info('Falling back to A2A protocol', {
        coordinationId,
        agentId,
      });
      await this.a2aProtocol.sendMessage({
        to: agentId,
        type: 'task-assignment',
        priority: 'normal',
        payload: {
          coordinationId,
          phaseId: phase.id,
          phaseName: phase.name,
          requirements: phase.dependencies,
        },
      });

      return await this.waitForAgentResponse(agentId, coordinationId);
    } catch (error) {
      this.logger.error('Agent task execution failed', {
        coordinationId,
        agentId,
        phase: phase.name,
        framework: frameworkChoice,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a task using Python agents (LangGraph, CrewAI, AutoGen)
   */
  private async executePythonAgentTask(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<any> {
    // Determine which Python agent to use based on phase and agent capabilities
    let agentType: 'langgraph' | 'crewai' | 'autogen' = 'langgraph';

    const phaseName = phase.name.toLowerCase();

    // Route to appropriate Python agent based on task type
    if (
      phaseName.includes('plan') ||
      phaseName.includes('workflow') ||
      phaseName.includes('state')
    ) {
      agentType = 'langgraph';
    } else if (
      phaseName.includes('collaborate') ||
      phaseName.includes('team') ||
      phaseName.includes('swarm')
    ) {
      agentType = 'crewai';
    } else if (
      phaseName.includes('conversation') ||
      phaseName.includes('chat') ||
      phaseName.includes('discuss')
    ) {
      agentType = 'autogen';
    }

    const payload: AgentTaskPayload = {
      coordinationId,
      phaseId: phase.id,
      phaseName: phase.name,
      requirements: this.getPhaseRequirements(phase.name, {
        phases: [],
        dependencies: {},
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 1,
          requiredCapabilities: [],
        },
      }),
      dependencies: phase.dependencies,
      metadata: {
        agentId,
        startTime: new Date().toISOString(),
        phaseType: phaseName,
      },
      agentType,
    };

    this.logger.info(`Executing Python agent task`, {
      coordinationId,
      agentId,
      agentType,
      phase: phase.name,
    });

    try {
      const result = await this.pythonAgentBridge.executeAgentTask(payload);

      this.logger.info(`Python agent task completed`, {
        coordinationId,
        agentId,
        agentType,
        success: result.success,
        duration: result.duration_ms,
      });

      return result;
    } catch (error) {
      this.logger.error(`Python agent task failed`, {
        coordinationId,
        agentId,
        agentType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  private async executeMlxAgentTask(agent: MLXAgent, phase: PhaseExecutionData): Promise<any> {
    const phaseType = phase.name.toLowerCase();

    switch (phaseType) {
      case 'planning':
        return await agent.planTask(`Phase: ${phase.name}`);
      case 'analysis':
        return await agent.makeDecision(
          `Analyze requirements for ${phase.name}`,
          ['proceed', 'defer', 'escalate'],
          ['feasibility', 'resources', 'timeline'],
        );
      case 'execution':
      case 'implementation':
        return await agent.generateCode(`Implement ${phase.name} requirements`, 'typescript');
      default:
        return await agent.processInference({
          modelId: (agent as any).config?.model ?? 'llama-3.2-3b',
          prompt: `Execute phase: ${phase.name}`,
          systemPrompt: 'You are a helpful assistant executing agent coordination tasks.',
          maxTokens: 1024,
        });
    }
  }

  /**
   * Wait for agent response using A2A protocol
   */
  private async waitForAgentResponse(agentId: string, coordinationId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent ${agentId} response timeout`));
      }, this.config.communicationTimeout);

      const handleMessage = (message: any) => {
        if (message.from === agentId && message.payload?.coordinationId === coordinationId) {
          clearTimeout(timeout);
          this.a2aProtocol.off('messageReceived', handleMessage);

          if (message.type === 'result') {
            resolve(message.payload.result);
          } else if (message.type === 'error') {
            reject(new Error(message.payload.error));
          }
        }
      };

      this.a2aProtocol.on('messageReceived', handleMessage);
    });
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateAgentResults(
    results: PromiseSettledResult<any>[],
    agentIds: string[],
  ): { success: boolean; data: any[]; errors: string[] } {
    const data: any[] = [];
    const errors: string[] = [];
    let successCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        data.push({
          agentId: agentIds[index],
          result: result.value,
        });
        successCount++;
      } else {
        errors.push(`Agent ${agentIds[index]}: ${result.reason.message}`);
      }
    });

    return {
      success: successCount > 0,
      data,
      errors,
    };
  }

  /**
   * Select the optimal framework for task execution based on requirements
   */
  private async selectOptimalFramework(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<'crewai' | 'autogen' | 'cross-framework' | 'python-bridge'> {
    // Analyze task requirements to determine best framework
    const requirements = phase.dependencies || [];
    const phaseName = phase.name.toLowerCase();

    // CrewAI is optimal for hierarchical role-based tasks
    if (
      requirements.some((req) => req.includes('architect') || req.includes('hierarchy')) ||
      phaseName.includes('design') ||
      phaseName.includes('architecture')
    ) {
      return 'crewai';
    }

    // AutoGen is optimal for conversational and collaborative tasks
    if (
      requirements.some((req) => req.includes('conversation') || req.includes('collaboration')) ||
      phaseName.includes('discussion') ||
      phaseName.includes('negotiation')
    ) {
      return 'autogen';
    }

    // Cross-framework for complex tasks requiring multiple agent types
    if (
      requirements.length > 3 ||
      phaseName.includes('complex') ||
      phaseName.includes('integration')
    ) {
      return 'cross-framework';
    }

    // Default to Python bridge for LangGraph and other Python agents
    return 'python-bridge';
  }

  /**
   * Execute task using CrewAI role-based coordination
   */
  private async executeCrewAITask(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<any> {
    try {
      this.logger.info('Executing task with CrewAI coordination', {
        coordinationId,
        agentId,
        phase: phase.name,
      });

      // Create CrewAI coordination request
      const crewRequest: CrewAICoordinationRequest = {
        coordinationId,
        agents: [
          {
            id: agentId,
            role: this.determineAgentRole(agentId, phase),
            goal: `Execute phase: ${phase.name}`,
            backstory: `Specialized agent for ${phase.name} execution`,
            allowDelegation: true,
            verbose: false,
            maxIter: 5,
            memory: true,
            tools: phase.dependencies || [],
            decisionMaking: 'hierarchical',
            conflictResolution: 'consensus-based',
          },
        ],
        tasks: [
          {
            description: `Execute phase ${phase.name} with requirements: ${phase.dependencies?.join(', ')}`,
            agent: agentId,
            expectedOutput: `Completed results for phase ${phase.name}`,
            tools: phase.dependencies || [],
            dependencies: [],
            asyncExecution: false,
          },
        ],
        process: 'hierarchical',
        context: { phaseId: phase.id, coordinationId },
      };
      // Create and execute crew
      await this.crewaiCoordinator.createCrew(crewRequest);
      const result = await this.crewaiCoordinator.coordinateExecution(coordinationId);

      return {
        success: result.success,
        data: result.results,
        framework: 'crewai',
        agentOutputs: result.agentOutputs,
        executionTime: result.executionTime,
      };
    } catch (error) {
      this.logger.error('CrewAI task execution failed', {
        coordinationId,
        agentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Execute task using AutoGen conversational coordination
   */
  private async executeAutoGenTask(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<any> {
    try {
      this.logger.info('Executing task with AutoGen coordination', {
        coordinationId,
        agentId,
        phase: phase.name,
      });

      // Create AutoGen task request
      const autogenRequest: AutoGenTaskRequest = {
        taskId: coordinationId,
        agents: [
          {
            name: `Agent_${agentId}`,
            systemMessage: `You are a specialized agent responsible for executing ${phase.name}. 
                         Your goal is to complete the task requirements: ${phase.dependencies?.join(', ')}`,
            description: `Agent for ${phase.name} execution`,
            maxConsecutiveAutoReply: 10,
            humanInputMode: 'NEVER',
            codeExecutionConfig: false,
            conversationConfig: {
              adaptiveFlows: true,
              taskComplexityThreshold: 0.7,
              maxRoundTrip: 20,
            },
            toolIntegration: {
              externalTools: true,
              serviceIntegration: true,
            },
            roleAssignment: {
              dynamic: true,
              capabilityMatching: true,
            },
          },
        ],
        initialMessage: `Execute phase: ${phase.name} with requirements: ${phase.dependencies?.join(', ')}`,
        conversationConfig: {
          participants: [agentId],
          maxRounds: 50,
          speakerSelectionMethod: 'auto',
          allowRepeatSpeaker: true,
          messages: [],
        },
        context: { phaseId: phase.id, coordinationId },
        adaptiveFlow: true,
      };

      // Start conversation and get result
      await this.autogenManager.startConversation(autogenRequest);
      const result = await this.autogenManager.continueConversation(
        coordinationId,
        `Please complete the task for phase: ${phase.name}`,
        agentId,
      );

      return {
        success: result.success,
        data: result.finalResult,
        framework: 'autogen',
        conversationHistory: result.conversationHistory,
        agentMetrics: result.agentMetrics,
        executionTime: result.executionTime,
      };
    } catch (error) {
      this.logger.error('AutoGen task execution failed', {
        coordinationId,
        agentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Execute cross-framework task coordination
   */
  private async executeCrossFrameworkTask(
    coordinationId: string,
    agentId: string,
    phase: PhaseExecutionData,
  ): Promise<any> {
    try {
      this.logger.info('Executing cross-framework task coordination', {
        coordinationId,
        agentId,
        phase: phase.name,
      });

      // Create cross-framework task request
      const crossFrameworkRequest: CrossFrameworkTaskRequest = {
        taskId: coordinationId,
        requesterFramework: 'langchain', // Current framework
        targetFramework: this.selectTargetFramework(phase),
        taskDescription: `Execute phase ${phase.name} with requirements: ${phase.dependencies?.join(', ')}`,
        requiredCapabilities: phase.dependencies || [],
        context: { phaseId: phase.id, agentId },
        priority: 5,
      };

      // Execute cross-framework coordination
      const result =
        await this.agentProtocolBridge.executeCrossFrameworkTask(crossFrameworkRequest);

      return {
        success: result.success,
        data: result.result,
        framework: 'cross-framework',
        executingAgent: result.executingAgent,
        executingFramework: result.executingFramework,
        executionTime: result.executionTime,
      };
    } catch (error) {
      this.logger.error('Cross-framework task execution failed', {
        coordinationId,
        agentId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Determine agent role based on agent ID and phase requirements
   */
  private determineAgentRole(agentId: string, phase: PhaseExecutionData): string {
    const phaseName = phase.name.toLowerCase();

    if (phaseName.includes('design') || phaseName.includes('architecture')) {
      return 'architect';
    } else if (phaseName.includes('code') || phaseName.includes('implement')) {
      return 'coder';
    } else if (phaseName.includes('test') || phaseName.includes('quality')) {
      return 'tester';
    } else if (phaseName.includes('analyze') || phaseName.includes('requirement')) {
      return 'analyst';
    }

    return 'specialist'; // Default role
  }

  /**
   * Select target framework for cross-framework coordination
   */
  private selectTargetFramework(phase: PhaseExecutionData): 'crewai' | 'autogen' | 'langchain' {
    const phaseName = phase.name.toLowerCase();

    if (
      phaseName.includes('hierarchy') ||
      phaseName.includes('role') ||
      phaseName.includes('architect')
    ) {
      return 'crewai';
    } else if (phaseName.includes('conversation') || phaseName.includes('discussion')) {
      return 'autogen';
    }

    return 'langchain'; // Default
  }

  /**
   * Register an MLX agent for AI-powered coordination
   */
  async registerMlxAgent(agent: MLXAgent): Promise<void> {
    await agent.initialize();
    this.mlxAgents.set(agent.id, agent);

    this.logger.info(`MLX agent registered`, {
      agentId: agent.id,
      name: agent.name,
      capabilities: agent.capabilities,
    });
  }

  /**
   * Unregister an MLX agent
   */
  async unregisterMlxAgent(agentId: string): Promise<void> {
    const agent = this.mlxAgents.get(agentId);
    if (agent) {
      await agent.cleanup();
      this.mlxAgents.delete(agentId);
      this.logger.info(`MLX agent unregistered`, { agentId });
    }
  }

  private calculateResourceUtilization(
    coordinationId: string,
  ): Record<string, Record<string, unknown>> {
    const allocations = this.resourceAllocations.get(coordinationId) || new Map();
    const utilization: Record<string, Record<string, unknown>> = {};

    for (const [agentId, resources] of allocations) {
      utilization[agentId] = {
        memoryUsage: resources.memoryRequirement || 0,
        computeUsage: resources.computeRequirement || 0,
        capabilityUtilization: resources.requiredCapabilities.length,
      };
    }

    return utilization;
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Use event-driven monitoring instead of polling
    this.on('coordinationCompleted', () => this.updatePerformanceMetrics());
    this.on('agentAssigned', () => this.updatePerformanceMetrics());
    this.on('phaseCompleted', () => this.updatePerformanceMetrics());

    // Optional periodic monitoring for long-running operations
    const monitoringInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.config.heartbeatInterval);

    // Store interval for cleanup
    this.on('cleanup', () => clearInterval(monitoringInterval));
  }

  private updatePerformanceMetrics(): void {
    for (const [coordinationId, state] of this.coordinationStates) {
      const metrics = {
        activeAgents: state.activeAgents.size,
        completedPhases: state.completedPhases.size,
        failedPhases: state.failedPhases.size,
        pendingCommunications: state.pendingCommunications.length,
        resourceLocks: state.resourceLocks.size,
        timestamp: new Date(),
      };

      this.performanceMetrics.set(coordinationId, metrics);
    }
  }

  private async cleanupCoordination(coordinationId: string): Promise<void> {
    this.coordinationStates.delete(coordinationId);
    this.agentCommunications.delete(coordinationId);
    this.synchronizationPoints.delete(coordinationId);
    this.resourceAllocations.delete(coordinationId);
    this.performanceMetrics.delete(coordinationId);

    this.logger.info(`Cleaned up coordination ${coordinationId}`);
  }

  /**
   * Get coordination statistics including A2A and MLX metrics
   */
  getStatistics(): {
    activeCoordinations: number;
    totalCommunicationChannels: number;
    activeSynchronizationPoints: number;
    performanceData: Record<string, Record<string, unknown>>;
    a2aStatistics: any;
    mlxAgents: {
      total: number;
      active: number;
      totalInferences: number;
    };
  } {
    const totalChannels = Array.from(this.agentCommunications.values()).reduce(
      (sum, channels) => sum + channels.length,
      0,
    );

    const totalSyncPoints = Array.from(this.synchronizationPoints.values()).reduce(
      (sum, points) => sum + points.filter((p) => p.status !== 'completed').length,
      0,
    );

    const mlxStats = Array.from(this.mlxAgents.values());
    const totalInferences = mlxStats.reduce(
      (sum, agent) => sum + agent.getStatistics().inferenceCount,
      0,
    );

    return {
      activeCoordinations: this.coordinationStates.size,
      totalCommunicationChannels: totalChannels,
      activeSynchronizationPoints: totalSyncPoints,
      performanceData: Object.fromEntries(this.performanceMetrics),
      a2aStatistics: this.a2aProtocol.getStatistics(),
      mlxAgents: {
        total: this.mlxAgents.size,
        active: mlxStats.filter((a) => a.status === 'available').length,
        totalInferences,
      },
    };
  }

  /**
   * Clean up all resources including A2A protocol, MLX agents, and Python bridge
   */
  async cleanup(): Promise<void> {
    // Cleanup Python agent bridge
    try {
      await this.pythonAgentBridge.shutdown();
    } catch (error) {
      this.logger.error('Error shutting down Python agent bridge', { error });
    }

    // Cleanup A2A protocol
    await this.a2aProtocol.cleanup();

    // Cleanup MLX agents
    for (const agent of this.mlxAgents.values()) {
      await agent.cleanup();
    }
    this.mlxAgents.clear();

    // Cancel active executions
    for (const execution of this.activeExecutions.values()) {
      try {
        // If execution is a promise, we can't really cancel it, but we can ignore results
        execution.catch(() => {}); // Ignore errors from cancelled executions
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
    this.activeExecutions.clear();

    // Clear coordination data
    this.coordinationStates.clear();
    this.agentCommunications.clear();
    this.synchronizationPoints.clear();
    this.resourceAllocations.clear();
    this.performanceMetrics.clear();

    // Cleanup new framework coordinators
    try {
      await this.crewaiCoordinator.shutdown();
      await this.autogenManager.shutdown();
      await this.agentProtocolBridge.shutdown();
    } catch (error) {
      this.logger.warn('Error during framework coordinator cleanup', {
        error: error.message,
      });
    }

    this.emit('cleanup');
    this.logger.info('Multi-agent coordination engine cleanup completed');
  }
}
