/**
 * Tests for Documentation Agent
 *
 * TDD approach: Tests written first to define expected behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { ModelProvider, ExecutionContext } from '@/lib/types.js';
import { createMockEventBus, createMockMCPClient } from '@tests/setup.js';

// Test will drive the interface design
describe('Documentation Agent', () => {
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
    it('should create documentation agent with correct capability', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      expect(agent.capability).toBe('documentation');
      expect(agent.inputSchema).toBeInstanceOf(z.ZodSchema);
      expect(agent.outputSchema).toBeInstanceOf(z.ZodSchema);
      expect(typeof agent.execute).toBe('function');
    });

    it('should validate required dependencies', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      expect(() =>
        createDocumentationAgent({
          provider: null as any,
          eventBus: mockEventBus,
          mcpClient: mockMCPClient,
        }),
      ).toThrow('Provider is required');
    });
  });

  describe('Input Validation', () => {
    it('should validate API documentation generation input', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const validInput = {
        sourceCode:
          'export function calculateTotal(items: Item[]): number { return items.reduce((sum, item) => sum + item.price, 0); }',
        language: 'typescript',
        documentationType: 'api',
        outputFormat: 'markdown',
        includeExamples: true,
        includeTypes: true,
        audience: 'developer',
      };

      expect(() => agent.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should support multiple documentation types', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const docTypes = ['api', 'readme', 'tutorial', 'reference', 'guide'];

      for (const documentationType of docTypes) {
        const input = {
          sourceCode: 'class Calculator { add(a: number, b: number) { return a + b; } }',
          language: 'typescript',
          documentationType,
          outputFormat: 'markdown',
        };

        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should support different output formats', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const outputFormats = ['markdown', 'html', 'rst', 'docstring', 'jsdoc'];

      for (const outputFormat of outputFormats) {
        const input = {
          sourceCode: 'def process_data(data): return data.strip().lower()',
          language: 'python',
          documentationType: 'api',
          outputFormat,
        };

        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should support different audiences', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const audiences = ['developer', 'end-user', 'technical-writer', 'beginner'];

      for (const audience of audiences) {
        const input = {
          sourceCode: 'export const API_BASE_URL = "https://api.example.com";',
          language: 'javascript',
          documentationType: 'reference',
          outputFormat: 'markdown',
          audience,
        };

        expect(() => agent.inputSchema.parse(input)).not.toThrow();
      }
    });

    it('should reject invalid input', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const invalidInput = {
        sourceCode: '', // Empty code
        language: 'invalid-language',
        documentationType: 'unknown-type',
        outputFormat: 'unknown-format',
      };

      expect(() => agent.inputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Documentation Generation Execution', () => {
    it('should generate comprehensive API documentation', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const mockGenerateResult = {
        text: JSON.stringify({
          sections: [
            {
              title: 'calculateTotal',
              type: 'function',
              content:
                '## calculateTotal\n\nCalculates the total price of all items in an array.\n\n### Parameters\n\n- `items: Item[]` - Array of items with price property\n\n### Returns\n\n`number` - The sum of all item prices\n\n### Example\n\n```typescript\nconst items = [{ price: 10 }, { price: 20 }];\nconst total = calculateTotal(items); // 30\n```',
              examples: ['const total = calculateTotal([{ price: 10 }]);'],
              parameters: ['items: Item[]'],
              returnType: 'number',
            },
          ],
          format: 'markdown',
          language: 'typescript',
          documentationType: 'api',
          metadata: {
            generatedAt: '2025-01-15T10:30:00Z',
            wordCount: 45,
            sectionsCount: 1,
            hasExamples: true,
            hasTypes: true,
          },
          confidence: 0.94,
          processingTime: 2100,
        }),
        usage: { promptTokens: 300, completionTokens: 600, totalTokens: 900 },
        latencyMs: 2100,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode:
          'export function calculateTotal(items: Item[]): number { return items.reduce((sum, item) => sum + item.price, 0); }',
        language: 'typescript',
        documentationType: 'api',
        outputFormat: 'markdown',
        includeExamples: true,
        includeTypes: true,
        audience: 'developer',
      };

      const result = await agent.execute(input);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe('calculateTotal');
      expect(result.sections[0].type).toBe('function');
      expect(result.format).toBe('markdown');
      expect(result.confidence).toBe(0.94);
      expect(result.metadata.hasExamples).toBe(true);
    });

    it('should generate README documentation', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const mockGenerateResult = {
        text: JSON.stringify({
          sections: [
            {
              title: 'Project Overview',
              type: 'overview',
              content: '# My Project\n\nA utility library for calculations.',
              examples: [],
              parameters: [],
              returnType: null,
            },
            {
              title: 'Installation',
              type: 'installation',
              content: '## Installation\n\n```bash\nnpm install my-project\n```',
              examples: ['npm install my-project'],
              parameters: [],
              returnType: null,
            },
          ],
          format: 'markdown',
          documentationType: 'readme',
          confidence: 0.88,
          processingTime: 1800,
        }),
        usage: { promptTokens: 200, completionTokens: 400, totalTokens: 600 },
        latencyMs: 1800,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'export * from "./calculator.js"; export * from "./utils.js";',
        language: 'typescript',
        documentationType: 'readme',
        outputFormat: 'markdown',
        audience: 'developer',
      };

      const result = await agent.execute(input);

      expect(result.sections).toHaveLength(2);
      expect(result.documentationType).toBe('readme');
      expect(result.sections[0].title).toBe('Project Overview');
      expect(result.sections[1].title).toBe('Installation');
    });

    it('should emit agent started and completed events', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      vi.mocked(mockProvider.generate).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          text: JSON.stringify({
            sections: [{ title: 'test', type: 'overview', content: 'Test documentation' }],
            confidence: 0.9,
            processingTime: 1000,
            format: 'markdown',
            documentationType: 'api',
          }),
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
          latencyMs: 1000,
          provider: 'test-provider',
        };
      });

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function test() { return true; }',
        language: 'javascript',
        documentationType: 'api',
        outputFormat: 'markdown',
      };

      await agent.execute(input);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

      const startedEvent = mockEventBus.published[0];
      expect(startedEvent.type).toBe('agent.started');
      expect(startedEvent.data.capability).toBe('documentation');

      const completedEvent = mockEventBus.published[1];
      expect(completedEvent.type).toBe('agent.completed');
      expect(completedEvent.data.metrics.latencyMs).toBeGreaterThan(0);
    });

    it('should handle provider errors gracefully', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const providerError = new Error('Provider timeout');
      vi.mocked(mockProvider.generate).mockRejectedValue(providerError);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function test() {}',
        language: 'javascript',
        documentationType: 'api',
        outputFormat: 'markdown',
      };

      await expect(agent.execute(input)).rejects.toThrow();

      expect(mockEventBus.published.some((event) => event.type === 'agent.failed')).toBe(true);
    });

    it('should generate documentation with different complexity levels', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const mockGenerateResult = {
        text: JSON.stringify({
          sections: [
            {
              title: 'Complex Function',
              type: 'function',
              content:
                '## complexFunction\n\nA complex function with multiple parameters and error handling.',
              examples: ['complexFunction(data, options)'],
              parameters: ['data: any[]', 'options: Options'],
              returnType: 'Promise<Result>',
            },
          ],
          format: 'markdown',
          documentationType: 'api',
          confidence: 0.92,
          processingTime: 2500,
          metadata: {
            complexity: 'high',
            hasAsyncOperations: true,
            hasErrorHandling: true,
          },
        }),
        usage: { promptTokens: 400, completionTokens: 800, totalTokens: 1200 },
        latencyMs: 2500,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const complexCode = `
        async function complexFunction(data: any[], options: Options): Promise<Result> {
          try {
            if (!data || data.length === 0) throw new Error('Invalid data');
            const processed = await processData(data, options);
            return { success: true, data: processed };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
      `;

      const input = {
        sourceCode: complexCode,
        language: 'typescript',
        documentationType: 'api',
        outputFormat: 'markdown',
        includeExamples: true,
        includeTypes: true,
        audience: 'developer',
      };

      const result = await agent.execute(input);

      expect(result.sections[0].title).toBe('Complex Function');
      expect(result.sections[0].parameters).toContain('data: any[]');
      expect(result.metadata?.hasAsyncOperations).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Documentation Formatting', () => {
    it('should generate HTML formatted documentation', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const mockGenerateResult = {
        text: JSON.stringify({
          sections: [
            {
              title: 'API Reference',
              type: 'reference',
              content: '<h2>API Reference</h2><p>Complete API documentation.</p>',
              examples: [],
              parameters: [],
              returnType: null,
            },
          ],
          format: 'html',
          documentationType: 'reference',
          confidence: 0.89,
          processingTime: 1600,
        }),
        usage: { promptTokens: 150, completionTokens: 300, totalTokens: 450 },
        latencyMs: 1600,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'export class APIClient { connect() {} }',
        language: 'typescript',
        documentationType: 'reference',
        outputFormat: 'html',
        audience: 'developer',
      };

      const result = await agent.execute(input);

      expect(result.format).toBe('html');
      expect(result.sections[0].content).toContain('<h2>');
      expect(result.sections[0].content).toContain('<p>');
    });

    it('should generate JSDoc formatted documentation', async () => {
      const { createDocumentationAgent } = await import('@/agents/documentation-agent.js');

      const mockGenerateResult = {
        text: JSON.stringify({
          sections: [
            {
              title: 'calculateSum',
              type: 'function',
              content:
                '/**\n * Calculates the sum of two numbers\n * @param {number} a - First number\n * @param {number} b - Second number\n * @returns {number} The sum of a and b\n */',
              examples: ['calculateSum(5, 3)'],
              parameters: ['a: number', 'b: number'],
              returnType: 'number',
            },
          ],
          format: 'jsdoc',
          documentationType: 'api',
          confidence: 0.95,
          processingTime: 1200,
        }),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        latencyMs: 1200,
        provider: 'test-provider',
      };

      vi.mocked(mockProvider.generate).mockResolvedValue(mockGenerateResult);

      const agent = createDocumentationAgent({
        provider: mockProvider,
        eventBus: mockEventBus,
        mcpClient: mockMCPClient,
      });

      const input = {
        sourceCode: 'function calculateSum(a, b) { return a + b; }',
        language: 'javascript',
        documentationType: 'api',
        outputFormat: 'jsdoc',
        audience: 'developer',
      };

      const result = await agent.execute(input);

      expect(result.format).toBe('jsdoc');
      expect(result.sections[0].content).toContain('/**');
      expect(result.sections[0].content).toContain('@param');
      expect(result.sections[0].content).toContain('@returns');
    });
  });
});
