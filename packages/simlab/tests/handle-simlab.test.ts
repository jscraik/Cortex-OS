import { describe, expect, it, vi } from 'vitest';
import { errorCodes } from '@cortex-os/lib';
import * as lib from '@cortex-os/lib';
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
    expect(parsed.data.error.code).toBe(errorCodes.INVALID_INPUT);
  });

  it('stores last command in memory', () => {
    const store = lib.createInMemoryStore({ maxItems: 2, maxBytes: 1024 });
    const spy = vi.spyOn(lib, 'createInMemoryStore').mockReturnValue(store);
    handleSimlab({ config: baseConfig, command: baseCommand });
    expect(store.get('lastCommand')).toEqual(baseCommand);
    spy.mockRestore();
  });

  it('logs execution with timestamp', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    handleSimlab({ config: baseConfig, command: baseCommand });
    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0]);
    expect(logged.data.event).toBe('executed');
    expect(typeof logged.meta.timestamp).toBe('string');
    spy.mockRestore();
  });

  it('rejects unknown scenarios', () => {
    const out = handleSimlab({ config: baseConfig, command: { scenario: 'gamma', step: '1' } });
    const parsed = JSON.parse(out);
    expect(parsed.data.error.code).toBe(errorCodes.SCENARIO_NOT_ALLOWED);
  });
});
