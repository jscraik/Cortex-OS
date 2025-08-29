/**
 * Tests for Agent Orchestration Layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AgentOrchestrator,
  createOrchestrator,
  WorkflowBuilder,
} from '@/orchestration/agent-orchestrator.js';
import { createMockEventBus, createMockMCPClient } from '@tests/setup.js';
import type { ModelProvider } from '@/lib/types.js';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockProvider: ModelProvider;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockMCPClient: ReturnType<typeof createMockMCPClient>;

  beforeEach(() => {
    mockProvider = {
      name: 'test-provider',
      generate: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          suggestions: ['test suggestion'],
          complexity: { cyclomatic: 5, cognitive: 3, maintainability: 'good' },
          security: { vulnerabilities: [], riskLevel: 'low' },
          performance: { bottlenecks: [], memoryUsage: 'low' },
          confidence: 0.9,
          analysisTime: 1000,
        }),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        latencyMs: 1000,
        provider: 'test-provider',
      }),
      shutdown: vi.fn(),
    };
    mockEventBus = createMockEventBus();
    mockMCPClient = createMockMCPClient();

    orchestrator = createOrchestrator({
      providers: {
        primary: mockProvider,
      },
      eventBus: mockEventBus,
      mcpClient: mockMCPClient,
      maxConcurrentTasks: 2,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  describe('Orchestrator Creation', () => {
    it('should create orchestrator with required config', () => {
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    });

    it('should initialize available agents', () => {
      const agents = orchestrator.getAvailableAgents();

      expect(agents).toHaveLength(3);
      expect(agents.map((a) => a.capability)).toContain('code-analysis');
      expect(agents.map((a) => a.capability)).toContain('test-generation');
      expect(agents.map((a) => a.capability)).toContain('documentation');
    });

    it('should initialize with empty metrics', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.workflowsExecuted).toBe(0);
      expect(metrics.tasksCompleted).toBe(0);
    });
  });

  describe('Sequential Workflow Execution', () => {
    it('should execute simple sequential workflow', async () => {
      const workflow = WorkflowBuilder.create('test-workflow', 'Test Workflow')
        .addCodeAnalysis(
          {
            sourceCode: 'function test() { return 42; }',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'analysis-task' },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      if (result.status === 'failed') {
        console.log('Workflow failed with errors:', result.errors);
      }
      expect(result.status).toBe('completed');
      expect(result.results).toHaveProperty('analysis-task');
      expect(result.metrics.tasksCompleted).toBe(1);
      expect(result.metrics.tasksTotal).toBe(1);
    });

    it('should execute workflow with dependencies', async () => {
      // Mock test generation response
      vi.mocked(mockProvider.generate).mockImplementation(async (prompt) => {
        if (prompt.includes('test')) {
          return {
            text: JSON.stringify({
              tests: [{ name: 'test', code: 'it("works", () => {})', type: 'positive-case' }],
              framework: 'vitest',
              language: 'javascript',
              testType: 'unit',
              coverage: { estimated: 90, branches: [], uncoveredPaths: [] },
              imports: [],
              confidence: 0.9,
              testCount: 1,
              analysisTime: 1000,
            }),
            usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
            latencyMs: 1000,
            provider: 'test-provider',
          };
        }
        return {
          text: JSON.stringify({
            suggestions: ['test'],
            complexity: { cyclomatic: 1 },
            security: { vulnerabilities: [] },
            performance: { bottlenecks: [] },
            confidence: 0.9,
            analysisTime: 1000,
          }),
          usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
          latencyMs: 1000,
          provider: 'test-provider',
        };
      });

      const workflow = WorkflowBuilder.create('dependent-workflow', 'Dependent Workflow')
        .addCodeAnalysis(
          {
            sourceCode: 'function add(a, b) { return a + b; }',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'analysis' },
        )
        .addTestGeneration(
          {
            sourceCode: 'function add(a, b) { return a + b; }',
            language: 'javascript',
            testType: 'unit',
            framework: 'vitest',
          },
          { id: 'tests', dependsOn: ['analysis'] },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveProperty('analysis');
      expect(result.results).toHaveProperty('tests');
      expect(result.metrics.tasksCompleted).toBe(2);
    });

    it('should handle task failures gracefully', async () => {
      vi.mocked(mockProvider.generate).mockRejectedValue(new Error('Provider failed'));

      const workflow = WorkflowBuilder.create('failing-workflow', 'Failing Workflow')
        .addCodeAnalysis(
          {
            sourceCode: 'broken code',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'failing-task' },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveProperty('failing-task');
      expect(result.metrics.tasksCompleted).toBe(0);
    });
  });

  describe('Parallel Workflow Execution', () => {
    it('should execute tasks in parallel', async () => {
      const workflow = WorkflowBuilder.create('parallel-workflow', 'Parallel Workflow')
        .parallel(true)
        .addCodeAnalysis(
          {
            sourceCode: 'function test1() {}',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'analysis-1' },
        )
        .addCodeAnalysis(
          {
            sourceCode: 'function test2() {}',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'analysis-2' },
        )
        .build();

      const startTime = Date.now();
      const result = await orchestrator.executeWorkflow(workflow);
      const executionTime = Date.now() - startTime;

      expect(result.status).toBe('completed');
      expect(result.results).toHaveProperty('analysis-1');
      expect(result.results).toHaveProperty('analysis-2');
      expect(result.metrics.tasksCompleted).toBe(2);

      // Parallel execution should be faster than sequential
      // (accounting for some overhead, should be less than 1.5x sequential time)
      expect(executionTime).toBeLessThan(3000);
    });
  });

  describe('Workflow Status and Control', () => {
    it('should track workflow status', async () => {
      const workflow = WorkflowBuilder.create('status-workflow', 'Status Workflow')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      // Start workflow in background
      const workflowPromise = orchestrator.executeWorkflow(workflow);

      // Check status while running
      const status = orchestrator.getWorkflowStatus('status-workflow');
      expect(status.isRunning).toBe(true);

      // Wait for completion
      const result = await workflowPromise;
      expect(result.status).toBe('completed');

      // Check status after completion
      const finalStatus = orchestrator.getWorkflowStatus('status-workflow');
      expect(finalStatus.isRunning).toBe(false);
    });

    it('should prevent duplicate workflow execution', async () => {
      const workflow = WorkflowBuilder.create('duplicate-workflow', 'Duplicate Workflow')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      // Start first workflow
      const firstPromise = orchestrator.executeWorkflow(workflow);

      // Try to start duplicate - should throw
      await expect(orchestrator.executeWorkflow(workflow)).rejects.toThrow();

      // Complete first workflow
      await firstPromise;
    });

    it('should cancel workflows', async () => {
      const workflow = WorkflowBuilder.create('cancellable-workflow', 'Cancellable Workflow')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      const workflowPromise = orchestrator.executeWorkflow(workflow);
      const cancelled = await orchestrator.cancelWorkflow('cancellable-workflow');

      expect(cancelled).toBe(true);

      // Wait for workflow to complete
      await workflowPromise;
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track orchestrator metrics', async () => {
      const workflow = WorkflowBuilder.create('metrics-workflow', 'Metrics Workflow')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      await orchestrator.executeWorkflow(workflow);

      const metrics = orchestrator.getMetrics();
      expect(metrics.workflowsExecuted).toBe(1);
      expect(metrics.tasksCompleted).toBe(1);
      expect(metrics.totalExecutionTime).toBeGreaterThan(0);
    });

    it('should publish workflow events', async () => {
      const workflow = WorkflowBuilder.create('events-workflow', 'Events Workflow')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      await orchestrator.executeWorkflow(workflow);

      // Should have published workflow.started and workflow.completed events
      const publishedTypes = mockEventBus.published.map((e) => e.type);
      expect(publishedTypes).toContain('workflow.started');
      expect(publishedTypes).toContain('workflow.completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agent types', async () => {
      const workflow = {
        id: 'invalid-workflow',
        name: 'Invalid Workflow',
        tasks: [
          {
            id: 'invalid-task',
            agentType: 'non-existent' as any,
            input: {},
          },
        ],
      };

      await expect(orchestrator.executeWorkflow(workflow as any)).rejects.toThrow();
    });

    it('should handle circular dependencies', async () => {
      const workflow = {
        id: 'circular-workflow',
        name: 'Circular Workflow',
        tasks: [
          {
            id: 'task-a',
            agentType: 'code-analysis',
            input: { sourceCode: 'test', language: 'javascript', analysisType: 'review' },
            dependsOn: ['task-b'],
          },
          {
            id: 'task-b',
            agentType: 'code-analysis',
            input: { sourceCode: 'test', language: 'javascript', analysisType: 'review' },
            dependsOn: ['task-a'],
          },
        ],
      };

      const result = await orchestrator.executeWorkflow(workflow as any);
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveProperty('dependency');
    });
  });
});

describe('WorkflowBuilder', () => {
  describe('Workflow Construction', () => {
    it('should build simple workflow', () => {
      const workflow = WorkflowBuilder.create('simple', 'Simple Workflow')
        .description('A simple workflow for testing')
        .addCodeAnalysis({
          sourceCode: 'function test() {}',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      expect(workflow.id).toBe('simple');
      expect(workflow.name).toBe('Simple Workflow');
      expect(workflow.description).toBe('A simple workflow for testing');
      expect(workflow.tasks).toHaveLength(1);
      expect(workflow.tasks[0].agentType).toBe('code-analysis');
    });

    it('should build complex workflow with all agent types', () => {
      const workflow = WorkflowBuilder.create('complex', 'Complex Workflow')
        .parallel(true)
        .timeout(60000)
        .addCodeAnalysis(
          {
            sourceCode: 'function add(a, b) { return a + b; }',
            language: 'javascript',
            analysisType: 'review',
          },
          { priority: 'high' },
        )
        .addTestGeneration(
          {
            sourceCode: 'function add(a, b) { return a + b; }',
            language: 'javascript',
            testType: 'unit',
            framework: 'vitest',
          },
          { dependsOn: ['code-analysis'] },
        )
        .addDocumentation(
          {
            sourceCode: 'function add(a, b) { return a + b; }',
            language: 'javascript',
            documentationType: 'api',
            outputFormat: 'markdown',
          },
          { priority: 'low' },
        )
        .build();

      expect(workflow.parallel).toBe(true);
      expect(workflow.timeout).toBe(60000);
      expect(workflow.tasks).toHaveLength(3);
      expect(workflow.tasks.map((t) => t.agentType)).toEqual([
        'code-analysis',
        'test-generation',
        'documentation',
      ]);
    });

    it('should require ID and name', () => {
      expect(() => {
        new (WorkflowBuilder as any)().build();
      }).toThrow();
    });

    it('should generate task IDs when not provided', () => {
      const workflow = WorkflowBuilder.create('auto-id', 'Auto ID Workflow')
        .addCodeAnalysis({
          sourceCode: 'test',
          language: 'javascript',
          analysisType: 'review',
        })
        .addCodeAnalysis({
          sourceCode: 'test2',
          language: 'javascript',
          analysisType: 'review',
        })
        .build();

      expect(workflow.tasks[0].id).toBeDefined();
      expect(workflow.tasks[1].id).toBeDefined();
      expect(workflow.tasks[0].id).not.toBe(workflow.tasks[1].id);
    });
  });
});
