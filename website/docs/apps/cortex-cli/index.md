---
title: Index
sidebar_label: Index
---

# Cortex CLI (Archived)

The legacy Node.js `cortex-cli` has been fully retired. All active command-line workflows now live inside the Rust-based
[`cortex-code`](../cortex-code/docs) binary (`codex`). This page is kept for historical traceability and to help teams finish any
remaining migrations.

## 🚨 Deprecation Summary

- `apps/cortex-cli` was removed from the monorepo as part of the migration to `cortex-code`.
- npm/pnpm packages for `@cortex-os/cli` are no longer published.
- CI, PM2, and developer scripts must reference `cortex-code` instead of `cortex-cli`.

See the [cortex-cli deprecation release notes](../../project-documentation/legacy/cortex-cli-deprecation-release-notes.md) for
a command-by-command migration matrix, rollback plan, and validation gates.

## ✅ What To Use Instead

- **CLI usage** → `cortex-code` (`codex`) provides all supported commands (`mcp`, `a2a`, `rag`, `simlab`, `ctl`, `eval`, `agent`).
- **Tests** → Unit/integration coverage now lives under `apps/cortex-code/tests`.
- **Docs** → Refer to the [`cortex-code` documentation](../cortex-code/docs) for tutorials and examples.

## 🗂 Historical Reference

If you need to inspect the old implementation, check out tag `v0.2024.09-cli-final` and navigate to `apps/cortex-cli/`.
Do not use the archived binaries in production—security patches and new features ship exclusively with `cortex-code`.
