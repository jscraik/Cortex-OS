// Delegated wrapper: Consolidated into @cortex-os/mcp
// This package now re-exports the canonical bridge surface from the unified MCP package.
// Prefer importing from `@cortex-os/mcp` going forward.

// Primary bridge APIs only. For managers/registry/client, import from `@cortex-os/mcp`.
// During tests, resolve directly to the local source to avoid requiring a build of @cortex-os/mcp.
export * from "../../mcp/src/bridge.js";
