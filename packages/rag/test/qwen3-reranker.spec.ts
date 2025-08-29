import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

class MockProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: () => undefined, end: () => undefined } as any;
  kill = vi.fn();
}

describe('Qwen3Reranker', () => {
  it('times out and kills process', async () => {
    vi.useFakeTimers();
    vi.mock('child_process', () => {
      const proc = new MockProc();
      return {
        spawn: vi.fn(() => proc as unknown as ChildProcess),
        __proc: proc,
      };
    });
    const { Qwen3Reranker } = await import('../src/pipeline/qwen3-reranker');
    const cpMock: any = await import('child_process');
    const proc: MockProc = cpMock.__proc;

    const reranker = new Qwen3Reranker({ timeoutMs: 10, modelPath: 'm' });
    const promise = reranker.rerank('q', [{ id: '1', text: 'doc' }]);

    await vi.runOnlyPendingTimersAsync();
    await expect(promise).rejects.toThrow('timed out');
    expect(proc.kill).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
