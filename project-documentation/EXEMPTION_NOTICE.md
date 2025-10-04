Exemption Notice: Upstream Submodule Integration (codex-rs)

Summary

- Purpose: adopt and utilize the upstream OpenAI codex-rs submodule at `external/openai-codex/codex-rs` while keeping our workspace fully operational.
- Scope: introduces extension crates, adjusts tests, and prepares dependency rewiring to upstream crates.

Temporary Deviations

- Workspace composition: the codex-rs workspace now lives under `apps/cortex-code/`.
  - `apps/cortex-code/cli` (bin `codex`) hosts the streaming CLI experience decoupled from shared `core` logic.
  - `apps/cortex-code/core` continues to expose provider abstractions while we migrate the remaining registries from legacy crates.
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
- Context: tracked in `project-documentation/cortex-code/TASKS.md`.
