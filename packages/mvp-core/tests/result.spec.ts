import { describe, expect, it } from 'vitest';
import { err, ok, wrap } from '../src/result.js';

describe('result', () => {
  it('ok/err', () => {
    expect(ok(1).ok).toBe(true);
    expect(err(new Error('x')).ok).toBe(false);
  });
  it('wrap', async () => {
    const a = await wrap(async () => 42);
    expect(a.ok && a.value === 42).toBe(true);
  });
});
