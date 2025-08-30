import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

class MockProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: vi.fn(), end: vi.fn() } as any;
  kill = vi.fn();
}

let proc: MockProc;
vi.mock('child_process', () => ({
  spawn: vi.fn(() => proc as any),
}));
const cp = await import('child_process');

describe('Qwen3Embedder', () => {
  beforeEach(() => {
    proc = new MockProc();
    (cp.spawn as any).mockClear();
    vi.useRealTimers();
  });

  it('embeds text via python', async () => {
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: 'model' });
    const promise = embedder.embed(['hello']);
    proc.stdout.emit('data', JSON.stringify({ embeddings: [[1, 2, 3]] }));
    proc.emit('close', 0);
    const out = await promise;
    expect(out).toEqual([[1, 2, 3]]);
    expect(cp.spawn).toHaveBeenCalledTimes(1);
  });

  it('propagates process errors', async () => {
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: 'model' });
    const promise = embedder.embed(['x']);
    proc.stderr.emit('data', 'fail');
    proc.emit('close', 1);
    await expect(promise).rejects.toThrow('Python embedding process failed: fail');
  });

  it('propagates timeout errors', async () => {
    vi.useFakeTimers();
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: 'model' });
    const promise = embedder.embed(['x']);
    vi.runAllTimers();
    await expect(promise).rejects.toThrow('Qwen3 embedder timed out');
  });

  it('passes useGPU flag into python script', async () => {
    const { Qwen3Embedder } = await import('../src/embed/qwen3');
    const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: 'model', useGPU: true });
    const promise = embedder.embed(['hi']);
    proc.stdout.emit('data', JSON.stringify({ embeddings: [[0]] }));
    proc.emit('close', 0);
    await promise;
    const script = (cp.spawn as any).mock.calls[0][1][1];
    expect(script).toContain('use_gpu = True');
  });
});
