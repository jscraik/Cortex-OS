import { describe, expect, it } from 'vitest';
import { ServerInfoSchema } from '../contracts';
import * as api from '..';

describe('contracts', () => {
  it('validates server info', () => {
    const info = { name: 'demo', transport: 'stdio', command: 'echo' };
    const parsed = ServerInfoSchema.parse(info);
    expect(parsed.name).toBe('demo');
  });

  it('exposes createEnhancedClient', () => {
    expect(typeof api.createEnhancedClient).toBe('function');
  });
});
