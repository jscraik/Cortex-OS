Exemption Notice: Upstream Submodule Integration (codex-rs)

> **Status (2025-10-01):** *Retired*. The `external/openai-codex` submodule has been
> removed from Cortex-OS. This notice remains for historical context only.

Summary

- Original purpose: adopt and utilize the upstream OpenAI codex-rs submodule at
  `external/openai-codex/codex-rs` while keeping the workspace fully operational.
- Retirement outcome: the workspace now vendors upstream crates through
  `scripts/sync-cortex-code.sh`, eliminating the need for a Git submodule.

Historical Deviations (now closed)

- Workspace composition: temporary extension crates (`chat-cli-plus`,
  `providers-ext`) were introduced instead of modifying upstream crates directly.
- Test hardening: MCP tests sanitized environment variables to avoid accidental
  `OPENAI_API_KEY` leakage.
- UI stability: normalized trailing whitespace in TUI markdown shape tests to keep
  rendering deterministic across environments.

Retirement Rationale

- Removing the submodule simplifies cloning, CI configuration, and dependency
  review while retaining deterministic vendor snapshots via the sync script.
- The explicit workflow documents provenance in
  [`apps/cortex-code/UPSTREAM_SYNC.md`](../apps/cortex-code/UPSTREAM_SYNC.md).

Follow-up Expectations

- Continue monitoring the vendor workflow for drift against upstream licensing
  and security advisories.
- Revisit this notice only if a new exemption is required for future integrations.

Contact

- Owners: Cortex‑OS Engineering
- Context: tracked historically in `apps/cortex-codex/TASK_TRACKER.md`.
