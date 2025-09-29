---
title: Changelog
sidebar_label: Changelog
---

# Changelog

## 1.1.0
- Replaced placeholder MCP tools with production adapters for Cortex knowledge
  search and Local Memory persistence.
- Added environment-driven configuration via `config.py` and documented required
  variables (`CORTEX_MCP_*`, `JWT_SECRET_KEY`).
- Hardened REST routes with JWT + rate limiting hooks and Prometheus metrics.
- Removed committed virtual environments and refreshed deployment runbooks.

## 1.0.0
- Initial release of `cortex-mcp` with server, CLI and plugin framework.
