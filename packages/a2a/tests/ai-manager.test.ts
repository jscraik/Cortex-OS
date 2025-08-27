/**
 * @file AI Manager Tests
 * @description Tests for the AI manager functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AICapability, ModelProvider } from '../src/ai/config.js';
import {
  createAIManager,
  getAdapter,
  getAvailableAdapters,
  initializeAIManager,
  isCapabilityAvailable,
} from '../src/ai/manager.js';

// Mock the adapter factories
vi.mock('../src/ai/frontier-adapter.js', () => ({
  createFrontierAdapter: vi.fn(() => Promise.resolve({ name: 'FrontierAdapter' })),
}));

vi.mock('../src/ai/mlx-adapter.js', () => ({
  createMLXAdapter: vi.fn(() => ({ name: 'MLXAdapter' })),
}));

vi.mock('../src/ai/ollama-adapter.js', () => ({
  createOllamaAdapter: vi.fn(() => ({ name: 'OllamaAdapter' })),
}));

describe('AI Manager', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      models: {
        [AICapability.SEMANTIC_ROUTING]: {
          provider: ModelProvider.OPENAI,
          model: 'gpt-4',
          apiKey: 'sk-test123',
        },
        [AICapability.MESSAGE_VALIDATION]: {
          provider: ModelProvider.MLX,
          model: 'mlx-community/Qwen2.5-7B-Instruct-4bit',
          endpoint: 'http://localhost:8080',
        },
        [AICapability.LOAD_BALANCING]: {
          provider: ModelProvider.OLLAMA,
          model: 'llama2',
          endpoint: 'http://localhost:11434',
        },
      },
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('createAIManager()', () => {
    it('should create AI manager state', () => {
      const state = createAIManager(mockConfig);

      expect(state).toEqual({
        adapters: new Map(),
        config: mockConfig,
        initialized: false,
      });
      expect(state.adapters).toBeInstanceOf(Map);
      expect(state.adapters.size).toBe(0);
    });

    it('should handle empty config', () => {
      const emptyConfig = { enabled: false, models: {} };
      const state = createAIManager(emptyConfig);

      expect(state.config).toBe(emptyConfig);
      expect(state.initialized).toBe(false);
    });
  });

  describe('initializeAIManager()', () => {
    it('should initialize adapters for each capability', async () => {
      const state = createAIManager(mockConfig);

      await initializeAIManager(state);

      expect(state.initialized).toBe(true);
      expect(state.adapters.size).toBe(3);

      // Check that adapters were created for each capability
      expect(state.adapters.has(AICapability.SEMANTIC_ROUTING)).toBe(true);
      expect(state.adapters.has(AICapability.MESSAGE_VALIDATION)).toBe(true);
      expect(state.adapters.has(AICapability.LOAD_BALANCING)).toBe(true);
    });

    it('should not initialize if already initialized', async () => {
      const state = createAIManager(mockConfig);
      state.initialized = true;

      await initializeAIManager(state);

      expect(state.adapters.size).toBe(0); // No adapters should be created
    });

    it('should not initialize if AI is disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const state = createAIManager(disabledConfig);

      await initializeAIManager(state);

      expect(state.initialized).toBe(false);
      expect(state.adapters.size).toBe(0);
    });

    it('should handle adapter creation errors gracefully', async () => {
      const configWithError = {
        ...mockConfig,
        models: {
          [AICapability.SEMANTIC_ROUTING]: {
            provider: 'invalid_provider',
            model: 'test',
          },
        },
      };

      const state = createAIManager(configWithError);

      // Mock console.warn to avoid console output during tests
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initializeAIManager(state);

      expect(state.initialized).toBe(true);
      expect(state.adapters.size).toBe(0); // No adapters should be created due to error
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should create correct adapter types', async () => {
      const state = createAIManager(mockConfig);

      await initializeAIManager(state);

      // Verify the correct adapter factories were called
      const { createFrontierAdapter } = await import('../src/ai/frontier-adapter.js');
      const { createMLXAdapter } = await import('../src/ai/mlx-adapter.js');
      const { createOllamaAdapter } = await import('../src/ai/ollama-adapter.js');

      expect(createFrontierAdapter).toHaveBeenCalledWith(
        mockConfig.models[AICapability.SEMANTIC_ROUTING],
      );
      expect(createMLXAdapter).toHaveBeenCalledWith(
        mockConfig.models[AICapability.MESSAGE_VALIDATION],
      );
      expect(createOllamaAdapter).toHaveBeenCalledWith(
        mockConfig.models[AICapability.LOAD_BALANCING],
      );
    });
  });

  describe('getAdapter()', () => {
    it('should return adapter for existing capability', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapter = getAdapter(state, AICapability.SEMANTIC_ROUTING);

      expect(adapter).toEqual({ name: 'FrontierAdapter' });
    });

    it('should return null for non-existing capability', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapter = getAdapter(state, AICapability.PRIORITY_RANKING);

      expect(adapter).toBeNull();
    });

    it('should return null for uninitialized manager', () => {
      const state = createAIManager(mockConfig);

      const adapter = getAdapter(state, AICapability.SEMANTIC_ROUTING);

      expect(adapter).toBeNull();
    });
  });

  describe('getAvailableAdapters()', () => {
    it('should return all available adapters', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapters = getAvailableAdapters(state);

      expect(adapters).toHaveLength(3);
      expect(adapters).toEqual([
        { name: 'FrontierAdapter' },
        { name: 'MLXAdapter' },
        { name: 'OllamaAdapter' },
      ]);
    });

    it('should return empty array for uninitialized manager', () => {
      const state = createAIManager(mockConfig);

      const adapters = getAvailableAdapters(state);

      expect(adapters).toEqual([]);
    });
  });

  describe('isCapabilityAvailable()', () => {
    it('should return true for healthy adapter', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      // Mock the adapter's isHealthy method
      const adapter = getAdapter(state, AICapability.SEMANTIC_ROUTING);
      if (adapter) {
        vi.spyOn(adapter, 'isHealthy').mockResolvedValue(true);
      }

      const available = await isCapabilityAvailable(state, AICapability.SEMANTIC_ROUTING);

      expect(available).toBe(true);
    });

    it('should return false for unhealthy adapter', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapter = getAdapter(state, AICapability.SEMANTIC_ROUTING);
      if (adapter) {
        vi.spyOn(adapter, 'isHealthy').mockResolvedValue(false);
      }

      const available = await isCapabilityAvailable(state, AICapability.SEMANTIC_ROUTING);

      expect(available).toBe(false);
    });

    it('should return false for non-existing capability', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const available = await isCapabilityAvailable(state, AICapability.PRIORITY_RANKING);

      expect(available).toBe(false);
    });

    it('should return false when adapter throws error', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapter = getAdapter(state, AICapability.SEMANTIC_ROUTING);
      if (adapter) {
        vi.spyOn(adapter, 'isHealthy').mockRejectedValue(new Error('Connection failed'));
      }

      const available = await isCapabilityAvailable(state, AICapability.SEMANTIC_ROUTING);

      expect(available).toBe(false);
    });
  });

  describe('Manager state management', () => {
    it('should maintain adapter references correctly', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      const adapter1 = getAdapter(state, AICapability.SEMANTIC_ROUTING);
      const adapter2 = getAdapter(state, AICapability.SEMANTIC_ROUTING);

      expect(adapter1).toBe(adapter2); // Same reference
    });

    it('should handle multiple initialization calls', async () => {
      const state = createAIManager(mockConfig);

      await initializeAIManager(state);
      expect(state.initialized).toBe(true);
      expect(state.adapters.size).toBe(3);

      // Second initialization should not change anything
      await initializeAIManager(state);
      expect(state.adapters.size).toBe(3);
    });

    it('should handle configuration updates', async () => {
      const state = createAIManager(mockConfig);
      await initializeAIManager(state);

      // Update configuration
      state.config.models[AICapability.PRIORITY_RANKING] = {
        provider: ModelProvider.COHERE,
        model: 'command',
        apiKey: 'cohere-test123',
      };

      // Re-initialize
      state.initialized = false;
      await initializeAIManager(state);

      expect(state.adapters.size).toBe(4);
      expect(state.adapters.has(AICapability.PRIORITY_RANKING)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid provider gracefully', async () => {
      const invalidConfig = {
        enabled: true,
        models: {
          [AICapability.SEMANTIC_ROUTING]: {
            provider: 'invalid_provider',
            model: 'test',
          },
        },
      };

      const state = createAIManager(invalidConfig);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initializeAIManager(state);

      expect(state.initialized).toBe(true);
      expect(state.adapters.size).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize semantic_routing adapter'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle adapter factory errors', async () => {
      const { createFrontierAdapter } = await import('../src/ai/frontier-adapter.js');
      vi.mocked(createFrontierAdapter).mockRejectedValue(new Error('Factory error'));

      const state = createAIManager(mockConfig);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initializeAIManager(state);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize semantic_routing adapter: Factory error'),
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
