import { describe, expect, it, vi } from 'vitest';

import { LocalMemoryProvider } from '../LocalMemoryProvider.js';
import type { MemoryCoreConfig, QdrantConfig } from '../../types.js';

describe('LocalMemoryProvider initialization phases', () => {
  const baseConfig: Partial<MemoryCoreConfig> = {
    sqlitePath: ':memory:',
    maxLimit: 50,
    queueConcurrency: 3,
  };

  it('initializes the database through the injected factory', () => {
    const database = { close: vi.fn() };
    const databaseFactory = vi.fn().mockReturnValue(database);

    const provider = new LocalMemoryProvider(baseConfig, { databaseFactory });

    expect(databaseFactory).toHaveBeenCalledWith(expect.objectContaining({ sqlitePath: ':memory:' }));
    expect((provider as unknown as { database: unknown }).database).toBe(database);
  });

  it('initializes the qdrant client only when configuration is provided', () => {
    const qdrantConfig: QdrantConfig = {
      url: 'http://localhost:6333',
      collection: 'local_memory_v1',
      embedDim: 4,
      similarity: 'Cosine',
      timeout: 500,
    };
    const qdrantFactory = vi.fn().mockReturnValue({ health: vi.fn() });

    const providerWithQdrant = new LocalMemoryProvider(
      { ...baseConfig, qdrant: qdrantConfig },
      { qdrantFactory },
    );

    expect(qdrantFactory).toHaveBeenCalledWith(qdrantConfig);
    expect((providerWithQdrant as unknown as { qdrant: unknown }).qdrant).toBeDefined();

    const providerWithoutQdrant = new LocalMemoryProvider(baseConfig, { qdrantFactory });

    expect(qdrantFactory).toHaveBeenCalledTimes(1);
    expect((providerWithoutQdrant as unknown as { qdrant: unknown }).qdrant).toBeUndefined();
  });

  it('creates the work queue through the factory with the resolved concurrency', async () => {
    const add = vi.fn(async <T>(task: () => Promise<T>) => task());
    const queueFactory = vi.fn().mockReturnValue({ add });

    const provider = new LocalMemoryProvider(baseConfig, { queueFactory });

    expect(queueFactory).toHaveBeenCalledWith(3);

    await provider.store({ text: 'queued entry' });

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default queue when no factory is provided', async () => {
    const provider = new LocalMemoryProvider({ maxLimit: 2 });

    await provider.store({ text: 'first' });
    await provider.store({ text: 'second' });
    await provider.store({ text: 'third' });

    const records = (provider as unknown as { records: Map<string, unknown> }).records;
    expect(records.size).toBe(2);
  });
});
