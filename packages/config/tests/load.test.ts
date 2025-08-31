import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/load.js';

describe('loadConfig', () => {
  it('parses defaults', () => {
    const cfg = loadConfig({});
    expect(cfg.PORT).toBe('3000');
  });
});
