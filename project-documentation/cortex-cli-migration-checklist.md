# cortex-cli Deprecation and Migration to cortex-code

Status: In Progress → Near Complete
Owner: Platform Eng
Last updated: 2025-09-15 (sweep + removal completed)

## Objectives

- Remove `apps/cortex-cli` from the monorepo safely.
- Port all necessary commands/behaviors to `apps/cortex-code` (or confirm redundant and delete).
- Keep history linear with bite-sized, TDD-driven commits and clear fallbacks.
- Achieve green on smart Nx targets and CI after removal.

## Scope

In scope:

- Source code, tests, docs, scripts, CI references to `cortex-cli`.
- Developer experience parity where `cortex-cli` provided unique workflows.

Out of scope:

- New features; strictly migration + cleanup.

## Guiding Principles

- TDD always: write failing tests that capture behavior to keep, then migrate, then delete.
- Single-focus Conventional Commits per step (tests + implementation together).
- Prefer affected-only execution: `pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart`.
- Use Agent Toolkit for search/codemods/verification (`just scout`, `just codemod`, `just verify`) when available.

---

## High-Level Checklist

- [x] Inventory all references to `cortex-cli`
  - [x] Code imports and programmatic usage
  - [x] Workspace configs (pnpm, Nx project.json, tsconfig paths)
  - [x] Scripts (`package.json` scripts, repo scripts), CI pipelines
  - [x] Documentation, READMEs, examples, tutorials
- [x] Feature parity assessment
  - [x] Enumerate `cortex-cli` commands and flags
  - [x] Map each command to existing or new `cortex-code` functionality
  - [x] Identify deprecated/unused commands (to delete)
- [x] Tests first (capture behavior to preserve)
  - [x] Create/port tests into `apps/cortex-code` covering mapped commands
  - [x] Ensure fixtures, snapshots, and golden outputs are re-homed
- [x] Implementation in `cortex-code`
  - [x] Add command shims or native implementations (MCP/A2A/RAG/Simlab/CTL/Eval/Agent)
  - [x] Wire telemetry/observability consistent with `cortex-code`
  - [x] Update help text and version banners (minimal for stubs)
- [x] Replace references
  - [x] Update scripts, docs, CI to call `cortex-code` instead of `cortex-cli` (PM2 configs, docs, website sidebar)
  - [x] Update any path-based references (binary names, import paths)
- [x] Delete `apps/cortex-cli`
  - [x] Remove from workspace (vitest workspace, Nx named inputs added for nx-smart)
  - [x] Remove app-specific configs (workspace entry)
- [ ] Validation gates
  - [ ] `pnpm build:smart` passes (affected projects only) — dry-run validated; run locally to confirm
  - [ ] `pnpm test:smart` fully green — dry-run validated; run locally to confirm
  - [ ] `pnpm lint:smart` clean — dry-run validated; run locally to confirm
  - [x] Docs lint: markdownlint added in CI, major issues reduced; remaining editorial fixes tracked
- [ ] Release & comms
  - [ ] Release notes: breaking changes and migration notes
  - [ ] Update READMEs and tutorials to reflect `cortex-code`

---

## Detailed TDD Task Plan (Bite-Size Commits)

1) chore(inventory): enumerate cortex-cli usage — COMPLETED
- Tests: none (documentation-only task)
- Actions:
  - Use Agent Toolkit search to locate: `just scout "cortex-cli|apps/cortex-cli|cortex code mcp|cortex mcp" .`
  - Produce a short `inventory.md` in this folder with references.
  - Output: `project-documentation/cortex-cli-inventory.md` (kept up to date during migration)

2) test(code): port CLI behavior tests to cortex-code — COMPLETED
- Tests: add failing tests in `apps/cortex-code` that codify behaviors to keep (e.g., mcp list/add/remove/get/show, a2a doctor/send).
- Actions: copy/translate existing CLI tests or write new unit/integration tests with minimal fixtures.
 - Output: initial failing tests for `codex a2a doctor` and `codex mcp list`.

3) feat(code): implement command shims in cortex-code — COMPLETED
- Tests: make step (2) pass with minimal implementations.
- Actions: add subcommands to `cortex-code` (or route to existing modules) to satisfy tests.

4) refactor(docs): update references from cortex-cli to cortex-code — COMPLETED (deprecation notes + substitutions)
- Tests: docs lint (`pnpm docs:lint`).
- Actions: replace CLI command examples in docs, README, tutorials.

5) chore(ci): switch pipelines to cortex-code — PARTIAL (PM2 configs updated; Nx smart wrapper; docs-lint workflow added)
- Tests: pipeline dry-run or local script validation.
- Actions: update CI workflows, scripts, and any automation invoking cortex-cli.

6) chore(workspace): remove cortex-cli from workspace configs — COMPLETED (vitest workspace updated; nx.json added for nx-smart)
- Tests: `pnpm build:smart` and `pnpm test:smart` remain green; ensure affected-only targets run.
- Actions: remove `apps/cortex-cli` entries from pnpm workspaces, Nx `project.json`, `tsconfig.*` path maps.

7) perf/cleanup: delete apps/cortex-cli directory — COMPLETED
- Tests: rerun smart targets.
- Actions: remove directory and any lingering references.

9) chore(ci): update Vitest workspace and PM2 configs — COMPLETED
- Tests: run TS test suites to ensure no breakage.
- Actions: replace or remove `apps/cortex-cli` entries in `config/vitest.workspace.ts` and migrate orchestrator paths in PM2 ecosystem configs to cortex-code equivalents.

8) docs(release): migration notes and changelog — TODO
- Tests: docs lint.
- Actions: add a release note describing deprecation and functional mapping in `project-documentation/legacy/`.

---

## Acceptance Criteria

- No references to `apps/cortex-cli` remain in code, scripts, or CI.
- All previously used CLI workflows have equivalents in `cortex-code`.
- All smart Nx targets pass on affected projects after removal.
- Documentation and examples reference `cortex-code` only.

## Rollback Plan

- Keep a branch `feat/remove-cortex-cli` until completion.
- If failures arise post-deletion, revert the removal commit while keeping earlier refactors/tests.

## Notes

- Align with AGENTS.md: strict TDD, Conventional Commits, and Local Memory privacy rules.
- Prefer Agent Toolkit for searches and codemods.
