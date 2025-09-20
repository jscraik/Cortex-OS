import { describe, it, expect } from 'vitest';
// @ts-nocheck
import { CortexHooks } from '../../src/manager.js';
import type { HookConfig } from '../../src/types.js';

class TestCortexHooks extends CortexHooks {
  // Expose internal config for testing only
  setConfig(cfg: HookConfig) { (this as unknown as { cfg: HookConfig }).cfg = cfg; }
  getConfig(): HookConfig { return (this as unknown as { cfg: HookConfig }).cfg; }
}

describe('command allowlist via settings', () => {
  it('denies non-allowed binary and allows configured one', async () => {
  const hooks = new TestCortexHooks();
    // Patch internal config to avoid FS dependency
    hooks.setConfig({
      settings: { command: { allowlist: ['echo'] } },
      PreToolUse: [
        { matcher: '*', hooks: [ { matcher: '*', type: 'command', command: 'echo hello' } ] },
      ],
    });
    const res = await hooks.run('PreToolUse', { event: 'PreToolUse', cwd: process.cwd(), user: 'test' });
    expect(res[0].action).toBe('exec');

    hooks.setConfig({
      settings: { command: { allowlist: ['nonexistent_bin'] } },
      PreToolUse: [
        { matcher: '*', hooks: [ { matcher: '*', type: 'command', command: 'echo hello' } ] },
      ],
    });
    const res2 = await hooks.run('PreToolUse', { event: 'PreToolUse', cwd: process.cwd(), user: 'test' });
    expect(res2[0].action).toBe('deny');
  });
});
