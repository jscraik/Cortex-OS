import { describe, it, expect } from 'vitest';
import { runSandboxed } from '../src/lib/sandbox.js';

describe('runSandboxed', () => {
  it('executes code and returns result', async () => {
    const result = await runSandboxed({ code: '1 + 1' });
    expect(result).toBe(2);
  });

  it('prevents access to process', async () => {
    expect(() => runSandboxed({ code: 'process.exit()' })).toThrow();
  });

  it('enforces timeout', async () => {
    await expect(runSandboxed({ code: 'while(true){}', timeoutMs: 10 })).rejects.toThrow();
  });
});
