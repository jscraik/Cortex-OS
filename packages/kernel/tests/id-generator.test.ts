import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, resetIdCounter } from '../src/utils/id.js';

describe('ID generator', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('creates deterministic ids when flagged', () => {
    const first = generateId('test', true);
    const second = generateId('test', true);
    resetIdCounter();
    const repeat = generateId('test', true);
    expect(first).toBe('test-000001');
    expect(second).toBe('test-000002');
    expect(repeat).toBe('test-000001');
  });

  it('creates unique ids by default', () => {
    const a = generateId('test');
    const b = generateId('test');
    expect(a).not.toBe(b);
  });
});
