import { describe, expect, it } from 'vitest';
import { mergeMcpConfigs, type McpConfig } from '../src/config-loader.js';

describe('mergeMcpConfigs', () => {
  it('rejects duplicate IDs without override', () => {
    const a = {
      $source: 'a.json',
      version: '1',
      tools: [{ id: 't1', server: 'http://a', scopes: [], meta: {} }],
    } satisfies McpConfig as never;
    const b = {
      $source: 'b.json',
      version: '1',
      tools: [{ id: 't1', server: 'http://b', scopes: [], meta: {} }],
    } satisfies McpConfig as never;
    expect(() => mergeMcpConfigs([a, b])).toThrow(/Duplicate MCP tool id/);
  });
});
