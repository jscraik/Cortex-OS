import { createHash } from 'crypto';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('crypto hashing fuzz', () => {
  it('sha256 digest is 64 hex chars', () => {
    return fc.assert(
      fc.property(fc.string(), (input) => {
        const digest = createHash('sha256').update(input).digest('hex');
        expect(digest).toMatch(/^[a-f0-9]{64}$/);
      })
    );
  });
});
