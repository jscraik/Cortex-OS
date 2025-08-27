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
  it('spawns python once and returns embeddings', async () => {
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

    const embedder = new Qwen3Embedder({ modelSize: '0.6B' });
    const promise = embedder.embed(['hello']);
    proc.stdout.emit('data', JSON.stringify({ embeddings: [[1, 2, 3]] }));
    proc.emit('close', 0);
    const result = await promise;
    expect(result).toEqual([[1, 2, 3]]);
    expect(cpMock.spawn.mock.calls.length).toBe(1);
  });
});
