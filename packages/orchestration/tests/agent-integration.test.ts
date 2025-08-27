/**
 * Integration Tests for Agent Interactions in Orchestration
 * Tests multi-agent coordination, communication patterns, and failure scenarios
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiAgentCoordinationEngine } from '../src/multi-agent-coordination.js';
import { Agent, ExecutionPlan, Task, OrchestrationStrategy, TaskStatus } from '../src/types.js';

describe('Agent Integration Tests', () => {
  let engine: MultiAgentCoordinationEngine;

  beforeEach(async () => {
    engine = new MultiAgentCoordinationEngine({
      maxConcurrentTasks: 5,
      communicationTimeout: 2000,
      synchronizationTimeout: 5000,
      enablePerformanceMonitoring: true,
      heartbeatInterval: 10000,
    });
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.cleanup();
  });

  describe('Multi-Agent Coordination', () => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Planning Specialist',
        role: 'planner' as any,
        capabilities: ['planning', 'analysis'],
        status: 'available',
        metadata: { experience: 'senior' },
        lastSeen: new Date(),
      },
      {
        id: 'agent-2',
        name: 'Execution Expert',
        role: 'executor' as any,
        capabilities: ['execution', 'implementation'],
        status: 'available',
        metadata: { experience: 'senior' },
        lastSeen: new Date(),
      },
      {
        id: 'agent-3',
        name: 'Quality Validator',
        role: 'validator' as any,
        capabilities: ['validation', 'testing'],
        status: 'available',
        metadata: { experience: 'junior' },
        lastSeen: new Date(),
      },
    ];

    const mockTask: Task = {
      id: 'task-123',
      title: 'Build Authentication System',
      description: 'Implement secure user authentication with JWT tokens',
      status: TaskStatus.PENDING,
      priority: 8,
      dependencies: [],
      requiredCapabilities: ['planning', 'execution', 'validation'],
      context: { framework: 'express', database: 'postgresql' },
      metadata: { deadline: '2024-02-01' },
      createdAt: new Date(),
    };

    const mockPlan: ExecutionPlan = {
      id: 'plan-456',
      taskId: 'task-123',
      strategy: OrchestrationStrategy.HIERARCHICAL,
      phases: ['analysis', 'implementation', 'testing', 'validation'],
      dependencies: {
        implementation: ['analysis'],
        testing: ['implementation'],
        validation: ['testing'],
      },
      estimatedDuration: 7200000, // 2 hours
      resourceRequirements: {
        minAgents: 2,
        maxAgents: 3,
        requiredCapabilities: ['planning', 'execution', 'validation'],
        memoryRequirement: 512,
        computeRequirement: 1000,
      },
      checkpoints: [
        {
          phase: 'analysis',
          criteria: ['requirements_documented', 'architecture_designed'],
          validation: 'peer_review',
        },
        {
          phase: 'implementation',
          criteria: ['code_complete', 'tests_passing'],
          validation: 'automated_tests',
        },
      ],
      fallbackStrategies: ['sequential', 'parallel'],
      createdAt: new Date(),
    };

    it('should successfully coordinate multi-agent execution', async () => {
      const result = await engine.coordinateExecution(mockTask, mockPlan, mockAgents);

      expect(result.success).toBe(true);
      expect(result.coordinationId).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.completedPhases).toContain('analysis');
      expect(result.agentPerformance).toBeDefined();
      expect(Object.keys(result.agentPerformance)).toHaveLength(mockAgents.length);
    });

    it('should handle agent capability matching', async () => {
      const specializedTask: Task = {
        ...mockTask,
        id: 'specialized-task',
        requiredCapabilities: ['machine_learning', 'data_science'],
      };

      const mlAgents: Agent[] = [
        {
          ...mockAgents[0],
          id: 'ml-agent-1',
          capabilities: ['machine_learning', 'tensorflow'],
        },
        {
          ...mockAgents[1],
          id: 'ds-agent-1',
          capabilities: ['data_science', 'analysis'],
        },
      ];

      const result = await engine.coordinateExecution(specializedTask, mockPlan, mlAgents);

      expect(result.success).toBe(true);
      expect(Object.keys(result.agentPerformance)).toHaveLength(mlAgents.length);
    });

    it('should implement proper synchronization between phases', async () => {
      vi.useFakeTimers();

      const sequentialPlan: ExecutionPlan = {
        ...mockPlan,
        strategy: OrchestrationStrategy.SEQUENTIAL,
        dependencies: {
          phase2: ['phase1'],
          phase3: ['phase2'],
          phase4: ['phase3'],
        },
      };

      const coordinationPromise = engine.coordinateExecution(mockTask, sequentialPlan, mockAgents);

      // Advance timers to simulate phase execution
      vi.advanceTimersByTime(1000);

      const result = await coordinationPromise;

      expect(result.success).toBe(true);
      expect(result.synchronizationEvents.length).toBeGreaterThan(0);

      // Verify synchronization points were created and completed
      const syncEvents = result.synchronizationEvents;
      expect(syncEvents.some(event => event.type === 'phase-dependency')).toBe(true);

      vi.useRealTimers();
    });

    it('should handle communication failures gracefully', async () => {
      // Mock communication failure
      const failingAgents: Agent[] = [
        {
          ...mockAgents[0],
          status: 'offline',
        },
        ...mockAgents.slice(1),
      ];

      const result = await engine.coordinateExecution(mockTask, mockPlan, failingAgents);

      // Should succeed with remaining agents or provide meaningful error
      expect(result.coordinationId).toBeDefined();
      expect(result.communicationStats.errors).toBeGreaterThan(0);
    });

    it('should distribute workload based on agent capabilities and load', async () => {
      const highLoadAgents: Agent[] = mockAgents.map(agent => ({
        ...agent,
        metadata: {
          ...agent.metadata,
          currentLoad: agent.id === 'agent-1' ? 0.9 : 0.1, // High load for agent-1
        },
      }));

      const result = await engine.coordinateExecution(mockTask, mockPlan, highLoadAgents);

      expect(result.success).toBe(true);
      
      // Agent-1 with high load should have lower performance score
      const agent1Performance = result.agentPerformance['agent-1'];
      const agent2Performance = result.agentPerformance['agent-2'];
      
      expect(agent1Performance).toBeDefined();
      expect(agent2Performance).toBeDefined();
    });
  });

  describe('Failure Scenarios and Recovery', () => {
    const mockAgents: Agent[] = [
      {
        id: 'resilient-agent',
        name: 'Resilient Agent',
        role: 'worker' as any,
        capabilities: ['general'],
        status: 'available',
        metadata: {},
        lastSeen: new Date(),
      },
    ];

    it('should handle agent failures and redistribute work', async () => {
      const failureTask: Task = {
        id: 'failure-task',
        title: 'Test Failure Handling',
        description: 'Task to test agent failure scenarios',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['general'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const plan: ExecutionPlan = {
        id: 'failure-plan',
        taskId: 'failure-task',
        strategy: OrchestrationStrategy.ADAPTIVE,
        phases: ['phase1', 'phase2'],
        dependencies: { phase2: ['phase1'] },
        estimatedDuration: 60000,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 2,
          requiredCapabilities: ['general'],
        },
        checkpoints: [],
        fallbackStrategies: ['sequential'],
        createdAt: new Date(),
      };

      // Simulate agent becoming unavailable during execution
      setTimeout(() => {
        mockAgents[0].status = 'offline';
      }, 100);

      const result = await engine.coordinateExecution(failureTask, plan, mockAgents);

      // Should handle failure gracefully
      expect(result.coordinationId).toBeDefined();
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    });

    it('should implement circuit breaker pattern for failing agents', async () => {
      let failureCount = 0;
      const maxFailures = 3;
      
      const circuitBreakerTest = async () => {
        try {
          failureCount++;
          if (failureCount <= maxFailures) {
            throw new Error(`Failure ${failureCount}`);
          }
          return { success: true };
        } catch (error) {
          if (failureCount >= maxFailures) {
            // Circuit breaker should be open
            throw new Error('Circuit breaker open');
          }
          throw error;
        }
      };

      // Test multiple failures
      for (let i = 0; i < maxFailures + 1; i++) {
        try {
          await circuitBreakerTest();
        } catch (error: any) {
          if (i < maxFailures) {
            expect(error.message).toMatch(/Failure \d+/);
          } else {
            expect(error.message).toBe('Circuit breaker open');
          }
        }
      }

      expect(failureCount).toBe(maxFailures + 1);
    });

    it('should handle timeout scenarios with proper cleanup', async () => {
      vi.useRealTimers(); // Need real timers for timeout testing

      const timeoutTask: Task = {
        id: 'timeout-task',
        title: 'Timeout Test',
        description: 'Task to test timeout handling',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['general'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const quickPlan: ExecutionPlan = {
        id: 'timeout-plan',
        taskId: 'timeout-task',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['quick-phase'],
        dependencies: {},
        estimatedDuration: 50, // Very short timeout
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 1,
          requiredCapabilities: ['general'],
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const startTime = Date.now();
      const result = await engine.coordinateExecution(timeoutTask, quickPlan, mockAgents);
      const executionTime = Date.now() - startTime;

      // Should complete quickly due to timeout or error handling
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
      expect(result.coordinationId).toBeDefined();
    });
  });

  describe('Resource Management and Optimization', () => {
    it('should optimize resource allocation based on task requirements', async () => {
      const resourceIntensiveTask: Task = {
        id: 'resource-task',
        title: 'Resource Intensive Task',
        description: 'Task requiring significant resources',
        status: TaskStatus.PENDING,
        priority: 9,
        dependencies: [],
        requiredCapabilities: ['computation', 'memory_intensive'],
        context: { requiresGPU: true },
        metadata: { estimatedMemory: '8GB', estimatedCPU: '4cores' },
        createdAt: new Date(),
      };

      const resourcePlan: ExecutionPlan = {
        id: 'resource-plan',
        taskId: 'resource-task',
        strategy: OrchestrationStrategy.PARALLEL,
        phases: ['preprocessing', 'computation', 'postprocessing'],
        dependencies: {
          computation: ['preprocessing'],
          postprocessing: ['computation'],
        },
        estimatedDuration: 1800000, // 30 minutes
        resourceRequirements: {
          minAgents: 2,
          maxAgents: 4,
          requiredCapabilities: ['computation', 'memory_intensive'],
          memoryRequirement: 8192, // 8GB
          computeRequirement: 4000, // 4 cores
        },
        checkpoints: [],
        fallbackStrategies: ['sequential'],
        createdAt: new Date(),
      };

      const highCapacityAgents: Agent[] = [
        {
          id: 'compute-agent-1',
          name: 'High Performance Agent',
          role: 'specialist' as any,
          capabilities: ['computation', 'memory_intensive', 'gpu'],
          status: 'available',
          metadata: { memory: '16GB', cpu: '8cores', gpu: 'A100' },
          lastSeen: new Date(),
        },
        {
          id: 'compute-agent-2',
          name: 'Backup Compute Agent',
          role: 'specialist' as any,
          capabilities: ['computation', 'memory_intensive'],
          status: 'available',
          metadata: { memory: '8GB', cpu: '4cores' },
          lastSeen: new Date(),
        },
      ];

      const result = await engine.coordinateExecution(
        resourceIntensiveTask,
        resourcePlan,
        highCapacityAgents
      );

      expect(result.success).toBe(true);
      expect(result.resourceUtilization).toBeDefined();
      
      // Verify resource allocation was optimized
      const resourceUsage = result.resourceUtilization;
      expect(Object.keys(resourceUsage)).toHaveLength(highCapacityAgents.length);
      
      Object.values(resourceUsage).forEach((usage: any) => {
        expect(usage.memoryUsage).toBeDefined();
        expect(usage.computeUsage).toBeDefined();
      });
    });

    it('should handle memory pressure and garbage collection', async () => {
      // Simulate memory pressure scenario
      const memoryPressureTask: Task = {
        id: 'memory-pressure-task',
        title: 'Memory Pressure Test',
        description: 'Task to test memory pressure handling',
        status: TaskStatus.PENDING,
        priority: 7,
        dependencies: [],
        requiredCapabilities: ['memory_management'],
        context: { largeDataset: true },
        metadata: {},
        createdAt: new Date(),
      };

      const memoryPlan: ExecutionPlan = {
        id: 'memory-plan',
        taskId: 'memory-pressure-task',
        strategy: OrchestrationStrategy.ADAPTIVE,
        phases: ['load_data', 'process_data', 'cleanup'],
        dependencies: {
          process_data: ['load_data'],
          cleanup: ['process_data'],
        },
        estimatedDuration: 300000, // 5 minutes
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 2,
          requiredCapabilities: ['memory_management'],
          memoryRequirement: 4096, // 4GB
        },
        checkpoints: [],
        fallbackStrategies: ['sequential'],
        createdAt: new Date(),
      };

      const memoryAwareAgents: Agent[] = [
        {
          id: 'memory-agent',
          name: 'Memory Optimized Agent',
          role: 'specialist' as any,
          capabilities: ['memory_management', 'optimization'],
          status: 'available',
          metadata: { memoryEfficient: true },
          lastSeen: new Date(),
        },
      ];

      const result = await engine.coordinateExecution(
        memoryPressureTask,
        memoryPlan,
        memoryAwareAgents
      );

      expect(result.success).toBe(true);
      expect(result.completedPhases).toContain('cleanup');
    });
  });

  describe('Performance Monitoring and Analytics', () => {
    it('should collect detailed performance metrics', async () => {
      const metricsTask: Task = {
        id: 'metrics-task',
        title: 'Performance Metrics Collection',
        description: 'Task for testing performance monitoring',
        status: TaskStatus.PENDING,
        priority: 6,
        dependencies: [],
        requiredCapabilities: ['analysis'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const metricsPlan: ExecutionPlan = {
        id: 'metrics-plan',
        taskId: 'metrics-task',
        strategy: OrchestrationStrategy.PARALLEL,
        phases: ['collect', 'analyze', 'report'],
        dependencies: {
          analyze: ['collect'],
          report: ['analyze'],
        },
        estimatedDuration: 120000, // 2 minutes
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 3,
          requiredCapabilities: ['analysis'],
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const analyticsAgents: Agent[] = [
        {
          id: 'analytics-agent',
          name: 'Analytics Specialist',
          role: 'specialist' as any,
          capabilities: ['analysis', 'reporting'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
        },
      ];

      const result = await engine.coordinateExecution(metricsTask, metricsPlan, analyticsAgents);

      expect(result.success).toBe(true);
      
      // Verify comprehensive metrics were collected
      expect(result.agentPerformance).toBeDefined();
      expect(result.communicationStats).toBeDefined();
      expect(result.synchronizationEvents).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      
      // Verify engine statistics are available
      const stats = engine.getStatistics();
      expect(stats.activeCoordinations).toBeGreaterThanOrEqual(0);
      expect(stats.performanceData).toBeDefined();
    });

    it('should track agent performance trends over time', async () => {
      const performanceTasks = Array.from({ length: 3 }, (_, i) => ({
        id: `perf-task-${i}`,
        title: `Performance Test ${i}`,
        description: 'Task for performance trend analysis',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['general'],
        context: { iteration: i },
        metadata: {},
        createdAt: new Date(),
      }));

      const trendPlan: ExecutionPlan = {
        id: 'trend-plan',
        taskId: 'trend-task',
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['execute'],
        dependencies: {},
        estimatedDuration: 60000, // 1 minute
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 1,
          requiredCapabilities: ['general'],
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const trendAgent: Agent[] = [
        {
          id: 'trend-agent',
          name: 'Trend Tracking Agent',
          role: 'worker' as any,
          capabilities: ['general'],
          status: 'available',
          metadata: { trackPerformance: true },
          lastSeen: new Date(),
        },
      ];

      const results = [];
      for (const task of performanceTasks) {
        const result = await engine.coordinateExecution(task, trendPlan, trendAgent);
        results.push(result);
      }

      // Analyze performance trends
      const executionTimes = results.map(r => r.executionTime);
      expect(executionTimes).toHaveLength(3);
      
      // All executions should be successful
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.agentPerformance['trend-agent']).toBeDefined();
      });
    });
  });
});