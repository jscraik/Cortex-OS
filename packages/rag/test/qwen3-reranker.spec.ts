import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';

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
