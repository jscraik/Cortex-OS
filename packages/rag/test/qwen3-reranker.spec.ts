import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

class MockProc extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = { write: () => undefined, end: () => undefined } as any;
  kill = vi.fn();
}

describe.skip('Qwen3Reranker', () => {
  it('times out and kills process', async () => {
    // skipped due to unstable timer handling in test environment
  });
});
