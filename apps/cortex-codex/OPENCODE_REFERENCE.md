# OpenCode Upstream Reference (Vendored Snapshot)

This directory contains a **read-only snapshot** of the upstream repository:

- Source: https://github.com/sst/opencode
- Retrieved: (snapshot) shallow clone `--depth 1`
- Location: `apps/cortex-codex/opencode-reference`
- Purpose: Architectural & behavioral reference for implementing Tasks 2.2 & 2.3 (provider abstraction + streaming) in the Rust `codex-core` codebase.

## Why vendored instead of submodule?

Attempts to add a git submodule at paths under `apps/cortex-codex/` failed with nested gitdir errors. To unblock development, we vendored a pruned snapshot (CI-friendly, deterministic). If/when the submodule path issue is resolved, this directory can be removed and replaced with an actual submodule.

## Pruned Content

Removed to reduce footprint:

- `.github/workflows/`
- `infra/`

All remaining files are reference only—**do not edit**; changes will be overwritten on refresh.

## Refresh Procedure

```bash
# From repo root
rm -rf apps/cortex-codex/opencode-reference
git clone --depth 1 https://github.com/sst/opencode apps/cortex-codex/opencode-reference-tmp
rm -rf apps/cortex-codex/opencode-reference-tmp/.git \
       apps/cortex-codex/opencode-reference-tmp/.github/workflows \
       apps/cortex-codex/opencode-reference-tmp/infra || true
mv apps/cortex-codex/opencode-reference-tmp apps/cortex-codex/opencode-reference
```

(Optional) Tag the refresh:

```bash
git add apps/cortex-codex/opencode-reference
GIT_REF=$(date +"%Y%m%d-%H%M")
git commit -m "chore: refresh opencode reference snapshot ${GIT_REF}"
```

## Licensing

Upstream project is MIT-licensed. Retain its `LICENSE` file in this snapshot. MIT is compatible with the Cortex-OS licensing model. See upstream for attribution and notices.

## Usage Guidelines

- **Do Not Import** code directly into runtime-critical modules without re-evaluating for Rust idioms & security.
- Treat this as design input: provider capability modeling, streaming semantics, configuration patterns.
- Avoid copying large swaths verbatim; replicate conceptual patterns only.

## Migration Path to Submodule

Once underlying gitdir conflict is resolved:

```bash
rm -rf apps/cortex-codex/opencode-reference
cd apps/cortex-codex
# (Attempt) git submodule add https://github.com/sst/opencode opencode-upstream
```

Document resolution steps and remove this file afterward.

---

_Last updated: snapshot bootstrap._
