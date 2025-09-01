import { mergeMcpConfigs, McpConfig } from '../config-loader';

describe('mergeMcpConfigs', () => {
  it('merges multiple configs without duplicates', () => {
    const cfg1: McpConfig = {
      version: '1',
      tools: [{ id: 't1', server: 's1', scopes: [] }],
    };
    const cfg2: McpConfig = {
      version: '1',
      tools: [{ id: 't2', server: 's2', scopes: [] }],
    };
    const merged = mergeMcpConfigs([cfg1, cfg2]);
    expect(merged.tools).toHaveLength(2);
  });

  it('throws on duplicate tool ids', () => {
    const cfg1: McpConfig = {
      version: '1',
      tools: [{ id: 't1', server: 's1', scopes: [] }],
    };
    const cfg2: McpConfig = {
      version: '1',
      tools: [{ id: 't1', server: 's2', scopes: [] }],
    };
    expect(() => mergeMcpConfigs([cfg1, cfg2])).toThrow(
      'Duplicate MCP tool id: t1',
    );
  });
});
