import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';

const spawnSpy = vi.hoisted(() => vi.fn());

vi.mock('child_process', () => ({ spawn: spawnSpy }));

import { MLXEmbedder } from '../src/adapters/embedder.mlx.js';

describe('MLXEmbedder environment override', () => {
  it('passes MLX_MODELS_DIR to the Python process', async () => {
    const customDir = '/tmp/models';
    process.env.MLX_MODELS_DIR = customDir;

    const mockProc: any = new EventEmitter();
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    mockProc.kill = vi.fn();

    spawnSpy.mockReturnValue(mockProc as any);

    const embedPromise = new MLXEmbedder('qwen3-0.6b').embed(['hi']);

    // Wait until spawn is invoked so runPython listeners are registered
    await vi.waitUntil(() => spawnSpy.mock.calls.length > 0);

    mockProc.stdout.emit('data', JSON.stringify({ embeddings: [[0.1, 0.2]] }));
    mockProc.emit('close', 0);

    await embedPromise;

    const env = spawnSpy.mock.calls[0][2]?.env as Record<string, string>;
    expect(env.MLX_MODELS_DIR).toBe(customDir);

    spawnSpy.mockReset();
    delete process.env.MLX_MODELS_DIR;
  });
});
