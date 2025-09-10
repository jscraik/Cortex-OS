import { beforeEach, describe, expect, it } from 'vitest';
import { createEmbedderFromEnv, resolveEmbedderKindFromEnv } from '../src/index.js';

const ENV0 = { ...process.env };

describe('embedder-factory', () => {
  beforeEach(() => {
    process.env = { ...ENV0 };
  });

  it('defaults to noop when unset or unknown', () => {
    delete process.env.MEMORIES_EMBEDDER;
    expect(resolveEmbedderKindFromEnv()).toBe('noop');
    let emb = createEmbedderFromEnv();
    expect(emb.name()).toContain('noop');

    process.env.MEMORIES_EMBEDDER = 'unknown';
    emb = createEmbedderFromEnv();
    expect(emb.name()).toContain('noop');
  });

  it('attempts ollama and falls back gracefully if unavailable', () => {
    process.env.MEMORIES_EMBEDDER = 'ollama';
    process.env.OLLAMA_MODEL = 'nomic-embed-text';
    const emb = createEmbedderFromEnv();
    expect(typeof emb.name()).toBe('string');
  });
});
