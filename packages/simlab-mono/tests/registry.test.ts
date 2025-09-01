import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import registry from '../datasets/registry.json' with { type: 'json' };

describe('dataset registry', () => {
  it('matches checksum for critical scenarios', () => {
    const entry = registry.critical;
    const data = readFileSync(new URL(`../${entry.path}`, import.meta.url));
    const hash = createHash('sha256').update(data).digest('hex');
    expect(hash).toBe(entry.sha256);
    expect(entry.license).toBe('Apache-2.0');
  });
});
