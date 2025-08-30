import { describe, expect, it, vi } from 'vitest';
import { validateMessage } from './transport.js';
import { parseTransportConfig } from './transport-schema.js';

describe('parseTransportConfig', () => {
  it('rejects dangerous stdio commands', () => {
    expect(() => parseTransportConfig({ type: 'stdio', command: 'rm -rf /' } as any)).toThrow(
      /Unsafe command/,
    );
  });

  it('accepts http transport', () => {
    const cfg = parseTransportConfig({ type: 'http', url: 'http://localhost' });
    expect(cfg.type).toBe('http');
  });
});

describe('validateMessage', () => {
  it('calls onError for invalid messages', () => {
    const spy = vi.fn();
    validateMessage({ jsonrpc: '1.0', id: 1 } as any, spy);
    expect(spy).toHaveBeenCalled();
  });

  it('passes valid messages', () => {
    expect(() => validateMessage({ jsonrpc: '2.0', id: 1, method: 'test' })).not.toThrow();
  });
});
