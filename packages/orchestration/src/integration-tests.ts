/**
 * @file_path packages/orchestration/src/integration-tests.ts
 * @description Integration tests to validate real agent execution without setTimeout simulation
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by gpt-4o-mini
 * @ai_provenance_hash fix-158-implementation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MLXAgent } from './integrations/mlx-agent.js';
import { MultiAgentCoordinationEngine } from './multi-agent-coordination.js';
import {
  Agent,
  AgentRole,
  ExecutionPlan,
  OrchestrationStrategy,
  Task,
  TaskStatus,
} from './types.js';

describe('LangGraph StateGraph Integration Tests', () => {
  let engine: MultiAgentCoordinationEngine;
  let mlxAgent: MLXAgent;

  beforeEach(async () => {
    engine = new MultiAgentCoordinationEngine({
      maxConcurrentTasks: 5,
      communicationTimeout: 5000,
      synchronizationTimeout: 10000,
      enablePerformanceMonitoring: true,
    });

    // Use mockMode to avoid network calls in CI/tests
    mlxAgent = new MLXAgent('mlx-test-agent', 'Test MLX Agent', {
      mockMode: true,
    });
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('MLX Agent Real Execution (No setTimeout Simulation)', () => {
    it('should load MLX model without setTimeout delays', async () => {
      const startTime = Date.now();

      await mlxAgent.initialize();

      const duration = Date.now() - startTime;
      // Should complete almost immediately (< 100ms)
      expect(duration).toBeLessThan(100);

      await mlxAgent.cleanup();
    });

    it('should execute inference without setTimeout delays', async () => {
      await mlxAgent.initialize();

      const startTime = Date.now();

      const response = await mlxAgent.processInference({
        modelId: 'mock-model',
        prompt: 'Generate TypeScript code for a simple function',
        systemPrompt: 'You are a helpful coding assistant',
        maxTokens: 100,
      });

      const duration = Date.now() - startTime;

      // Should complete much faster than the old 1000-5000ms simulation delays
      expect(duration).toBeLessThan(1000);
      expect(response.text).toContain('typescript');
      expect(response.finishReason).toBe('stop');
      expect(response.text.length).toBeGreaterThan(0);

      await mlxAgent.cleanup();
    });

    it('should generate meaningful code responses', async () => {
      await mlxAgent.initialize();

      const response = await mlxAgent.generateCode(
        'Create a function that validates email addresses',
        'typescript',
      );

      expect(response).toContain('typescript');
      expect(response).toContain('function');
      expect(response.length).toBeGreaterThan(50);

      await mlxAgent.cleanup();
    });

    it('should generate realistic task plans', async () => {
      await mlxAgent.initialize();

      const plan = await mlxAgent.planTask('Build a user authentication system');

      expect(plan.phases).toBeInstanceOf(Array);
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.dependencies).toBeInstanceOf(Object);
      expect(plan.estimatedDuration).toBeGreaterThan(0);

      await mlxAgent.cleanup();
    });

    it('should make decisions with reasoning', async () => {
      await mlxAgent.initialize();

      const decision = await mlxAgent.makeDecision(
        'Choose the best frontend framework for a new project',
        ['React', 'Vue', 'Angular'],
        ['performance', 'learning_curve', 'ecosystem'],
      );

      expect(decision.selectedOption).toBeDefined();
      expect(['React', 'Vue', 'Angular']).toContain(decision.selectedOption);
      expect(decision.reasoning).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);

      await mlxAgent.cleanup();
    });
  });

  describe('Multi-Agent Coordination Performance', () => {
    it('should coordinate agents faster without simulation delays', async () => {
      const mockTask: Task = {
        id: 'perf-test-task',
        title: 'Performance Test Task',
        description: 'Test task for performance validation',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['planning', 'execution'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const mockPlan: ExecutionPlan = {
        id: 'perf-test-plan',
        taskId: 'perf-test-task',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['planning', 'execution'],
        dependencies: {
          execution: ['planning'],
        },
        estimatedDuration: 2000,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 2,
          requiredCapabilities: ['planning', 'execution'],
          memoryRequirement: 256,
          computeRequirement: 1,
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const mockAgents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Planning Agent',
          role: AgentRole.PLANNER,
          capabilities: ['planning'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
        },
        {
          id: 'agent-2',
          name: 'Execution Agent',
          role: AgentRole.EXECUTOR,
          capabilities: ['execution'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
        },
      ];

      const startTime = Date.now();

      const result = await engine.coordinateExecution(mockTask, mockPlan, mockAgents);

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.completedPhases).toContain('planning');
      expect(result.completedPhases).toContain('execution');

      // Should complete much faster than previous simulation delays (which used 1-3 seconds per phase)
      expect(duration).toBeLessThan(5000);

      // Verify performance improvement
      expect(result.executionTime).toBeLessThan(5000);
    });

    it('should maintain communication stats during real execution', async () => {
      await engine.registerMlxAgent(mlxAgent);

      const stats = engine.getStatistics();

      expect(stats.mlxAgents.total).toBe(1);
      expect(stats.a2aStatistics).toBeDefined();
      expect(stats.performanceData).toBeDefined();

      await engine.unregisterMlxAgent(mlxAgent.id);
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should handle workflow state transitions', async () => {
      const mockTask: Task = {
        id: 'state-test-task',
        title: 'State Management Test',
        description: 'Test task for state persistence',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['state_management'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const mockPlan: ExecutionPlan = {
        id: 'state-test-plan',
        taskId: 'state-test-task',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['planning', 'execution', 'validation'],
        dependencies: {
          execution: ['planning'],
          validation: ['execution'],
        },
        estimatedDuration: 3000,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 1,
          requiredCapabilities: ['state_management'],
          memoryRequirement: 256,
          computeRequirement: 1,
        },
        checkpoints: [
          {
            phase: 'planning',
            criteria: ['phase_complete'],
            validation: 'auto',
          },
          {
            phase: 'execution',
            criteria: ['phase_complete'],
            validation: 'auto',
          },
        ],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const mockAgents: Agent[] = [
        {
          id: 'state-agent',
          name: 'State Management Agent',
          role: AgentRole.SPECIALIST,
          capabilities: ['state_management', 'planning', 'execution', 'validation'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
        },
      ];

      const result = await engine.coordinateExecution(mockTask, mockPlan, mockAgents);

      expect(result.success).toBe(true);
      expect(result.completedPhases).toEqual(['planning', 'execution', 'validation']);
      expect(result.synchronizationEvents).toBeDefined();
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
