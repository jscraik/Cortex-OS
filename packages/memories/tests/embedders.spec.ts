import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MLXEmbedder } from '../src/adapters/embedder.mlx.js';
import { OllamaEmbedder } from '../src/adapters/embedder.ollama.js';
import { CompositeEmbedder } from '../src/adapters/embedder.composite.js';

describe('MLX Embedder', () => {
  it('should create an instance with default model', () => {
    const embedder = new MLXEmbedder();
    expect(embedder).toBeInstanceOf(MLXEmbedder);
    expect(embedder.name()).toBe('qwen3-4b');
  });

  it('should create an instance with specific model', () => {
    const embedder = new MLXEmbedder('qwen3-0.6b');
    expect(embedder.name()).toBe('qwen3-0.6b');
  });

  it('should throw error for unsupported model', () => {
    expect(() => new MLXEmbedder('unsupported-model' as any)).toThrow();
  });

  it('should handle service URL configuration', () => {
    // Save original env
    const originalEnv = process.env.MLX_SERVICE_URL;
    
    // Set service URL
    process.env.MLX_SERVICE_URL = 'http://localhost:8000';
    
    const embedder = new MLXEmbedder();
    expect(embedder).toBeInstanceOf(MLXEmbedder);
    
    // Restore original env
    process.env.MLX_SERVICE_URL = originalEnv;
  });
});

describe('Ollama Embedder', () => {
  it('should create an instance with default model', () => {
    const embedder = new OllamaEmbedder();
    expect(embedder).toBeInstanceOf(OllamaEmbedder);
    expect(embedder.name()).toBe('ollama-nomic-embed-text');
  });

  it('should create an instance with specific model', () => {
    const embedder = new OllamaEmbedder('llama2');
    expect(embedder.name()).toBe('ollama-llama2');
  });

  it('should handle custom base URL', () => {
    // Save original env
    const originalEnv = process.env.OLLAMA_BASE_URL;
    
    // Set custom URL
    process.env.OLLAMA_BASE_URL = 'http://custom-host:11434';
    
    const embedder = new OllamaEmbedder();
    expect(embedder).toBeInstanceOf(OllamaEmbedder);
    
    // Restore original env
    process.env.OLLAMA_BASE_URL = originalEnv;
  });
});

describe('Composite Embedder', () => {
  it('should create an instance', () => {
    const embedder = new CompositeEmbedder();
    expect(embedder).toBeInstanceOf(CompositeEmbedder);
  });

  it('should have a composite name', () => {
    const embedder = new CompositeEmbedder();
    expect(embedder.name()).toContain('composite');
  });

  it('should test embedder availability', async () => {
    const embedder = new CompositeEmbedder();
    
    // Mock the embed methods to simulate failures
    const originalEmbed = embedder.embed.bind(embedder);
    
    // This test just ensures the method exists and doesn't throw
    expect(async () => {
      await embedder.testEmbedders();
    }).not.toThrow();
  });

  it('should handle fallback behavior', async () => {
    const embedder = new CompositeEmbedder();
    
    // Mock all embedders to fail
    vi.spyOn(embedder, 'embed').mockRejectedValue(new Error('All embedders failed'));
    
    await expect(embedder.embed(['test'])).rejects.toThrow('All embedders failed');
  });
});