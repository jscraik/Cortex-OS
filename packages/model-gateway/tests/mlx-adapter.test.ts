/**
 * @file mlx-adapter.test.ts
 * Comprehensive tests for MLX adapter with all model types
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';
import type { MLXEmbeddingRequest, MLXChatRequest } from '../src/adapters/mlx-adapter';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('MLX Adapter', () => {
  let adapter: MLXAdapter;
  let mockSpawn: any;

  beforeEach(() => {
    adapter = new MLXAdapter();
    mockSpawn = vi.fn();
    vi.doMock('child_process', () => ({ spawn: mockSpawn }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Chat Generation', () => {
    it('should generate chat completions with Qwen3-Coder model', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      // Simulate successful response
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(0);
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({ content: 'Hello from Qwen3-Coder!' }));
        }
      });

      const request: MLXChatRequest = {
        messages: [{ role: 'user', content: 'Write a Python function' }],
        model: 'qwen3-coder-30b-mlx',
        max_tokens: 1000,
        temperature: 0.7,
      };

      const response = await adapter.generateChat(request);

      expect(response.content).toBe('Hello from Qwen3-Coder!');
      expect(response.model).toBe('qwen3-coder-30b-mlx');
      expect(response.usage?.prompt_tokens).toBeGreaterThan(0);
    });

    it('should handle vision-language models correctly', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({ content: 'I can see the image clearly.' }));
        }
      });

      const request: MLXChatRequest = {
        messages: [{ role: 'user', content: 'Describe this image' }],
        model: 'qwen2.5-vl-3b-mlx',
      };

      const response = await adapter.generateChat(request);

      expect(response.content).toBe('I can see the image clearly.');
      expect(mockSpawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['--model', 'mlx-community/Qwen2.5-VL-3B-Instruct-6bit']),
        expect.any(Object),
      );
    });

    it('should handle chat errors gracefully', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      // Simulate process error
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          callback(1); // Error exit code
        }
      });

      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback('Model loading failed');
        }
      });

      const request: MLXChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'invalid-model',
      };

      await expect(adapter.generateChat(request)).rejects.toThrow(
        'MLX chat failed: Python script failed with code 1: Model loading failed',
      );
    });
  });

  describe('Embedding Generation', () => {
    it('should generate embeddings with Qwen3 models', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // Mock embedding vector
          const embedding = Array.from({ length: 1536 }, () => Math.random());
          callback(JSON.stringify([embedding]));
        }
      });

      const request: MLXEmbeddingRequest = {
        text: 'Test embedding text',
        model: 'qwen3-embedding-4b-mlx',
      };

      const response = await adapter.generateEmbedding(request);

      expect(response.embedding).toHaveLength(1536);
      expect(response.model).toBe('qwen3-embedding-4b-mlx');
      expect(response.dimensions).toBe(1536);
      expect(response.usage?.cost).toBe(0); // Local inference
    });

    it('should generate batch embeddings', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          const embeddings = [
            Array.from({ length: 1536 }, () => Math.random()),
            Array.from({ length: 1536 }, () => Math.random()),
          ];
          callback(JSON.stringify(embeddings));
        }
      });

      const texts = ['First text', 'Second text'];
      const responses = await adapter.generateEmbeddings(texts);

      expect(responses).toHaveLength(2);
      responses.forEach((response) => {
        expect(response.embedding).toHaveLength(1536);
        expect(response.dimensions).toBe(1536);
      });
    });
  });

  describe('Reranking Generation', () => {
    it('should generate reranking scores with Qwen3-Reranker', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          const scores = [
            { index: 0, score: 0.95 },
            { index: 1, score: 0.82 },
            { index: 2, score: 0.67 },
          ];
          callback(JSON.stringify({ scores }));
        }
      });

      const query = 'machine learning algorithms';
      const documents = [
        'Deep learning neural networks',
        'Traditional regression analysis',
        'Weather forecasting models',
      ];

      const results = await adapter.generateReranking(query, documents, 'qwen3-reranker-4b-mlx');

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it('should handle reranking with unsupported model', async () => {
      const query = 'test query';
      const documents = ['doc1', 'doc2'];

      await expect(
        adapter.generateReranking(query, documents, 'qwen3-embedding-4b-mlx'),
      ).rejects.toThrow('Unsupported MLX reranking model');
    });
  });

  describe('MLX Tools Detection', () => {
    it('should check MLX tool availability', async () => {
      const available = await adapter.isAvailable();

      // This will depend on actual MLX installation
      expect(typeof available).toBe('boolean');
    });

    it('should detect mlx-lm availability', async () => {
      // Mock successful mlx-lm detection
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      // This tests the internal checkMLXTools method indirectly
      const available = await adapter.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Environment Configuration', () => {
    it('should use ExternalSSD cache directories', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify([Array.from({ length: 1536 }, () => 0.1)]));
        }
      });

      const request: MLXEmbeddingRequest = {
        text: 'Test text',
        model: 'qwen3-embedding-4b-mlx',
      };

      await adapter.generateEmbedding(request);

      expect(mockSpawn).toHaveBeenCalledWith(
        'python3',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            HF_HOME: '/Volumes/ExternalSSD/huggingface_cache',
            TRANSFORMERS_CACHE: '/Volumes/ExternalSSD/huggingface_cache',
            MLX_CACHE_DIR: '/Volumes/ExternalSSD/ai-cache',
          }),
        }),
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Python script not found', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      // Simulate process error (ENOENT - file not found)
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('ENOENT: no such file or directory'));
        }
      });

      const request: MLXEmbeddingRequest = {
        text: 'Test text',
      };

      await expect(adapter.generateEmbedding(request)).rejects.toThrow('ENOENT');
    });

    it('should handle invalid JSON response', async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback('Invalid JSON response');
        }
      });

      const request: MLXEmbeddingRequest = {
        text: 'Test text',
      };

      await expect(adapter.generateEmbedding(request)).rejects.toThrow('MLX embedding failed');
    });

    it('should estimate token counts correctly', async () => {
      const text = 'This is a test sentence with multiple words.';

      // Mock to test token estimation indirectly
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProcess);

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') callback(0);
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify([Array.from({ length: 1536 }, () => 0.1)]));
        }
      });

      const request: MLXEmbeddingRequest = { text };
      const response = await adapter.generateEmbedding(request);

      expect(response.usage?.tokens).toBeGreaterThan(0);
      expect(response.usage?.tokens).toBe(Math.ceil(text.length / 4));
    });
  });
});
