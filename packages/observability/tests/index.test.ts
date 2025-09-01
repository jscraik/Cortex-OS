import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index.js';

describe('package entry', () => {
  it('exports modules', () => {
    expect(pkg).toBeTruthy();
  });
});
