# Memory & RAG Integration Bug List (pr-355)

> **Location**: `apps/cortex-os/packages/memory/docs/dev/bug-list.md`  
> **Relocated from**: `dev/memory-bug-list.md` (2025-08-20)

This list focuses on the small surface we exercised (memory package) and the rag package integration run we executed.

1. Missing runtime dependency resolved by local install
   - Symptom: Vitest failure "Cannot find package 'undici' imported from .../src/adapters/qdrant.ts" when running `apps/cortex-os/packages/memory` tests.
   - Cause: `undici` not present in package node_modules at test time (workspace install didn't provide it in the package's node_modules tree in this environment).
   - Fix (applied locally): `pnpm add -w` or `pnpm add undici@6.19.8` inside `apps/cortex-os/packages/memory` (minimal). Prefer updating workspace lockfile in a follow-up commit.

2. `packages/rag` integration exposes many environment/config sensitivity points
   - Symptom: running tests in `packages/rag` produced many failures (FAISS service not available, missing config files under `packages/rag/config`, missing schema files, fs mocks missing methods, and large integration expectations requiring external services). See test output summary in the changelog.
   - Action: treat `packages/rag` failures as unrelated to the isolated memory change; they require separate fixes: supply test fixtures (config files), add lighter unit tests with fakes, or run in CI that can start FAISS/gRPC services.

3. Missing test fixtures and mocks
   - Symptom: tests in `packages/rag` expect `packages/rag/config/retrieval.policy.json` and `packages/rag/schemas/retrieval.policy.schema.json` which are absent in this environment -> ENOENT.
   - Fix: add minimal test fixtures or adjust tests to use inline mocks for CI-local runs.

4. Test mocks incomplete for node built-ins
   - Symptom: several unit tests in `packages/rag` fail because `vi.mock('fs')` replacements did not export `mkdtempSync` (and other methods), causing test runtime errors.
   - Fix: update test mocks to use `importOriginal` pattern for partial mocks, or provide explicit exports for required `fs` methods.

Notes

- The memory package is green locally after the dependency install and the RUNBOOK.md addition. The rag package failures are broader and should be handled on a separate pass.
