Upstream Sync: codex-rs

Summary
- Upstream source: `external/openai-codex/codex-rs` (submodule of https://github.com/openai/codex)
- Local mirror: `apps/cortex-code` (Rust workspace used by Cortex OS)
- Strategy: git-subtree for merges, weekly drift checks, overlay split for customizations

Prerequisites
- Install Git with `git-subtree` support (e.g., `brew install git`)
- Ensure submodule is initialized: `git submodule update --init --recursive`

Status checks
- Compare file drift: `nx run cortex-code:upstream:diff`
- Compare upstream commit baseline: `nx run cortex-code:upstream:status`

Sync workflow (subtree)
0) First-time migration (recommended)
   - Create a dedicated branch (history rewrite may be significant):
     - `git switch -c chore/cortex-code-subtree-init`
   - Run: `apps/cortex-code/scripts/codex-rs-subtree.sh init`
   - Resolve any conflicts and commit. This seeds subtree metadata for clean future pulls.

1) Pull latest upstream split and merge into local workspace
   - `nx run cortex-code:upstream:pull`
   - Resolves to: `apps/cortex-code/scripts/codex-rs-subtree.sh pull`
   - This fetches `origin/main` of the submodule and merges the `codex-rs` subtree into `apps/cortex-code` with `--squash`.

2) Update baseline
   - The pull script writes the split SHA to `apps/cortex-code/UPSTREAM_REF`.
   - Commit the merge and baseline file together.

3) Resolve conflicts
   - Prefer moving customizations out of upstream crates and into additive crates when possible (see Overlay split below).

Scheduled alerts
- GitHub Action `.github/workflows/cortex-code-upstream.yml` checks weekly whether upstream advanced.
- If drift is detected vs `UPSTREAM_REF`, the workflow fails with guidance to run the pull.

Overlay split (guidelines)
- Goal: keep upstream crates (core/cli/tui/…) as close to upstream as possible.
- Place custom features in additive crates/modules:
  - `apps/cortex-code/anthropic/` (provider-specific code)
  - `apps/cortex-code/zai/` (Z.ai client integration)
  - `apps/cortex-code/providers-ext/` (ext providers, adapters)
- Avoid modifying upstream crates unless strictly necessary; when needed:
  - Add thin extension points (traits, feature flags) rather than forked logic.
  - Keep deltas small, documented, and grouped by feature.

Recommended micro‑policy
- When adding behavior, first attempt to extend via a new crate or module.
- If a small change to upstream crate is required, keep it minimal and reference the overlay crate name in a comment.
- After each upstream pull, run:
  - `cargo check` in `apps/cortex-code`
  - `pnpm codex:test` (or Nx test targets) to verify functionality

Notes
- If `git-subtree` is unavailable, the pull script will exit with a helpful message. You can still use `upstream:diff` and `upstream:status` to monitor changes.
