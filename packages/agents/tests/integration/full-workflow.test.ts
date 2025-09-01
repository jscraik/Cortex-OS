/**
 * Integration Tests for Complete Agent Workflows
 *
 * Tests the entire agent ecosystem working together:
 * - All three agents (code-analysis, test-generation, documentation)
 * - A2A event bus integration
 * - Agent orchestration
 * - End-to-end workflows
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AgentOrchestrator,
  createCodeAnalysisAgent,
  createDocumentationAgent,
  createEventBus,
  createOrchestrator,
  createTestGenerationAgent,
  WorkflowBuilder,
} from '@/index.js';
import type { EventBus, MCPClient, ModelProvider } from '@/lib/types.js';

describe('Full Agent Workflow Integration', () => {
  let mockProvider: ModelProvider;
  let eventBus: EventBus;
  let mockMCPClient: MCPClient;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    // Create mock provider with realistic responses
    mockProvider = {
      name: 'integration-test-provider',
      generate: vi.fn().mockImplementation(async (prompt: string) => {
        // Return different responses based on prompt content
        if (prompt.includes('test')) {
          return {
            text: JSON.stringify({
              tests: [
                {
                  name: 'should calculate sum correctly',
                  code: 'it("should calculate sum correctly", () => {\n  expect(add(2, 3)).toBe(5);\n});',
                  type: 'positive-case',
                },
                {
                  name: 'should handle zero values',
                  code: 'it("should handle zero values", () => {\n  expect(add(0, 5)).toBe(5);\n});',
                  type: 'edge-case',
                },
              ],
              framework: 'vitest',
              language: 'javascript',
              testType: 'unit',
              coverage: {
                estimated: 95,
                branches: ['positive-path', 'zero-handling'],
                uncoveredPaths: [],
              },
              imports: ['import { add } from "./math.js";'],
              setup: 'describe("Math Functions", () => {',
              teardown: '});',
              confidence: 0.93,
              testCount: 2,
              analysisTime: 1800,
            }),
            usage: { promptTokens: 200, completionTokens: 400, totalTokens: 600 },
            latencyMs: 1800,
            provider: 'integration-test-provider',
          };
        } else if (prompt.includes('documentation')) {
          return {
            text: JSON.stringify({
              sections: [
                {
                  title: 'add',
                  type: 'function',
                  content:
                    '## add\n\nAdds two numbers together.\n\n### Parameters\n\n- `a: number` - First number\n- `b: number` - Second number\n\n### Returns\n\n`number` - The sum of a and b\n\n### Example\n\n```javascript\nconst result = add(2, 3); // 5\n```',
                  examples: ['const result = add(2, 3);'],
                  parameters: ['a: number', 'b: number'],
                  returnType: 'number',
                },
              ],
              format: 'markdown',
              language: 'javascript',
              documentationType: 'api',
              metadata: {
                generatedAt: '2025-01-15T10:30:00Z',
                wordCount: 35,
                sectionsCount: 1,
                hasExamples: true,
                hasTypes: true,
              },
              confidence: 0.91,
              processingTime: 2200,
            }),
            usage: { promptTokens: 250, completionTokens: 450, totalTokens: 700 },
            latencyMs: 2200,
            provider: 'integration-test-provider',
          };
        } else {
          // Code analysis response
          return {
            text: JSON.stringify({
              suggestions: [
                {
                  type: 'improvement',
                  message: 'Consider adding input validation for parameters',
                  line: 1,
                  severity: 'medium',
                  category: 'maintainability',
                },
                {
                  type: 'optimization',
                  message: 'Function is well-optimized for its purpose',
                  severity: 'low',
                  category: 'performance',
                },
              ],
              complexity: {
                cyclomatic: 2,
                cognitive: 1,
                maintainability: 'excellent',
              },
              security: {
                vulnerabilities: [],
                riskLevel: 'low',
              },
              performance: {
                bottlenecks: [],
                memoryUsage: 'low',
                algorithmicComplexity: 'O(1)',
              },
              confidence: 0.94,
              analysisTime: 1500,
            }),
            usage: { promptTokens: 150, completionTokens: 300, totalTokens: 450 },
            latencyMs: 1500,
            provider: 'integration-test-provider',
          };
        }
      }),
      shutdown: vi.fn(),
    };

    // Create event bus
    eventBus = createEventBus({
      enableLogging: false,
      bufferSize: 10,
      flushInterval: 100,
    });

    // Create mock MCP client
    mockMCPClient = {
      name: 'integration-test-mcp',
      callTool: vi.fn().mockResolvedValue({ result: 'success' }),
      listTools: vi.fn().mockResolvedValue([]),
      shutdown: vi.fn(),
    };

    // Create orchestrator
    orchestrator = createOrchestrator({
      providers: {
        primary: mockProvider,
      },
      eventBus,
      mcpClient: mockMCPClient,
      maxConcurrentTasks: 3,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    orchestrator.shutdown();
    eventBus.shutdown();
  });

  describe('Individual Agent Integration', () => {
    it('should create and execute code analysis agent', async () => {
      const agent = createCodeAnalysisAgent({
        provider: mockProvider,
        eventBus,
        mcpClient: mockMCPClient,
      });

      const result = await agent.execute({
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        analysisType: 'review',
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.complexity).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should create and execute test generation agent', async () => {
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus,
        mcpClient: mockMCPClient,
      });

      const result = await agent.execute({
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
      });

      expect(result).toBeDefined();
      expect(result.tests).toBeInstanceOf(Array);
      expect(result.tests.length).toBeGreaterThan(0);
      expect(result.framework).toBe('vitest');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should create and execute documentation agent', async () => {
      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus,
        mcpClient: mockMCPClient,
      });

      const result = await agent.execute({
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        documentationType: 'api',
        outputFormat: 'markdown',
      });

      expect(result).toBeDefined();
      expect(result.sections).toBeInstanceOf(Array);
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.format).toBe('markdown');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit and handle agent lifecycle events', async () => {
      const events: any[] = [];

      // Subscribe to all agent events
      eventBus.subscribe('agent.started', (event) => events.push(event));
      eventBus.subscribe('agent.completed', (event) => events.push(event));
      eventBus.subscribe('agent.failed', (event) => events.push(event));

      const agent = createCodeAnalysisAgent({
        provider: mockProvider,
        eventBus,
        mcpClient: mockMCPClient,
      });

      await agent.execute({
        sourceCode: 'function test() { return 42; }',
        language: 'javascript',
        analysisType: 'review',
      });

      // Should have received started and completed events
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('agent.started');
      expect(events[1].type).toBe('agent.completed');

      // Verify event data structure
      expect(events[0].data.capability).toBe('code-analysis');
      expect(events[1].data.capability).toBe('code-analysis');
      expect(events[1].data.metrics.latencyMs).toBeGreaterThan(0);
    });

    it('should track event bus metrics', () => {
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus,
        mcpClient: mockMCPClient,
      });

      // Execute agent to generate events
      agent.execute({
        sourceCode: 'function multiply(x, y) { return x * y; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'jest',
      });

      const stats = eventBus.getStats();
      expect(stats.totalEventsPublished).toBeGreaterThan(0);
    });
  });

  describe('Orchestrated Workflows', () => {
    it('should execute complete code analysis workflow', async () => {
      const sourceCode = `
        function calculateTotal(items) {
          if (!items || items.length === 0) {
            return 0;
          }
          return items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
      `;

      const workflow = WorkflowBuilder.create('complete-analysis', 'Complete Code Analysis')
        .description('Analyze, test, and document a JavaScript function')
        .addCodeAnalysis(
          {
            sourceCode,
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'analysis', priority: 'high' },
        )
        .addTestGeneration(
          {
            sourceCode,
            language: 'javascript',
            testType: 'unit',
            framework: 'vitest',
            includeEdgeCases: true,
          },
          { id: 'tests', dependsOn: ['analysis'] },
        )
        .addDocumentation(
          {
            sourceCode,
            language: 'javascript',
            documentationType: 'api',
            outputFormat: 'markdown',
            audience: 'developer',
          },
          { id: 'docs', dependsOn: ['analysis'] },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(Object.keys(result.results)).toHaveLength(3);
      expect(result.results.analysis).toBeDefined();
      expect(result.results.tests).toBeDefined();
      expect(result.results.docs).toBeDefined();
      expect(result.metrics.tasksCompleted).toBe(3);
    });

    it('should execute parallel workflow efficiently', async () => {
      const workflow = WorkflowBuilder.create('parallel-analysis', 'Parallel Analysis')
        .parallel(true)
        .addCodeAnalysis(
          {
            sourceCode: 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }',
            language: 'javascript',
            analysisType: 'performance',
          },
          { id: 'perf-analysis' },
        )
        .addCodeAnalysis(
          {
            sourceCode: 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }',
            language: 'javascript',
            analysisType: 'security',
          },
          { id: 'sec-analysis' },
        )
        .addCodeAnalysis(
          {
            sourceCode: 'function sum(arr) { return arr.reduce((a, b) => a + b, 0); }',
            language: 'javascript',
            analysisType: 'review',
          },
          { id: 'code-review' },
        )
        .build();

      const startTime = Date.now();
      const result = await orchestrator.executeWorkflow(workflow);
      const executionTime = Date.now() - startTime;

      expect(result.status).toBe('completed');
      expect(Object.keys(result.results)).toHaveLength(3);

      // Parallel execution should be faster than sequential
      // With 3 tasks each taking ~1.5s, parallel should be ~1.5s vs ~4.5s sequential
      expect(executionTime).toBeLessThan(5000);
    });

    it('should handle complex dependency chains', async () => {
      const workflow = WorkflowBuilder.create('dependency-chain', 'Complex Dependencies')
        .addCodeAnalysis(
          {
            sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
            language: 'javascript',
            analysisType: 'architecture',
          },
          { id: 'arch-analysis' },
        )
        .addCodeAnalysis(
          {
            sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
            language: 'javascript',
            analysisType: 'security',
          },
          { id: 'security-scan', dependsOn: ['arch-analysis'] },
        )
        .addTestGeneration(
          {
            sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
            language: 'javascript',
            testType: 'unit',
            framework: 'jest',
          },
          { id: 'unit-tests', dependsOn: ['security-scan'] },
        )
        .addDocumentation(
          {
            sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
            language: 'javascript',
            documentationType: 'api',
            outputFormat: 'markdown',
          },
          { id: 'api-docs', dependsOn: ['unit-tests'] },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.metrics.tasksCompleted).toBe(4);

      // Verify tasks executed in correct order
      expect(result.results['arch-analysis']).toBeDefined();
      expect(result.results['security-scan']).toBeDefined();
      expect(result.results['unit-tests']).toBeDefined();
      expect(result.results['api-docs']).toBeDefined();
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle real-world JavaScript function analysis', async () => {
      const realWorldCode = `
        /**
         * Validates and processes user input for a registration form
         * @param {Object} userData - User registration data
         * @returns {Object} Processed and validated user data
         */
        function processUserRegistration(userData) {
          // Input validation
          if (!userData || typeof userData !== 'object') {
            throw new Error('Invalid user data provided');
          }

          const { email, password, name, age } = userData;

          // Email validation
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!email || !emailRegex.test(email)) {
            throw new Error('Invalid email address');
          }

          // Password strength check
          if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
          }

          // Age validation
          if (age && (typeof age !== 'number' || age < 13 || age > 120)) {
            throw new Error('Invalid age provided');
          }

          // Return processed data
          return {
            email: email.toLowerCase().trim(),
            name: name ? name.trim() : '',
            age: age || null,
            registrationDate: new Date().toISOString()
          };
        }
      `;

      const workflow = WorkflowBuilder.create('real-world-analysis', 'Real World Function Analysis')
        .description('Complete analysis of a real-world JavaScript function')
        .addCodeAnalysis(
          {
            sourceCode: realWorldCode,
            language: 'javascript',
            analysisType: 'review',
            focus: ['complexity', 'security', 'maintainability'],
          },
          { id: 'comprehensive-analysis' },
        )
        .addTestGeneration(
          {
            sourceCode: realWorldCode,
            language: 'javascript',
            testType: 'unit',
            framework: 'vitest',
            includeEdgeCases: true,
            coverageTarget: 95,
          },
          { id: 'comprehensive-tests', dependsOn: ['comprehensive-analysis'] },
        )
        .addDocumentation(
          {
            sourceCode: realWorldCode,
            language: 'javascript',
            documentationType: 'api',
            outputFormat: 'markdown',
            includeExamples: true,
            audience: 'developer',
          },
          { id: 'comprehensive-docs', dependsOn: ['comprehensive-analysis'] },
        )
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');

      // Verify analysis results
      const analysis = result.results['comprehensive-analysis'];
      expect(analysis.suggestions).toBeInstanceOf(Array);
      expect(analysis.complexity.cyclomatic).toBeGreaterThan(1);
      expect(analysis.security).toBeDefined();

      // Verify test generation results
      const tests = result.results['comprehensive-tests'];
      expect(tests.tests).toBeInstanceOf(Array);
      expect(tests.tests.length).toBeGreaterThan(1);
      expect(tests.coverage.estimated).toBeGreaterThan(80);

      // Verify documentation results
      const docs = result.results['comprehensive-docs'];
      expect(docs.sections).toBeInstanceOf(Array);
      expect(docs.sections.length).toBeGreaterThan(0);
      expect(docs.format).toBe('markdown');

      // Verify overall workflow metrics
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.agentsUsed).toContain('code-analysis');
      expect(result.metrics.agentsUsed).toContain('test-generation');
      expect(result.metrics.agentsUsed).toContain('documentation');
    });

    it('should maintain state consistency across agents', async () => {
      const eventLog: any[] = [];

      // Track all events for state consistency
      ['agent.started', 'agent.completed', 'agent.failed'].forEach((eventType) => {
        eventBus.subscribe(eventType, (event) => {
          eventLog.push({
            timestamp: Date.now(),
            type: event.type,
            agentId: event.data.agentId,
            capability: event.data.capability,
          });
        });
      });

      const workflow = WorkflowBuilder.create('state-consistency', 'State Consistency Test')
        .addCodeAnalysis(
          {
            sourceCode:
              'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
            language: 'javascript',
            analysisType: 'performance',
          },
          { id: 'fib-analysis' },
        )
        .addTestGeneration(
          {
            sourceCode:
              'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
            language: 'javascript',
            testType: 'unit',
            framework: 'vitest',
          },
          { id: 'fib-tests', dependsOn: ['fib-analysis'] },
        )
        .build();

      await orchestrator.executeWorkflow(workflow);

      // Verify event ordering and consistency
      expect(eventLog.length).toBe(4); // 2 agents × 2 events each

      const analysisEvents = eventLog.filter((e) => e.capability === 'code-analysis');
      const testEvents = eventLog.filter((e) => e.capability === 'test-generation');

      expect(analysisEvents.length).toBe(2);
      expect(testEvents.length).toBe(2);

      // Analysis should start before test generation
      const analysisStart = analysisEvents.find((e) => e.type === 'agent.started');
      const testStart = testEvents.find((e) => e.type === 'agent.started');

      expect(analysisStart.timestamp).toBeLessThan(testStart.timestamp);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-throughput workflows', async () => {
      const workflows = Array.from({ length: 5 }, (_, i) =>
        WorkflowBuilder.create(`throughput-${i}`, `Throughput Test ${i}`)
          .parallel(true)
          .addCodeAnalysis(
            {
              sourceCode: `function test${i}() { return ${i}; }`,
              language: 'javascript',
              analysisType: 'review',
            },
            { id: `analysis-${i}` },
          )
          .build(),
      );

      const startTime = Date.now();
      const results = await Promise.all(
        workflows.map((workflow) => orchestrator.executeWorkflow(workflow)),
      );
      const executionTime = Date.now() - startTime;

      // All workflows should complete successfully
      results.forEach((result) => {
        expect(result.status).toBe('completed');
      });

      // Should complete in reasonable time (parallel execution)
      expect(executionTime).toBeLessThan(10000); // 10 seconds max

      const metrics = orchestrator.getMetrics();
      expect(metrics.workflowsExecuted).toBe(5);
      expect(metrics.tasksCompleted).toBe(5);
    });

    it('should provide comprehensive metrics and monitoring', async () => {
      const workflow = WorkflowBuilder.create('metrics-test', 'Metrics Collection Test')
        .addCodeAnalysis({
          sourceCode: 'function testMetrics() { return "metrics"; }',
          language: 'javascript',
          analysisType: 'review',
        })
        .addTestGeneration({
          sourceCode: 'function testMetrics() { return "metrics"; }',
          language: 'javascript',
          testType: 'unit',
          framework: 'vitest',
        })
        .build();

      const result = await orchestrator.executeWorkflow(workflow);

      // Verify workflow metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.tasksCompleted).toBe(2);
      expect(result.metrics.tasksTotal).toBe(2);
      expect(result.metrics.agentsUsed).toHaveLength(2);

      // Verify orchestrator metrics
      const orchestratorMetrics = orchestrator.getMetrics();
      expect(orchestratorMetrics.workflowsExecuted).toBeGreaterThan(0);
      expect(orchestratorMetrics.tasksCompleted).toBeGreaterThan(0);
      expect(orchestratorMetrics.averageTaskTime).toBeGreaterThan(0);

      // Verify event bus metrics
      const eventBusStats = eventBus.getStats();
      expect(eventBusStats.totalEventsPublished).toBeGreaterThan(0);
    });
  });
});
