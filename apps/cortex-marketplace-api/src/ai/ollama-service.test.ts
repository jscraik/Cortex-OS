import { describe, expect, test, vi } from 'vitest';
import { createOllamaService } from './ollama-service.js';

describe('createOllamaService', () => {
  test('returns null when disabled', () => {
    const service = createOllamaService({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'test',
      timeout: 1000,
      enabled: false,
    });
    expect(service).toBeNull();
  });

  test('healthCheck uses global fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;
    const service = createOllamaService({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'test',
      timeout: 1000,
      enabled: true,
    });
    if (!service) throw new Error('service not created');
    const healthy = await service.healthCheck();
    expect(healthy).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags', { method: 'GET' });
  });
});
