/**
 * @file llm-integration.test.ts
 * @description TDD Tests for LLM Integration - MLX and Ollama
 * @author Cortex-OS Team
 * @version 1.0.0
 *
 * TDD Philosophy:
 * - Each test drives LLM integration implementation
 * - Tests define LLM behavior before code exists
 * - No LLM functionality without corresponding failing test first
 * - 85% coverage minimum enforced
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPRPOrchestrator, type PRPOrchestrator } from '../orchestrator.js';

describe('LLM Integration - TDD Implementation', () => {
  let orchestrator: PRPOrchestrator;

  beforeEach(() => {
    orchestrator = createPRPOrchestrator();
  });

  describe('LLM Configuration', () => {
    it('should configure MLX provider', () => {
      // RED: This test should fail - no configureLLM method exists
      const mlxConfig = {
        provider: 'mlx' as const,
        endpoint: 'http://localhost:8000',
        model: 'llama-3.2-3b',
      };

      orchestrator.configureLLM(mlxConfig);
      const config = orchestrator.getLLMConfig();

      expect(config).toEqual(mlxConfig);
      expect(config.provider).toBe('mlx');
      expect(config.endpoint).toBe('http://localhost:8000');
    });

    it('should configure Ollama provider', () => {
      // RED: This test should fail - no configureLLM method exists
      const ollamaConfig = {
        provider: 'ollama' as const,
        endpoint: 'http://127.0.0.1:11434',
        model: 'llama3',
      };

      orchestrator.configureLLM(ollamaConfig);
      const config = orchestrator.getLLMConfig();

      expect(config).toEqual(ollamaConfig);
      expect(config.provider).toBe('ollama');
    });

    it('should validate LLM configuration', () => {
      // RED: This test should fail - no validation exists
      const invalidConfig = {
        provider: 'invalid' as any,
        endpoint: 'not-a-url',
      };

      expect(() => orchestrator.configureLLM(invalidConfig)).toThrow(
        'Unsupported LLM provider: invalid',
      );
    });

    it('should require LLM configuration before execution', async () => {
      // RED: This test should fail - no LLM requirement check
      const neuron = createLLMNeuron('strategy-llm', 'strategy');
      orchestrator.registerNeuron(neuron);

      await expect(orchestrator.executePRPCycle({})).rejects.toThrow(
        'LLM configuration required for LLM-powered neurons',
      );
    });
  });

  describe('LLM Bridge Integration', () => {
    it('should create LLM bridge with Ollama configuration', async () => {
      // RED: This test should fail - no LLM bridge exists
      const ollamaConfig = {
        provider: 'ollama' as const,
        endpoint: 'http://127.0.0.1:11434',
        model: 'llama3',
      };

      orchestrator.configureLLM(ollamaConfig);
      const bridge = orchestrator.createLLMBridge();

      expect(bridge).toBeDefined();
      expect(bridge.getProvider()).toBe('ollama');
    });

    it('should create LLM bridge with MLX configuration', async () => {
      // RED: This test should fail - no LLM bridge exists
      const mlxConfig = {
        provider: 'mlx' as const,
        endpoint: 'http://localhost:8000',
        model: 'llama-3.2-3b',
      };

      orchestrator.configureLLM(mlxConfig);
      const bridge = orchestrator.createLLMBridge();

      expect(bridge).toBeDefined();
      expect(bridge.getProvider()).toBe('mlx');
    });

    it('should generate text using LLM bridge', async () => {
      // RED: This test should fail - no generation capability
      const ollamaConfig = {
        provider: 'ollama' as const,
        endpoint: 'http://127.0.0.1:11434',
        model: 'llama3',
      };

      orchestrator.configureLLM(ollamaConfig);
      const bridge = orchestrator.createLLMBridge();

      // Mock the actual LLM call for testing
      const mockGenerate = vi.fn().mockResolvedValue('Generated response');
      bridge.generate = mockGenerate;

      const result = await bridge.generate('Test prompt');

      expect(result).toBe('Generated response');
      expect(mockGenerate).toHaveBeenCalledWith('Test prompt');
    });
  });

  describe('LLM-Powered Neuron Execution', () => {
    it('should execute neuron with LLM generation', async () => {
      // RED: This test should fail - neurons not connected to LLM
      const ollamaConfig = {
        provider: 'ollama' as const,
        endpoint: 'http://127.0.0.1:11434',
        model: 'llama3',
      };

      orchestrator.configureLLM(ollamaConfig);

      const llmNeuron = createLLMNeuron('strategy-llm', 'strategy');
      orchestrator.registerNeuron(llmNeuron);

      const blueprint = {
        title: 'AI Assistant',
        description: 'Build an AI assistant',
        requirements: ['Natural language processing', 'User-friendly interface'],
      };

      const result = await orchestrator.executePRPCycle(blueprint);

      expect(result.outputs['strategy-llm']).toBeDefined();
      expect(result.outputs['strategy-llm'].llmGenerated).toBe(true);
      expect(result.outputs['strategy-llm'].content).toContain('strategy');
    });

    it('should include LLM evidence in neuron results', async () => {
      // RED: This test should fail - no LLM evidence tracking
      const mlxConfig = {
        provider: 'mlx' as const,
        endpoint: 'http://localhost:8000',
        model: 'llama-3.2-3b',
      };

      orchestrator.configureLLM(mlxConfig);

      const llmNeuron = createLLMNeuron('analysis-llm', 'build');
      orchestrator.registerNeuron(llmNeuron);

      const result = await orchestrator.executePRPCycle({ title: 'Test' });
      const neuronOutput = result.outputs['analysis-llm'];

      expect(neuronOutput.evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'llm-generation',
            provider: 'mlx',
            model: 'llama-3.2-3b',
          }),
        ]),
      );
    });
  });
});

// Helper function to create LLM-powered neurons for testing
function createLLMNeuron(id: string, phase: 'strategy' | 'build' | 'evaluation') {
  return {
    id,
    role: `llm-${phase}`,
    phase,
    dependencies: [],
    tools: ['llm'],
    requiresLLM: true, // Flag indicating LLM requirement
    execute: async (state: any, context: any) => {
      // This will be enhanced to use actual LLM through context
      const llmBridge = context.llmBridge;
      if (!llmBridge) {
        throw new Error('LLM bridge not available in execution context');
      }

      const prompt = `As a ${phase} expert, analyze: ${JSON.stringify(state.blueprint)}`;
      const llmResponse = await llmBridge.generate(prompt);

      return {
        output: {
          llmGenerated: true,
          content: llmResponse,
          phase,
        },
        evidence: [
          {
            type: 'llm-generation',
            provider: llmBridge.getProvider(),
            model: llmBridge.getModel(),
            prompt,
            response: llmResponse,
            timestamp: new Date().toISOString(),
          },
        ],
        nextSteps: [`Refine ${phase} based on LLM analysis`],
        artifacts: [],
        metrics: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          toolsUsed: ['llm'],
          filesCreated: 0,
          filesModified: 0,
          commandsExecuted: 1,
        },
      };
    },
  };
}
