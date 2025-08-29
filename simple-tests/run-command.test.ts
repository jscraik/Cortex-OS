import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { runCommand } from '../src/lib/runCommand';

const fixture = join(__dirname, 'fixtures', 'long-running.js');

describe('runCommand', () => {
  it('terminates process after timeout', async () => {
    const start = Date.now();
    await expect(
      runCommand('node', [fixture], { timeoutMs: 100 }),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
