import { describe, it, expect } from 'vitest';
import { SecureCommandExecutor } from '../src/secure-executor.js';

describe('SecureCommandExecutor', () => {
  it('executes allowed command', async () => {
    const result = await SecureCommandExecutor.executeCommand(['echo', 'test']);
    expect(result.stdout.trim()).toBe('test');
    expect(result.exitCode).toBe(0);
  });

  it('rejects disallowed command', async () => {
    await expect(SecureCommandExecutor.executeCommand(['rm', '-rf', '/'])).rejects.toThrow();
  });
});
