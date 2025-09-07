Exemption Notice: Upstream Submodule Integration (codex-rs)

Summary

- Purpose: adopt and utilize the upstream OpenAI codex-rs submodule at `external/openai-codex/codex-rs` while keeping our workspace fully operational.
- Scope: introduces extension crates, adjusts tests, and prepares dependency rewiring to upstream crates.

Temporary Deviations

- Workspace composition: added two extension crates instead of modifying upstream crates directly.
  - `apps/cortex-codex/chat-cli-plus` (new bin `codex-chat`) – hosts Chat streaming CLI behavior decoupled from `codex-core` internals.
  - `apps/cortex-codex/providers-ext` – façade for provider abstractions; will become the new home for provider selection/registry logic.
- Test hardening: sanitized environment in MCP tests to avoid `.env` leakage that could set `OPENAI_API_KEY` during CI.
  - Ensures hermetic behavior regardless of developer/local environment.
- UI shape stability: normalized trailing whitespace in a TUI markdown shape test to avoid environment-dependent diffs while preserving rendering semantics.

Rationale

- Keeps upstream crates pristine and allows staged migration without breaking existing behavior.
- Maintains green tests and enables parallel verification against the upstream submodule.

Risk and Mitigation

- Risk: minor differences in CLI stream-mode behavior handling when decoupled from core.
  - Mitigation: unit and integration tests cover legacy flags, JSON NDJSON streaming, and precedence (CLI > env > default).
- Risk: provider logic migration could introduce regressions when moved.
  - Mitigation: staged move into `providers-ext` with re-exports first, followed by targeted test migration.

Validation

- `cargo test --workspace` passes locally across all crates, including the new extension crates.
- Upstream submodule (`external/openai-codex/codex-rs`) builds and tests pass independently.

Planned Follow-ups

1) Dependency rewiring: repoint local crates to use upstream `codex-rs` crates via path dependencies; remove duplicate local crates from the workspace.
2) Provider migration: move `core/src/providers/*` into `providers-ext` and update dependents accordingly.
3) Finalize: delete transitional re-exports and update documentation.

Contact

- Owners: Cortex‑OS Engineering
- Context: tracked in `apps/cortex-codex/TASK_TRACKER.md`.
