import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Mock fetch globally
  global.fetch = vi.fn();

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.OLLAMA_ENDPOINT = 'http://localhost:11434';
  process.env.MLX_ENDPOINT = 'http://localhost:8765';
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Helper function to create mock responses
export const createMockResponse = (data: any, ok = true, status = 200) => {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  } as any;
};
