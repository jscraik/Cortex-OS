/**
 * Tests for Test Generation Agent
 * 
 * TDD approach: Tests written first to define expected behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { ModelProvider, ExecutionContext } from '@/lib/types.js';
import { createMockEventBus, createMockMCPClient } from '@tests/setup.js';

// Test will drive the interface design
describe('Test Generation Agent', () => {
  let mockProvider: ModelProvider;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockMCPClient: ReturnType<typeof createMockMCPClient>;

  beforeEach(() => {
    mockProvider = {
      name: 'test-provider',
      generate: vi.fn(),
      shutdown: vi.fn()
    };
    mockEventBus = createMockEventBus();
    mockMCPClient = createMockMCPClient();
  });

  describe('Agent Creation', () => {
    it('should create test generation agent with correct capability', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      expect(agent.capability).toBe('test-generation');
      expect(agent.inputSchema).toBeInstanceOf(z.ZodSchema);
      expect(agent.outputSchema).toBeInstanceOf(z.ZodSchema);
      expect(typeof agent.execute).toBe('function');
    });

    it('should validate required dependencies', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      expect(() => createTestGenerationAgent({
        provider: null as any,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      })).toThrow('Provider is required');
    });
  });

  describe('Input Validation', () => {
    it('should validate unit test generation input', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const validInput = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
        includeEdgeCases: true,
        coverageTarget: 90
      };

      expect(() => agent.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should support multiple test frameworks', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const frameworks = ['vitest', 'jest', 'mocha', 'pytest', 'unittest', 'rspec'];
      
      for (const framework of frameworks) {
        const input = {
          sourceCode: 'def calculate(): return 42',
          language: 'python',
          testType: 'unit',
          framework
        };
        
        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should support different test types', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const testTypes = ['unit', 'integration', 'e2e', 'property'];
      
      for (const testType of testTypes) {
        const input = {
          sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
          language: 'typescript',
          testType,
          framework: 'vitest'
        };
        
        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should reject invalid input', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const invalidInput = {
        sourceCode: '', // Empty code
        language: 'invalid-language',
        testType: 'unknown-type',
        framework: 'unknown-framework'
      };

      expect(() => agent.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Test Generation Execution', () => {
    it('should generate comprehensive unit tests', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const mockGenerateResult = {
        text: JSON.stringify({
          tests: [
            {
              name: 'should add two positive numbers',
              code: 'it("should add two positive numbers", () => {\n  expect(add(2, 3)).toBe(5);\n});',
              type: 'positive-case'
            },
            {
              name: 'should handle zero values',
              code: 'it("should handle zero values", () => {\n  expect(add(0, 5)).toBe(5);\n  expect(add(3, 0)).toBe(3);\n});',
              type: 'edge-case'
            }
          ],
          framework: 'vitest',
          language: 'javascript',
          coverage: {
            estimated: 95,
            branches: ['positive', 'zero-handling'],
            uncoveredPaths: []
          },
          imports: ['import { add } from "./calculator.js";'],
          setup: 'describe("Calculator", () => {',
          teardown: '});',
          confidence: 0.92,
          testCount: 2,
          analysisTime: 1800
        }),
        usage: { promptTokens: 200, completionTokens: 400, totalTokens: 600 },
        latencyMs: 1800,
        provider: 'test-provider'
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
        includeEdgeCases: true,
        coverageTarget: 90
      };

      const result = await agent.execute(input);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].name).toBe('should add two positive numbers');
      expect(result.tests[0].type).toBe('positive-case');
      expect(result.coverage.estimated).toBe(95);
      expect(result.framework).toBe('vitest');
      expect(result.confidence).toBe(0.92);
    });

    it('should generate integration tests with mocking', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const mockGenerateResult = {
        text: JSON.stringify({
          tests: [
            {
              name: 'should fetch user data successfully',
              code: 'it("should fetch user data successfully", async () => {\n  const mockFetch = vi.fn().mockResolvedValue({ json: () => ({ id: 1, name: "John" }) });\n  global.fetch = mockFetch;\n  const result = await getUserData(1);\n  expect(result).toEqual({ id: 1, name: "John" });\n});',
              type: 'integration-success'
            }
          ],
          framework: 'vitest',
          language: 'typescript',
          coverage: { estimated: 85, branches: ['success'], uncoveredPaths: ['error-handling'] },
          imports: ['import { vi } from "vitest";', 'import { getUserData } from "./user-service.ts";'],
          mocks: [
            {
              target: 'fetch',
              type: 'global',
              implementation: 'vi.fn().mockResolvedValue(...)'
            }
          ],
          confidence: 0.88,
          testCount: 1,
          analysisTime: 2200
        }),
        usage: { promptTokens: 300, completionTokens: 500, totalTokens: 800 },
        latencyMs: 2200,
        provider: 'test-provider'
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'async function getUserData(id: number) { const response = await fetch(`/api/users/${id}`); return response.json(); }',
        language: 'typescript',
        testType: 'integration',
        framework: 'vitest',
        generateMocks: true
      };

      const result = await agent.execute(input);

      expect(result.tests[0].name).toBe('should fetch user data successfully');
      expect(result.mocks).toHaveLength(1);
      expect(result.mocks[0].target).toBe('fetch');
      expect(result.testType).toBe('integration');
    });

    it('should generate property-based tests', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const mockGenerateResult = {
        text: JSON.stringify({
          tests: [
            {
              name: 'addition should be commutative',
              code: 'test.prop([fc.integer(), fc.integer()], (a, b) => {\n  expect(add(a, b)).toBe(add(b, a));\n});',
              type: 'property-commutative'
            }
          ],
          framework: 'vitest',
          language: 'javascript',
          properties: ['commutative', 'associative'],
          imports: ['import fc from "fast-check";'],
          confidence: 0.94,
          testCount: 1,
          analysisTime: 2500
        }),
        usage: { promptTokens: 250, completionTokens: 350, totalTokens: 600 },
        latencyMs: 2500,
        provider: 'test-provider'
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'property',
        framework: 'vitest',
        propertyCount: 5
      };

      const result = await agent.execute(input);

      expect(result.tests[0].type).toBe('property-commutative');
      expect(result.properties).toContain('commutative');
      expect(result.testType).toBe('property');
    });

    it('should emit agent started and completed events', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      vi.mocked(mockProvider.generate).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return {
          text: JSON.stringify({ 
            tests: [{ name: 'basic test', code: 'it("works", () => {})', type: 'basic' }], 
            confidence: 0.9,
            testCount: 1,
            analysisTime: 1000,
            framework: 'vitest',
            language: 'javascript'
          }),
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
          latencyMs: 1000,
          provider: 'test-provider'
        };
      });
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'function test() { return true; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest'
      };

      await agent.execute(input);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      
      const startedEvent = mockEventBus.published[0];
      expect(startedEvent.type).toBe('agent.started');
      expect(startedEvent.data.capability).toBe('test-generation');
      
      const completedEvent = mockEventBus.published[1];
      expect(completedEvent.type).toBe('agent.completed');
      expect(completedEvent.data.metrics.latencyMs).toBeGreaterThan(0);
    });

    it('should handle provider errors gracefully', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const providerError = new Error('Provider timeout');
      vi.mocked(mockProvider.generate).mockRejectedValue(providerError);
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'function test() {}',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest'
      };

      await expect(agent.execute(input)).rejects.toThrow();
      
      expect(mockEventBus.published.some(event => event.type === 'agent.failed')).toBe(true);
    });
  });

  describe('MCP Tool Integration', () => {
    it('should use MCP tools for enhanced test generation', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      // Mock MCP AST analysis response
      mockMCPClient.mockResponse('test-analyzer', 'analyze_testability', {
        functions: [
          { name: 'add', parameters: ['a', 'b'], returnType: 'number', complexity: 1 }
        ],
        dependencies: [],
        testSuggestions: ['test positive numbers', 'test zero values', 'test negative numbers']
      });

      vi.mocked(mockProvider.generate).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return {
          text: JSON.stringify({ 
            tests: [
              { name: 'test positive numbers', code: 'it("works", () => {})', type: 'positive' }
            ],
            confidence: 0.96,
            testCount: 1,
            analysisTime: 1200,
            framework: 'vitest',
            language: 'javascript',
            enhancedByMCP: true
          }),
          usage: { promptTokens: 80, completionTokens: 120, totalTokens: 200 },
          latencyMs: 1200,
          provider: 'test-provider'
        };
      });
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const input = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
        useMCPTools: true
      };

      const result = await agent.execute(input);

      expect(mockMCPClient.calls).toHaveLength(1);
      expect(mockMCPClient.calls[0].tool).toBe('analyze_testability');
      expect(result.enhancedByMCP).toBe(true);
    });
  });

  describe('Context and Configuration', () => {
    it('should respect execution context preferences', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      const context: ExecutionContext = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        modelPreference: 'mlx',
        maxLatencyMs: 10000,
        costBudget: 0.20
      };

      vi.mocked(mockProvider.generate).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return {
          text: JSON.stringify({ 
            tests: [{ name: 'test', code: 'it("works", () => {})', type: 'basic' }],
            confidence: 0.9,
            testCount: 1,
            analysisTime: 800,
            framework: 'vitest',
            language: 'javascript'
          }),
          usage: { promptTokens: 60, completionTokens: 90, totalTokens: 150 },
          latencyMs: 800,
          provider: 'mlx-provider'
        };
      });

      const input = {
        sourceCode: 'const x = 1;',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest'
      };

      await agent.execute(input, context);

      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000,
          model: expect.stringContaining('mlx')
        })
      );
    });

    it('should generate framework-specific test syntax', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');
      
      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient
      });

      // Test Jest syntax
      vi.mocked(mockProvider.generate).mockResolvedValueOnce({
        text: JSON.stringify({
          tests: [{ 
            name: 'jest test', 
            code: 'test("should work", () => { expect(true).toBe(true); })', 
            type: 'basic' 
          }],
          confidence: 0.9,
          testCount: 1,
          analysisTime: 900,
          framework: 'jest',
          language: 'javascript'
        }),
        usage: { promptTokens: 60, completionTokens: 90, totalTokens: 150 },
        latencyMs: 900,
        provider: 'test-provider'
      });

      const jestInput = {
        sourceCode: 'function simple() { return true; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'jest'
      };

      const jestResult = await agent.execute(jestInput);
      expect(jestResult.tests[0].code).toContain('test(');
      expect(jestResult.framework).toBe('jest');
    });
  });
});