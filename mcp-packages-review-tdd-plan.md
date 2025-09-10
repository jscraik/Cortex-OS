# MCP Packages Review and TDD Plan

## Engineering Principle

Adopt a **Contract-Driven Modular Architecture (CDMA)**: every MCP package must expose strict, schema-validated interfaces and enforce them with automated tests and runtime checks. Cross-package interactions rely on shared contracts to guarantee predictable behavior and operational readiness.

## Technical Review

### `packages/mcp`
- Async client manages pending requests via `_pending` map and uses HTTP transport fallback when specified【F:packages/mcp/core/client.py†L16-L47】
- Server initializes plugins dynamically and registers handlers for tools and hot reloading【F:packages/mcp/core/server.py†L5-L68】【F:packages/mcp/core/server.py†L70-L119】

### `packages/mcp-core`
- `createEnhancedClient` supports HTTP/SSE and stdio transports with Zod validation, enabling flexible tool invocation【F:packages/mcp-core/src/client.ts†L1-L60】

### `packages/mcp-registry`
- File-system backed registry uses locking and atomic writes to maintain consistency of server entries【F:packages/mcp-registry/src/fs-store.ts†L1-L46】【F:packages/mcp-registry/src/fs-store.ts†L48-L64】

### `packages/mcp-bridge`
- Directory not present in repository; references exist in docs and configs, indicating pending implementation【3186b3†L1-L33】

## TDD-Driven Implementation Plan

1. **Restore `mcp-bridge` package**
   - Scaffold package with minimal server/client bridge and README
   - Write failing tests for bridge initialization and registry interaction
   - Implement bridge functions to pass tests

2. **`mcp` package tests**
   - Add test for `_pending` cleanup on disconnect
   - Test plugin hot reloader refresh flow

3. **`mcp-core` enhancements**
   - Add contract tests ensuring unsupported transports raise explicit errors
   - Implement integration tests for HTTP vs stdio paths

4. **`mcp-registry` reliability**
   - Add concurrency test for `writeJson` lock handling
   - Implement schema validation tests for malformed entries

5. **Cross-package integration**
   - End-to-end test: register server via registry, interact through bridge, call tool via client

Each task begins with a failing test, followed by minimal implementation and refactoring, committing after each green test.

