# Cortex-OS Applications

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This directory contains the main applications and user-facing components of the Cortex-OS ecosystem.

## Directory Structure

- `/apps/cortex-os/` - **Main ASBR Runtime** - Coordinates feature packages and provides CLI/HTTP/UI interfaces
- `/apps/cortex-py/` - Python bindings and utilities for Cortex-OS

## Application Overview

### Core Applications

#### ASBR Runtime (`cortex-os`)

The main application that coordinates feature packages and provides the primary interfaces for Cortex-OS. This is the central orchestrator that mounts feature packages via dependency injection.

#### CLI (`cortex-cli`)

Command-line interface providing direct access to Cortex-OS functionality, including agent management, memory operations, and system administration.

#### Web UI (`cortex-webui`)

Modern web-based interface for interacting with Cortex-OS, featuring real-time monitoring, agent configuration, and system management capabilities.

### Development Tools

#### Codex Workspace (`cortex-code`)

Rust-based workspace that packages the Codex CLI/TUI along with shared crates for sandboxing, providers, and integrations.

### Integration & APIs

#### REST API (`api`)

RESTful API server exposing Cortex-OS functionality to external applications and services.

> **Why it lives outside `cortex-os`**: The API is an Express gateway that boots its own
> HTTP stack, authentication middleware, and CloudEvents bridge. It depends on Prisma and
> Better Auth, publishes onto the A2A bus, and exposes MCP tooling entrypoints. Folding
> that server into the `cortex-os` runtime would co-locate web concerns with the ASBR
> orchestrator, forcing the runtime process to host HTTP listeners, auth state, and
> database connections it currently does not manage. Keep it as an independently deployable
> service and communicate with the runtime over the existing event bus boundaries.

#### Marketplace (`cortex-marketplace` & `cortex-marketplace-api`)

Platform for discovering, sharing, and managing Cortex-OS agents, tools, and extensions.

#### Python Bindings (`cortex-py`)

Python libraries and utilities for integrating Cortex-OS with Python-based workflows and
applications.

## Architecture Principles

- **Domain Separation**: Applications communicate via A2A events, service interfaces, or MCP tools
- **No Direct Cross-Feature Imports**: Use defined contracts and message passing
- **Dependency Injection**: ASBR runtime manages feature mounting and service wiring
- **Contract-Based Communication**: All inter-application communication uses Zod/JSON schemas

## Getting Started

Each application directory contains its own README with specific setup and usage instructions. For general development workflow:

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build all applications
pnpm build

# Run tests
pnpm test
```

## Related Documentation

- [ASBR Architecture](/apps/cortex-os/README.md)
- [Feature Package Guidelines](/.github/copilot-instructions.md)
- [Agent Development](/../AGENTS.md)
- [Integration Patterns](/packages/README.md)

## Cortex OS MCP Additions

Recent enhancements to the MCP gateway (in `apps/cortex-os`):

- Workflow run persistence: Calls to `orchestration.run_workflow` now persist an
  in-memory run record keyed by `runId`. Subsequent
  `orchestration.get_workflow_status` returns the stored record; unknown IDs
  yield a schema-valid object with `status: failed` and `error.code: not_found`.
- Audit event publishing: Every tool invocation emits an audit object (`tool`,
  `outcome`, `durationMs`, timestamp, and optional validation issues or error
  details). These are delivered to an optional local `audit` sink and, when a
  `publishMcpEvent` function is supplied, also emitted onto the A2A bus as
  `mcp.tool.audit.v1` events.

Example wiring snippet:

```ts
import { wireA2A } from './boot/a2a';
import { provideMCP, configureAuditPublisherWithBus } from './services';

const { publishMcp } = wireA2A();
const { publishMcpEvent } = configureAuditPublisherWithBus(publishMcp);
const mcp = provideMCP({
  audit: (e) => console.debug('[mcp-audit]', e),
  publishMcpEvent
});
```

Tests covering these behaviors: `tests/mcp/workflow.persistence.test.ts` and `tests/mcp/facade.contract.test.ts`.
