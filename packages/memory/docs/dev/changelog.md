# Memory Package Changelog (pr-355)

> **Location**: `apps/cortex-os/packages/memory/docs/dev/changelog.md`  
> **Relocated from**: `dev/memory-changelog.md` (2025-08-20)

Short summary:

- Fix: ensure `undici` is available to `apps/cortex-os/packages/memory` tests by adding `undici@^6.19.8` locally.
- Add: `apps/cortex-os/packages/memory/RUNBOOK.md` with install/test/troubleshooting steps.

Why: tests that exercise `src/adapters/qdrant.ts` import `undici` at runtime; without it the memory package tests fail. This is a minimal, low-risk fix.

Test results (this session)

- Memory package (`apps/cortex-os/packages/memory`)
  - Test files: 3 passed, 1 skipped
  - Tests: 6 passed, 1 skipped
  - Duration: ~355ms

- Rag package (`packages/rag`)
  - Test files: 11 failed
  - Tests: 77 failed, 59 passed, 20 skipped (156 total)
  - Key failure clusters: FAISS service startup timeout, missing `packages/rag/config` files, missing `fs` mock exports, many integration tests that require external services or fixtures.

How to reproduce locally

1. From repo root run:

```bash
pnpm install
cd apps/cortex-os/packages/memory
pnpm test
```

2. To run the rag package tests (note: environment required):

```bash
cd packages/rag
pnpm test
```

Next actions recommended (pick one)

- Commit the two small artifacts (`package.json` update in memory package + `RUNBOOK.md`) and open a PR. Then run `pnpm install` at repo root to update the lockfile.
- Alternatively, revert the package-local install and instead update the repo root `pnpm-lock.yaml` via a workspace install so all packages share the dependency graph (preferred for long term consistency).
