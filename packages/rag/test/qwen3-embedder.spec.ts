
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

class MockProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: () => undefined, end: () => undefined } as any;
  kill = vi.fn();
}


describe('Qwen3Embedder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-'));
    const modelDir = path.join(tempDir, 'Qwen3-Embedding-0.6B');
    fs.mkdirSync(modelDir, { recursive: true });
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: modelDir });
    const promise = embedder.embed(['hello']);
    proc.stdout.emit('data', JSON.stringify({ embeddings: [[1, 2, 3]] }));
    proc.emit('close', 0);
    const result = await promise;
    expect(result).toEqual([[1, 2, 3]]);
    expect(proc.runProcess).toHaveBeenCalledTimes(1);
  });

  it('propagates process errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('fail'));
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    await expect(embedder.embed(['x'])).rejects.toThrow('fail');
  });

  it('propagates timeout errors', async () => {
    vi.spyOn(proc, 'runProcess').mockRejectedValue(new Error('timed out'));
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    await expect(embedder.embed(['x'])).rejects.toThrow('timed out');
  });

  it('passes useGPU flag into python script', async () => {
    vi.mock('child_process', () => {
      const proc = new MockProc();
      return {
        spawn: vi.fn(() => proc as unknown as ChildProcess),
        __proc: proc,
      };
    });
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const cpMock: any = await import('child_process');
    const proc: MockProc = cpMock.__proc;

    const embedder = new Qwen3Embedder({ modelSize: '0.6B', useGPU: true });
    const promise = embedder.embed(['hi']);
    proc.stdout.emit('data', JSON.stringify({ embeddings: [[0, 0, 0]] }));
    proc.emit('close', 0);
    await promise;
    const script = cpMock.spawn.mock.calls[0][1][1];
    expect(script).toContain('use_gpu = True');
  });
});
