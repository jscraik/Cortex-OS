import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use ESM-safe module mocking for built-ins
vi.mock('fs/promises', () => ({
  access: vi.fn(async () => { throw new Error('nope'); }),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const { EventEmitter } = require('events');
    const emitter = new EventEmitter();
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();
    // @ts-ignore
    emitter.stdout = stdoutEmitter;
    // @ts-ignore
    emitter.stderr = stderrEmitter;
    setTimeout(() => {
      stdoutEmitter.emit('data', 'MLX_MISSING: No module named mlx');
      emitter.emit('close', 0);
    }, 5);
    return emitter;
  }),
}));

// Import after mocks are set
import { createMLXProvider, createAutoMLXProvider } from '@/providers/mlx-provider.js';

describe('MLX Provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createAutoMLXProvider throws when no models found', async () => {
    await expect(createAutoMLXProvider()).rejects.toThrow('No MLX models found');
  });

  it('fails initialization when MLX not installed', async () => {
    const provider = createMLXProvider({ modelPath: '/does/not/exist' });
    await expect(provider.generate('hi', {})).rejects.toThrow(/MLX not properly installed|Model not found/);
    const { spawn } = await import('child_process');
    expect((spawn as any).mock.calls.length).toBeGreaterThan(0);
  });
});
