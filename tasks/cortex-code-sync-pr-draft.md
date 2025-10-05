---
Title: "Vendor sync: apps/cortex-code from openai/codex (codex-rs)"
labels: ["vendor", "cortex-code", "automated"]
---

## Vendor Sync: apps/cortex-code ← openai/codex/codex-rs

- Upstream repo: <https://github.com/openai/codex>
- Upstream subdir: `codex-rs`
- Upstream commit: `acfd182c` (full: acfd182ce276080f495607aea30e24e3b2e12161)
- Previous upstream: see `UPSTREAM_REF` history
- Timestamp (UTC): 2025-10-01T21:39:44Z

## Summary

This PR vendors the latest Rust crates from `openai/codex` (`codex-rs`) into `apps/cortex-code`.

Highlights:

- New crate: `app-server-protocol`
- Executor modules added under `core/src/executor/*`
- Event processor renamed to JSONL variant
- New protocol file `conversation_id.rs`
- Broad updates across `app-server`, `cli`, `core`, `login`, `mcp-server`, `otel`, `protocol`, `protocol-ts`, `tui`

## Churn Metrics

- Files changed: 130
- Lines added: 3876
- Lines deleted: 1607

> Derived via `git diff --numstat -- apps/cortex-code/` on the staged diff.

## Local Overlay

Kept overlay files (ignored during sync):

- `A2A_IMPLEMENTATION.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `PNPM.md`
- `UPSTREAM_SYNC.md`

## How to Reproduce

Dry-run:

```bash
./scripts/sync-cortex-code.sh
```

Apply:

```bash
./scripts/sync-cortex-code.sh --run
```

## Notes

- `UPSTREAM_REF` updated to `acfd182ce276080f495607aea30e24e3b2e12161`.
- brAInwav-branded outputs are included in the vendor script logs.

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
