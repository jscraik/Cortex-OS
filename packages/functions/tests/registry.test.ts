import { describe, it, expect } from 'vitest';
import { FunctionRegistry } from '../src/registry.js';

describe('FunctionRegistry', () => {
  it('registers and runs a function', async () => {
    const registry = new FunctionRegistry();
    registry.register({ id: 'hello', version: '0.1.0' }, async (input) => `hi ${input}`);
    const result = await registry.run('hello', 'world');
    expect(result).toBe('hi world');
  });
});
