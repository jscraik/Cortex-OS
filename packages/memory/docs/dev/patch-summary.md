# Memory Slice Minimal Patch Summary

> **Location**: `apps/cortex-os/packages/memory/docs/dev/patch-summary.md`  
> **Relocated from**: `dev/memory-patch-summary.md` (2025-08-20)

Purpose: capture the minimal changes made locally to unblock `apps/cortex-os/packages/memory` tests and provide a tiny, reviewer-friendly patch for commit/PR.

Changed files (local edits during this session)

- `apps/cortex-os/packages/memory/package.json`
  - added dependency: `undici@^6.19.8` to satisfy runtime import from `src/adapters/qdrant.ts` used in tests
- `apps/cortex-os/packages/memory/RUNBOOK.md`
  - new: developer runbook (install, run, debug steps for the memory package)

Minimal human-readable patch (apply or use as PR description):

**_ Begin Minimal Diff
_** Update File: apps/cortex-os/packages/memory/package.json
@@

- "dependencies": {
- "...": "..."
- }

* "dependencies": {
* "undici": "^6.19.8",
* "...": "..."
* }
  \*\*\* End Minimal Diff

Notes & rationale:

- `qdrant.ts` imports `undici` at runtime; tests run under the package dir must resolve this module. Installing `undici` locally (or updating the workspace lockfile) fixes the runtime error without changing code.
- I avoided touching adapter code; the dependency approach is minimal and low risk. If you prefer, we can instead change the adapter to use a light wrapper and stub for tests (larger change).

Recommended reviewer checklist:

- Confirm `undici` is acceptable as a runtime dependency for the memory package.
- Prefer committing the package.json change and the new `RUNBOOK.md` in the same PR.
- Run `pnpm install` at the repo root after merge to update the workspace lockfile (`pnpm-lock.yaml`) and ensure all packages resolve.
