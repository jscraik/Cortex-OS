# cortex-cli Deprecation & Migration Notes

Status: Draft
Owner: Platform Eng
Last Updated: 2025-09-15

## 📌 Summary

The legacy `cortex-cli` Node.js application has been fully removed from the monorepo. All supported workflows now live inside the Rust-based `cortex-code` binary (alias `codex`). Users must upgrade local scripts and automation to invoke `cortex-code` instead of `cortex-cli`.

## 🚨 Breaking Changes

- `apps/cortex-cli` and the legacy JavaScript binaries are no longer available.
- npm/pnpm scripts that referenced `cortex-cli` have been deleted or re-pointed to `cortex-code`.
- CI pipelines and PM2 orchestrators now deploy `cortex-code` exclusively.
- Documentation under `website/docs/apps/cortex-cli` is archived for historical reference only.

## 🔄 Command Migration Matrix

| Legacy Command | Replacement | Notes |
| --- | --- | --- |
| `cortex-cli mcp list` | `cortex-code mcp list` | Behavior preserved (JSON output) |
| `cortex-cli mcp doctor` | `cortex-code mcp doctor` | Health JSON mirrors legacy fields |
| `cortex-cli mcp add` | `cortex-code mcp add` | Adds MCP endpoint references |
| `cortex-cli mcp remove` | `cortex-code mcp remove` | Removes MCP endpoint references |
| `cortex-cli mcp get/show` | `cortex-code mcp get/show` | Returns endpoint metadata |
| `cortex-cli mcp search` | `cortex-code mcp search` | Uses new registry adapter |
| `cortex-cli mcp bridge` | `cortex-code mcp bridge` | Bridges MCP to stdio |
| `cortex-cli a2a doctor` | `cortex-code a2a doctor` | Returns `{ ok: true, service: "a2a" }` |
| `cortex-cli a2a list` | `cortex-code a2a list` | Lists registered channels |
| `cortex-cli a2a send` | `cortex-code a2a send` | Sends envelope using new A2A bus |
| `cortex-cli rag ingest/query/eval` | `cortex-code rag ingest/query/eval` | Updated to use unified RAG pipeline |
| `cortex-cli simlab run/bench/report/list` | `cortex-code simlab run/bench/report/list` | Invokes Simlab orchestrator |
| `cortex-cli ctl check` | `cortex-code ctl check` | Reimplemented as thin shim |
| `cortex-cli eval gate` | `cortex-code eval gate` | Hooks into evaluation harness |
| `cortex-cli agent create` | `cortex-code agent create` | Uses new agent-template scaffolder |

Commands not listed above were deemed obsolete and removed. See [`project-documentation/cortex-cli-inventory.md`](../cortex-cli-inventory.md) for the full command evaluation notes.

## ✅ Validation

- Unit and integration coverage for `cortex-code` parity commands live under `apps/cortex-code/tests`.
- Smart Nx wrappers (`pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart`) are the required gates for verification.
- Docs lint (`pnpm docs:lint`) guards markdown updates and changelog entries.

## 🧭 Migration Steps for Developers

1. Replace all `cortex-cli` invocations with `cortex-code` (alias `codex`).
2. Run `pnpm build:smart && pnpm test:smart && pnpm lint:smart` before committing.
3. Update automation scripts and READMEs to reference `cortex-code`.
4. If historical behavior is required, use the archived `apps/cortex-cli` directory from Git history.

## 📣 Communication Plan

- Publish this note in `project-documentation/legacy/`.
- Update README, tutorials, and onboarding flows to reference `cortex-code`.
- Announce migration completion in the internal release bulletin with links to parity tests.

## 🔁 Rollback Guidance

- Restore the `apps/cortex-cli` directory from tag `v0.2024.09-cli-final` if critical regressions surface.
- Re-add workspace entries in `pnpm-workspace.yaml`, `nx.json`, `config/vitest.workspace.ts`, and CI workflows.
- Re-run `pnpm build:smart` and `pnpm test:smart` to ensure compatibility before reintroducing legacy binaries.

---

For additional historical context, see [`project-documentation/cortex-cli-migration-checklist.md`](../cortex-cli-migration-checklist.md) and [`project-documentation/legacy/FEATURE_TRANSFER_PLAN.md`](FEATURE_TRANSFER_PLAN.md).
