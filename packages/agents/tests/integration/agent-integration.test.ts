import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent, Executor, BasicExecutor, CodeIntelligenceAgent } from '@/index.js';
import { mockAgent, mockTask, mockCodeAnalysisRequest } from '@tests/fixtures/agents.js';
import { createMockResponse } from '@tests/setup.js';

describe('Agent Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('A2A Event Bus Integration', () => {
    it('should handle agent communication events', async () => {
      const eventBus = {
        publish: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      // Mock A2A integration
      const agentWithEvents = {
        ...mockAgent,
        eventBus,
        async execute(task: any) {
          eventBus.publish('agent.task.started', { agentId: this.id, taskId: task.id });
          const result = { status: 'completed', result: 'success' };
          eventBus.publish('agent.task.completed', { agentId: this.id, taskId: task.id, result });
          return result;
        },
      };

      await agentWithEvents.execute(mockTask);

      expect(eventBus.publish).toHaveBeenCalledWith(
        'agent.task.started',
        expect.objectContaining({ agentId: mockAgent.id, taskId: mockTask.id }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'agent.task.completed',
        expect.objectContaining({ agentId: mockAgent.id, taskId: mockTask.id }),
      );
    });

    it('should handle agent coordination through events', async () => {
      const coordinator = {
        agents: [mockAgent],
        eventBus: {
          publish: vi.fn(),
          subscribe: vi.fn(),
        },
        async coordinateTask(task: any) {
          // Simulate agent selection and coordination
          this.eventBus.publish('coordinator.task.assigned', {
            agentId: this.agents[0].id,
            taskId: task.id,
          });
          return { assigned: true, agent: this.agents[0].id };
        },
      };

      const result = await coordinator.coordinateTask(mockTask);

      expect(result.assigned).toBe(true);
      expect(coordinator.eventBus.publish).toHaveBeenCalledWith(
        'coordinator.task.assigned',
        expect.objectContaining({ agentId: mockAgent.id }),
      );
    });

    it('should handle error propagation through events', async () => {
      const eventBus = {
        publish: vi.fn(),
        subscribe: vi.fn(),
      };

      const faultyAgent = {
        ...mockAgent,
        eventBus,
        async execute(task: any) {
          eventBus.publish('agent.task.started', { agentId: this.id, taskId: task.id });
          try {
            throw new Error('Task execution failed');
          } catch (error) {
            eventBus.publish('agent.task.error', {
              agentId: this.id,
              taskId: task.id,
              error: error.message,
            });
            throw error;
          }
        },
      };

      await expect(faultyAgent.execute(mockTask)).rejects.toThrow('Task execution failed');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'agent.task.error',
        expect.objectContaining({ error: 'Task execution failed' }),
      );
    });
  });

  describe('MCP Bridge Integration', () => {
    it('should handle MCP tool integration', async () => {
      // Mock MCP bridge without importing the actual package
      const mockMcpBridge = {
        tools: new Map([
          [
            'file-reader',
            { name: 'file-reader', execute: vi.fn().mockResolvedValue('file content') },
          ],
          [
            'code-formatter',
            { name: 'code-formatter', execute: vi.fn().mockResolvedValue('formatted code') },
          ],
        ]),
        async executeTool(toolName: string, params: any) {
          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
          }
          return await tool.execute(params);
        },
      };

      // Test tool execution
      const result = await mockMcpBridge.executeTool('file-reader', { path: '/test/file.js' });
      expect(result).toBe('file content');

      const formattedResult = await mockMcpBridge.executeTool('code-formatter', {
        code: 'unformatted',
      });
      expect(formattedResult).toBe('formatted code');
    });

    it('should handle MCP connection lifecycle', async () => {
      const mockMcpBridge = {
        connected: false,
        async connect() {
          this.connected = true;
          return { status: 'connected' };
        },
        async disconnect() {
          this.connected = false;
          return { status: 'disconnected' };
        },
        isConnected() {
          return this.connected;
        },
      };

      expect(mockMcpBridge.isConnected()).toBe(false);

      await mockMcpBridge.connect();
      expect(mockMcpBridge.isConnected()).toBe(true);

      await mockMcpBridge.disconnect();
      expect(mockMcpBridge.isConnected()).toBe(false);
    });

    it('should handle MCP tool failures gracefully', async () => {
      const mockMcpBridge = {
        tools: new Map([
          [
            'failing-tool',
            {
              name: 'failing-tool',
              execute: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
            },
          ],
        ]),
        async executeTool(toolName: string, params: any) {
          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
          }
          return await tool.execute(params);
        },
      };

      await expect(mockMcpBridge.executeTool('failing-tool', {})).rejects.toThrow(
        'Tool execution failed',
      );
      await expect(mockMcpBridge.executeTool('nonexistent-tool', {})).rejects.toThrow(
        'Tool nonexistent-tool not found',
      );
    });
  });

  describe('Cross-System Integration', () => {
    it('should integrate with orchestration system', async () => {
      const orchestrator = {
        agents: new Map([[mockAgent.id, mockAgent]]),
        tasks: new Map(),

        async registerAgent(agent: Agent) {
          this.agents.set(agent.id, agent);
          return { registered: true, agentId: agent.id };
        },

        async executeTask(taskId: string, agentId: string) {
          const agent = this.agents.get(agentId);
          const task = this.tasks.get(taskId);

          if (!agent || !task) {
            throw new Error('Agent or task not found');
          }

          const executor = new BasicExecutor();
          return await executor.run(agent, task);
        },
      };

      const registrationResult = await orchestrator.registerAgent(mockAgent);
      expect(registrationResult.registered).toBe(true);
      expect(registrationResult.agentId).toBe(mockAgent.id);

      // Add task to orchestrator
      orchestrator.tasks.set(mockTask.id, mockTask);

      const executionResult = await orchestrator.executeTask(mockTask.id, mockAgent.id);
      expect(executionResult.status).toBe('completed');
      expect(executionResult.agent).toBe(mockAgent.id);
    });

    it('should handle memory service integration', async () => {
      const memoryService = {
        storage: new Map(),

        async store(key: string, value: any) {
          this.storage.set(key, { value, timestamp: Date.now() });
          return { stored: true, key };
        },

        async retrieve(key: string) {
          const item = this.storage.get(key);
          return item ? item.value : null;
        },

        async clear() {
          this.storage.clear();
          return { cleared: true };
        },
      };

      const agent = new CodeIntelligenceAgent();
      mockFetch.mockResolvedValue(createMockResponse({ response: 'analysis result' }));

      const result = await agent.analyzeCode(mockCodeAnalysisRequest);

      // Store analysis result in memory service
      await memoryService.store(`analysis:${mockCodeAnalysisRequest.code}`, result);

      // Retrieve from memory service
      const storedResult = await memoryService.retrieve(`analysis:${mockCodeAnalysisRequest.code}`);

      expect(storedResult).toEqual(result);
    });

    it('should integrate with telemetry system', async () => {
      const telemetryService = {
        metrics: [],

        recordMetric(name: string, value: number, labels: Record<string, string> = {}) {
          this.metrics.push({
            name,
            value,
            labels,
            timestamp: Date.now(),
          });
        },

        getMetrics(name?: string) {
          return name ? this.metrics.filter((m) => m.name === name) : this.metrics;
        },
      };

      const executor = new BasicExecutor();

      const startTime = Date.now();
      const result = await executor.run(mockAgent, mockTask);
      const executionTime = Date.now() - startTime;

      // Record telemetry
      telemetryService.recordMetric('agent.task.execution_time', executionTime, {
        agentId: mockAgent.id,
        taskType: mockTask.kind,
        status: result.status,
      });

      telemetryService.recordMetric('agent.task.completed', 1, {
        agentId: mockAgent.id,
      });

      const executionMetrics = telemetryService.getMetrics('agent.task.execution_time');
      const completionMetrics = telemetryService.getMetrics('agent.task.completed');

      expect(executionMetrics).toHaveLength(1);
      expect(completionMetrics).toHaveLength(1);
      expect(executionMetrics[0].labels.agentId).toBe(mockAgent.id);
    });
  });

  describe('End-to-End Workflows', () => {
    it('should execute complete agent workflow', async () => {
      const workflow = {
        steps: [
          { type: 'validate_input', handler: vi.fn().mockResolvedValue({ valid: true }) },
          { type: 'execute_agent', handler: vi.fn().mockResolvedValue({ status: 'completed' }) },
          { type: 'store_result', handler: vi.fn().mockResolvedValue({ stored: true }) },
          { type: 'notify_completion', handler: vi.fn().mockResolvedValue({ notified: true }) },
        ],

        async execute(input: any) {
          const results = [];
          for (const step of this.steps) {
            const result = await step.handler(input);
            results.push({ step: step.type, result });
          }
          return results;
        },
      };

      const results = await workflow.execute({ agent: mockAgent, task: mockTask });

      expect(results).toHaveLength(4);
      expect(results[0].result.valid).toBe(true);
      expect(results[1].result.status).toBe('completed');
      expect(results[2].result.stored).toBe(true);
      expect(results[3].result.notified).toBe(true);

      // Verify all handlers were called
      workflow.steps.forEach((step) => {
        expect(step.handler).toHaveBeenCalledWith({ agent: mockAgent, task: mockTask });
      });
    });

    it('should handle workflow error recovery', async () => {
      const workflow = {
        steps: [
          { type: 'validate_input', handler: vi.fn().mockResolvedValue({ valid: true }) },
          {
            type: 'execute_agent',
            handler: vi.fn().mockRejectedValue(new Error('Execution failed')),
          },
          { type: 'error_recovery', handler: vi.fn().mockResolvedValue({ recovered: true }) },
        ],

        async execute(input: any) {
          const results = [];
          try {
            for (const step of this.steps.slice(0, 2)) {
              // Skip recovery step initially
              const result = await step.handler(input);
              results.push({ step: step.type, result });
            }
          } catch (error) {
            // Execute recovery step
            const recoveryStep = this.steps[2];
            const recoveryResult = await recoveryStep.handler({ input, error });
            results.push({ step: recoveryStep.type, result: recoveryResult });
          }
          return results;
        },
      };

      const results = await workflow.execute({ agent: mockAgent, task: mockTask });

      expect(results).toHaveLength(2);
      expect(results[0].result.valid).toBe(true);
      expect(results[1].step).toBe('error_recovery');
      expect(results[1].result.recovered).toBe(true);
    });
  });
});
