# MCP Package Consolidation

Status: complete (canonical entrypoint established)

This document records the consolidation of MCP-related packages into a single, operational import surface via `@cortex-os/mcp`.

Authoritative spec reference: `/Users/jamiecraik/.Cortex-OS/.cortex/context/protocols/model-context-protocol.md`

## Goals

- Provide one definitive import surface for MCP consumers
- Remove ambiguity among similarly named packages (e.g., "bridge")
- Preserve modular ownership and CI boundaries without code duplication

## Canonical Mapping

- `@cortex-os/mcp/client` → re-exports `@cortex-os/mcp-core`
- `@cortex-os/mcp/bridge` → re-exports `@cortex-os/mcp-transport-bridge`
- `@cortex-os/mcp/registry` → re-exports `@cortex-os/mcp-registry`
- `@cortex-os/mcp` (root) → re-exports selected stable interfaces from `@cortex-os/mcp-bridge` (marketplace, managers) and retains a minimal `handleMCP` shim

No code was deleted in this pass. Instead, `@cortex-os/mcp` now centralizes exports to ensure a single, stable entrypoint while packages retain focused responsibilities:

- `mcp-core`: Client primitives and contracts aligned with SDK
- `mcp-transport-bridge`: stdio ↔ streamable HTTP bridge + CLI
- `mcp-registry`: Schemas and validation utilities for servers/registry
- `mcp-bridge`: Marketplace, configuration management, connection manager
- `mcp-server`: Example/operational server app (Express, demo tools)

## Rationale

- Aligns with the Model Context Protocol (MCP) layers: client, server, transport, registry
- Eliminates naming confusion without risky refactors or renames
- Keeps CI and release pipelines stable

## Next Steps (optional)

- Mark legacy direct imports as deprecated in docs and IDE hints, encouraging `@cortex-os/mcp` imports
- If desired, enforce via lint rule: disallow cross-package MCP imports outside `@cortex-os/mcp`
- Consider renaming `@cortex-os/mcp-bridge` → `@cortex-os/mcp-marketplace` in a future major to further clarify roles
