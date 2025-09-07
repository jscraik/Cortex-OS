# MCP Suite Development Plan

This document outlines a strict software engineering and test-driven development (TDD) roadmap to bring the MCP suite to operational readiness.

## Process Guidelines

1. **TDD Cycle** for every task:
   - Write a failing test that describes the requirement.
   - Implement the minimal code to make the test pass.
   - Refactor and ensure tests remain green.
2. **Commit Strategy**
   - One feature or fix per commit using Conventional Commits.
   - Include tests and implementation together.
   - Run `pre-commit run --files <changed_files>` and `pnpm test` (or `pnpm docs:lint` for docs) before committing.

## Packages Overview

### 1. `@cortex-os/mcp`

| Requirement | Tasks |
|-------------|-------|
| Capability discovery & tool allowlist | 1. Add failing tests for capability queries and allowlisted tool execution. 2. Implement registry lookups and allowlist enforcement. |
| Sandbox policies | 1. Add tests restricting tool side effects. 2. Integrate policy engine with deny-by-default behavior. |
| Streaming chunk control | 1. Define tests for configurable chunk size/rate limits. 2. Implement transport-level controls with backpressure. |
| Problem+JSON error mapping | 1. Add tests verifying RFC 9457 compliance. 2. Map internal errors to Problem+JSON responses. |
| Per-tool cost/latency metrics | 1. Add tests recording metrics per invocation. 2. Implement OTEL meters and accumulate cost/latency data. |

### 2. `@cortex-os/mcp-bridge`

| Requirement | Tasks |
|-------------|-------|
| Create package skeleton | 1. Scaffold package with build/test setup. 2. Add failing tests for stdio↔HTTP/SSE bridging. |
| Streaming & backpressure | 1. Write tests for flow control across transports. 2. Implement streaming bridge with queue limits. |
| Optional mTLS | 1. Add tests requiring client/server certificates. 2. Integrate TLS configuration and validation. |
| Edge cache (nice-to-have) | 1. Add tests for cached responses. 2. Implement cache layer with invalidation. |

### 3. `@cortex-os/mcp-registry`

| Requirement | Tasks |
|-------------|-------|
| Resolve dependency on `@cortex-os/mcp-core` | 1. Fix imports and add smoke tests. |
| HTTP index & capability search | 1. Add failing HTTP API tests. 2. Implement Express/Koa server with search endpoints. |
| Signature info & schema refs | 1. Add tests validating signature metadata and schema reference resolution. 2. Extend registry data model. |
| Health cache & policy hints | 1. Add tests caching health checks and exposing policy hints. 2. Implement caching layer and hint fields. |

### 4. `@cortex-os/mcp-server`

| Requirement | Tasks |
|-------------|-------|
| Package scaffolds | 1. Create templates for TS & Python servers with tests. 2. Ensure health endpoints and schema guards. |
| Examples | 1. Add example servers demonstrating tool integration. 2. Include documentation and tests. |
| Codegen from schemas (should) | 1. Add tests generating stubs from JSON Schemas. 2. Implement code generation utilities. |
| Adapters (nice-to-have) | 1. Add tests for adapter pattern to wrap external APIs. 2. Implement adapter classes. |

## Milestones

1. **Bootstrap** – Fix failing tests in existing packages and set up CI.
2. **Core Features** – Complete `@cortex-os/mcp` requirements.
3. **Bridge & Registry** – Implement `mcp-bridge` and upgrade `mcp-registry`.
4. **Server Scaffolds** – Deliver `mcp-server` templates and examples.
5. **Polish & Docs** – Add edge cases, refactor, and produce end-user documentation.

## Deliverables & Checkpoints

- Regular commits after each micro-feature.
- Pull requests require green CI and documentation updates.
- Final acceptance: all packages feature-complete with passing tests and lint checks.

