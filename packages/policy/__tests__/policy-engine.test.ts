import { describe, it, expect } from 'vitest';
import { Grant, enforce } from '../src';

describe('policy engine', () => {
  it('validates allowed action and fsScope', () => {
    const grant: Grant = Grant.parse({
      tool: 'fs',
      actions: ['read'],
      rate: { perMinute: 100 },
      fsScope: ['README.md', 'packages/']
    });

    // allowed path
    expect(() => enforce(grant, 'read', { path: `${process.cwd()}/README.md` })).not.toThrow();

    // disallowed action
    expect(() => enforce(grant, 'write', { path: `${process.cwd()}/README.md` })).toThrow();

    // disallowed path when scoped
    expect(() => enforce(grant, 'read', { path: `${process.cwd()}/outside.txt` })).toThrow();
  });

  it('enforces simple rate limit', () => {
    const grant: Grant = Grant.parse({
      tool: 'fs',
      actions: ['read'],
      rate: { perMinute: 1 },
      fsScope: []
    });

    expect(() => enforce(grant, 'read', {})).not.toThrow();
    expect(() => enforce(grant, 'read', {})).toThrow();
  });
});
