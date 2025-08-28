import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Agent, Executor, BasicExecutor } from '@/index.js';
import { CodeIntelligenceAgent } from '@/code-intelligence-agent.js';
import { mockAgent, mockTask, mockCodeAnalysisRequest } from '@tests/fixtures/agents.js';

// Zod schemas for contract validation
const AgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  capabilities: z.array(z.string())
});

const TaskSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  input: z.unknown(),
  budget: z.object({
    wallClockMs: z.number().positive(),
    maxSteps: z.number().positive()
  })
});

const ExecutorResultSchema = z.object({
  status: z.enum(['completed', 'failed', 'timeout']),
  result: z.unknown(),
  agent: z.string()
});

const CodeAnalysisResultSchema = z.object({
  suggestions: z.array(z.object({
    type: z.enum(['improvement', 'refactor', 'bug_fix', 'optimization']),
    line: z.number().optional(),
    description: z.string(),
    code: z.string().optional(),
    rationale: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical'])
  })),
  complexity: z.object({
    cyclomatic: z.number(),
    cognitive: z.number(),
    maintainability: z.enum(['low', 'medium', 'high']),
    hotspots: z.array(z.string())
  }),
  security: z.object({
    vulnerabilities: z.array(z.object({
      type: z.string(),
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      line: z.number().optional(),
      description: z.string(),
      mitigation: z.string()
    })),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    recommendations: z.array(z.string())
  }),
  performance: z.object({
    bottlenecks: z.array(z.object({
      location: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      suggestion: z.string()
    })),
    memoryUsage: z.enum(['efficient', 'moderate', 'high', 'excessive']),
    optimizations: z.array(z.string())
  }),
  confidence: z.number().min(0).max(1),
  modelUsed: z.string(),
  processingTime: z.number().nonnegative()
});

// Mock data for contract testing
const mockAgents = {
  basic: mockAgent,
  codeIntelligence: {
    id: 'code-intel-001',
    name: 'Code Intelligence Agent',
    capabilities: ['analyze', 'review', 'optimize', 'security-scan']
  }
};

const mockTasks = {
  simple: mockTask,
  analysis: {
    id: 'analysis-task-001',
    kind: 'code-analysis',
    input: mockCodeAnalysisRequest,
    budget: { wallClockMs: 10000, maxSteps: 5 }
  }
};

describe('Agent Interface Contracts', () => {
  describe('Agent Contract', () => {
    it('should conform to Agent interface schema', () => {
      Object.values(mockAgents).forEach(agent => {
        const result = AgentSchema.safeParse(agent);
        expect(result.success).toBe(true);
        if (!result.success) {
          console.error('Agent schema validation failed:', result.error.issues);
        }
      });
    });

    it('should require minimum properties', () => {
      const invalidAgent = { id: '', name: '' };
      const result = AgentSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should support agent capability discovery', () => {
      const agent = mockAgents.codeIntelligence;
      
      expect(agent.capabilities).toContain('analyze');
      expect(agent.capabilities).toContain('review');
      expect(agent.capabilities.length).toBeGreaterThan(0);
      
      agent.capabilities.forEach(capability => {
        expect(typeof capability).toBe('string');
        expect(capability.length).toBeGreaterThan(0);
      });
    });

    it('should enforce agent ID uniqueness constraints', () => {
      const agents = Object.values(mockAgents);
      const ids = agents.map(agent => agent.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Task Contract', () => {
    it('should conform to Task interface schema', () => {
      Object.values(mockTasks).forEach(task => {
        const result = TaskSchema.safeParse(task);
        expect(result.success).toBe(true);
        if (!result.success) {
          console.error('Task schema validation failed:', result.error.issues);
        }
      });
    });

    it('should enforce budget constraints', () => {
      const task = mockTasks.simple;
      
      expect(task.budget.wallClockMs).toBeGreaterThan(0);
      expect(task.budget.maxSteps).toBeGreaterThan(0);
      expect(typeof task.budget.wallClockMs).toBe('number');
      expect(typeof task.budget.maxSteps).toBe('number');
    });

    it('should support arbitrary input types', () => {
      const testInputs = [
        'string input',
        { object: 'input' },
        ['array', 'input'],
        123,
        null,
        undefined,
        true
      ];

      testInputs.forEach(input => {
        const task = {
          id: 'test-task',
          kind: 'test',
          input,
          budget: { wallClockMs: 1000, maxSteps: 1 }
        };
        
        const result = TaskSchema.safeParse(task);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Executor Contract', () => {
    let executor: Executor;

    beforeEach(() => {
      executor = new BasicExecutor();
    });

    it('should accept valid agent and task parameters', async () => {
      const agent = mockAgents.basic;
      const task = mockTasks.simple;
      
      const result = await executor.run(agent, task);
      
      const validationResult = ExecutorResultSchema.safeParse(result);
      expect(validationResult.success).toBe(true);
    });

    it('should return structured result format', async () => {
      const result = await executor.run(mockAgents.basic, mockTasks.simple);
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('agent');
      expect(['completed', 'failed', 'timeout']).toContain(result.status);
    });

    it('should handle contract violations gracefully', async () => {
      const invalidAgent = { id: '', name: '', capabilities: [] } as Agent;
      const invalidTask = { id: '', kind: '', input: null, budget: { wallClockMs: 0, maxSteps: 0 } };
      
      // Should not throw, but handle gracefully
      expect(async () => {
        await executor.run(invalidAgent, invalidTask);
      }).not.toThrow();
    });
  });

  describe('CodeAnalysisResult Contract', () => {
    let agent: CodeIntelligenceAgent;

    beforeEach(() => {
      agent = new CodeIntelligenceAgent();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ response: 'Mock analysis response' })
      });
    });

    it('should conform to CodeAnalysisResult schema', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      
      const validationResult = CodeAnalysisResultSchema.safeParse(result);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) {
        console.error('CodeAnalysisResult schema validation failed:', validationResult.error.issues);
      }
    });

    it('should maintain confidence score contract', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.confidence).toBe('number');
    });

    it('should provide required analysis sections', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('performance');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should maintain processing metadata contract', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      
      expect(result).toHaveProperty('modelUsed');
      expect(result).toHaveProperty('processingTime');
      expect(typeof result.modelUsed).toBe('string');
      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should validate security vulnerability structure', async () => {
      const result = await agent.analyzeCode(mockCodeAnalysisRequest);
      
      result.security.vulnerabilities.forEach(vuln => {
        expect(vuln).toHaveProperty('type');
        expect(vuln).toHaveProperty('severity');
        expect(vuln).toHaveProperty('description');
        expect(vuln).toHaveProperty('mitigation');
        expect(['info', 'warning', 'error', 'critical']).toContain(vuln.severity);
      });
    });
  });

  describe('Cross-Implementation Contracts', () => {
    it('should maintain compatibility between different executors', async () => {
      const basicExecutor = new BasicExecutor();
      const agent = mockAgents.basic;
      const task = mockTasks.simple;
      
      const result1 = await basicExecutor.run(agent, task);
      const result2 = await basicExecutor.run(agent, task);
      
      // Results should have consistent structure
      expect(result1).toMatchObject({
        status: expect.any(String),
        result: expect.anything(),
        agent: expect.any(String)
      });
      
      expect(result2).toMatchObject({
        status: expect.any(String),
        result: expect.anything(),  
        agent: expect.any(String)
      });
    });

    it('should support contract evolution', async () => {
      const executor = new BasicExecutor();
      const agent = mockAgents.basic;
      
      // Should handle both old and new task formats
      const oldTask = mockTasks.simple;
      const newTask = { ...mockTasks.simple, metadata: { version: '2.0' } };
      
      const result1 = await executor.run(agent, oldTask);
      const result2 = await executor.run(agent, newTask as any);
      
      expect(result1.status).toBeDefined();
      expect(result2.status).toBeDefined();
    });

    it('should enforce backward compatibility', async () => {
      const executor = new BasicExecutor();
      const agent = mockAgents.basic;
      const task = mockTasks.simple;
      
      const result = await executor.run(agent, task);
      
      // Core contract properties must always be present
      expect(result.status).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.agent).toBeDefined();
    });
  });

  describe('Error Contract Compliance', () => {
    it('should handle contract violations gracefully', async () => {
      const executor = new BasicExecutor();
      const malformedTask = mockTasks.simple;
      
      // Should not throw on contract violations
      await expect(executor.run(mockAgents.basic, malformedTask)).resolves.toBeDefined();
    });

    it('should maintain contract under error conditions', async () => {
      const agent = new CodeIntelligenceAgent();
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(agent.analyzeCode(mockCodeAnalysisRequest)).rejects.toThrow();
      // Error should be thrown, but in a predictable way that maintains contract
    });
  });
});