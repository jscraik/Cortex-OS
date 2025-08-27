import { describe, it, expect } from 'vitest';
import { createHTTPS } from '@cortex-os/mcp-transport/https';

describe('https', () => {
  it('throws without endpoint', () => {
    // @ts-expect-error
    expect(() => createHTTPS({})).toThrow();
  });
});
