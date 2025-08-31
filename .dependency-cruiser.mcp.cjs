/**
 * Targeted dependency-cruiser config for MCP package boundaries.
 * Run with: depcruise --config .dependency-cruiser.mcp.cjs packages
 */
module.exports = {
  forbidden: [
    // Always forbid cycles
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },

    // Do not allow mutual deps between mcp and mcp-bridge
    {
      name: 'forbid-mcp-to-bridge',
      severity: 'error',
      from: { path: '^packages/mcp/' },
      to: { path: '^packages/mcp-bridge/' },
    },
    {
      name: 'forbid-bridge-to-mcp',
      severity: 'error',
      from: { path: '^packages/mcp-bridge/' },
      to: { path: '^packages/mcp/' },
    },

    // Registry should not depend on mcp (but mcp may depend on registry)
    {
      name: 'forbid-registry-to-mcp',
      severity: 'error',
      from: { path: '^packages/mcp-registry/' },
      to: { path: '^packages/mcp/' },
    },
  ],
  options: { tsConfig: { fileName: 'tsconfig.json' } },
};

