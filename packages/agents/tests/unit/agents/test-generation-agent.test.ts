/**
 * Tests for Test Generation Agent
 *
 * TDD approach: Tests written first to define expected behavior
 */

import { createMockEventBus, createMockMCPClient } from '@tests/setup.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ExecutionContext, ModelProvider } from '@/lib/types.js';

// Test will drive the interface design
describe('Test Generation Agent', () => {
  let mockProvider: ModelProvider;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockMCPClient: ReturnType<typeof createMockMCPClient>;

  beforeEach(() => {
    mockProvider = {
      name: 'test-provider',
      generate: vi.fn(),
      shutdown: vi.fn(),
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
        mcpClient: mockMCPClient,
      });

      expect(agent.capability).toBe('test-generation');
      expect(agent.inputSchema).toBeInstanceOf(z.ZodSchema);
      expect(agent.outputSchema).toBeInstanceOf(z.ZodSchema);
      expect(typeof agent.execute).toBe('function');
    });

    it('should validate required dependencies', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      expect(() =>
        createTestGenerationAgent({
          provider: null as any,
          eventBus: mockEventBus,
          mcpClient: mockMCPClient,
        }),
      ).toThrow('Provider is required');
    });
  });

  describe('Input Validation', () => {
    it('should validate unit test generation input', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const validInput = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
        includeEdgeCases: true,
        coverageTarget: 90,
      };

      expect(() => agent.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should support multiple test frameworks', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const frameworks = ['vitest', 'jest', 'mocha', 'pytest', 'unittest', 'rspec'];

      for (const framework of frameworks) {
        const input = {
          sourceCode: 'def calculate(): return 42',
          language: 'python',
          testType: 'unit',
          framework,
        };

        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should support different test types', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const testTypes = ['unit', 'integration', 'e2e', 'property'];

      for (const testType of testTypes) {
        const input = {
          sourceCode: 'class Calculator { add(a, b) { return a + b; } }',
          language: 'typescript',
          testType,
          framework: 'vitest',
        };

        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should reject invalid input', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const invalidInput = {
        sourceCode: '', // Empty code
        language: 'invalid-language',
        testType: 'unknown-type',
        framework: 'unknown-framework',
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
              type: 'positive-case',
            },
            {
              name: 'should handle zero values',
              code: 'it("should handle zero values", () => {\n  expect(add(0, 5)).toBe(5);\n  expect(add(3, 0)).toBe(3);\n});',
              type: 'edge-case',
            },
          ],
          framework: 'vitest',
          language: 'javascript',
          testType: 'unit',
          coverage: {
            estimated: 95,
            branches: ['positive', 'zero-handling'],
            uncoveredPaths: [],
          },
          imports: ['import { add } from "./calculator.js";'],
          setup: 'describe("Calculator", () => {',
          teardown: '});',
          confidence: 0.92,
          testCount: 2,
          analysisTime: 1800,
        }),
        usage: { promptTokens: 200, completionTokens: 400, totalTokens: 600 },
        latencyMs: 1800,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
        includeEdgeCases: true,
        coverageTarget: 90,
      };

      const result = await agent.execute(input);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].name).toBe('should add two positive numbers');
      expect(result.tests[0].type).toBe('positive-case');
      expect(result.coverage.estimated).toBe(95);
      expect(result.framework).toBe('vitest');
      expect(result.confidence).toBe(0.92);
    });

    it('should emit agent started and completed events', async () => {
      const { createTestGenerationAgent } = await import('@/agents/test-generation-agent.js');

      vi.mocked(mockProvider.generate).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          text: JSON.stringify({
            tests: [{ name: 'basic test', code: 'it("works", () => {})', type: 'positive-case' }],
            confidence: 0.9,
            testCount: 1,
            analysisTime: 1000,
            framework: 'vitest',
            language: 'javascript',
            testType: 'unit',
          }),
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
          latencyMs: 1000,
          provider: 'test-provider',
        };
      });

      const agent = createTestGenerationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function test() { return true; }',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
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
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function test() {}',
        language: 'javascript',
        testType: 'unit',
        framework: 'vitest',
      };

      await expect(agent.execute(input)).rejects.toThrow();

      expect(mockEventBus.published.some((event) => event.type === 'agent.failed')).toBe(true);
    });
  });
});
