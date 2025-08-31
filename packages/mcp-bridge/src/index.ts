// Delegated wrapper: Consolidated into @cortex-os/mcp
// This package now re-exports the canonical bridge surface from the unified MCP package.
// Prefer importing from `@cortex-os/mcp` going forward.

// Primary bridge APIs only. For managers/registry/client, import from `@cortex-os/mcp`.
export * from '@cortex-os/mcp/bridge';
