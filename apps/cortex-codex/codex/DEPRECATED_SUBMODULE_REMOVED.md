# codex-rs Submodule Removed

The nested `codex/codex-rs` tree has been removed (2025-09-06) to eliminate code duplication and drift.

Authoritative Rust workspace now lives directly under `apps/cortex-codex/` with crates:
`ansi-escape`, `apply-patch`, `arg0`, `chatgpt`, `cli`, `common`, `core`, `exec`, `execpolicy`, `file-search`, `linux-sandbox`, `login`, `mcp-client`, `mcp-server`, `mcp-types`, `ollama`, `protocol`, `protocol-ts`, `tui`.

## Rationale
- Prevent divergence between duplicated crates
- Simplify streaming feature evolution (unified `--stream-mode`, JSON streaming)
- Reduce CI/build overhead and confusion for contributors

## Historical Reference
If you need the last snapshot, recover it from git history:

```bash
git show <pre-removal-commit>:apps/cortex-codex/codex/codex-rs/README.md > /tmp/codex-rs-README.md
```

## Upstream Sync
Any future upstream (OpenAI Codex) diffs should be applied directly to the canonical crates.

## Actions Follow-Up
- Ensure no CI workflows reference the removed path
- Remove any stale fixture references over time (e.g. JSONL logs with `/codex/codex-rs` paths) during fixture refresh cycles.

---
_Last updated: 2025-09-06_
