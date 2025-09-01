import * as lib from '@cortex-os/lib';
import { describe, expect, it, vi } from 'vitest';
import { handleSimlab } from '../src/index';

const baseConfig = { memory: { maxItems: 2, maxBytes: 1024 } };
const baseCommand = { scenario: 'alpha', step: '1' };

describe('handleSimlab', () => {
  it('returns std output when json flag is absent', () => {
    const out = handleSimlab({ config: baseConfig, command: baseCommand });
    expect(out).toMatch(/Simlab executed scenario=alpha step=1$/);
  });

  it('returns json output when json flag is true', () => {
    const out = handleSimlab({ config: baseConfig, command: baseCommand, json: true });
    const parsed = JSON.parse(out);
    expect(parsed.data).toEqual({ executed: true, scenario: 'alpha', step: '1' });
  });

  it('returns structured error for invalid input', () => {
    const out = handleSimlab({});
    const parsed = JSON.parse(out);
    expect(parsed.error.code).toBe('INVALID_INPUT');
  });

  it('stores last command in memory', () => {
    const store = lib.createInMemoryStore({ maxItems: 2, maxBytes: 1024 });
    const spy = vi.spyOn(lib, 'createInMemoryStore').mockReturnValue(store);
    handleSimlab({ config: baseConfig, command: baseCommand });
    expect(store.get('lastCommand')).toEqual(baseCommand);
    spy.mockRestore();
  });
});
