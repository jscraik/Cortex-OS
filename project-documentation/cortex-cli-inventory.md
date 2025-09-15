# cortex-cli Inventory (for Migration to cortex-code)

Status: Draft
Last updated: 2025-09-15

## Summary

This document inventories all known references to `cortex-cli` and `apps/cortex-cli` to support a safe, TDD-driven migration of functionality into `apps/cortex-code` (Rust CLI: `codex`).

## Key Reference Types

- Code: direct imports/usage of cortex-cli modules
- Build/Workspace: pnpm, Nx, tsconfig, vitest configs
- CI/Scripts: ecosystem configs, packaging scripts
- Docs/Website: README, docs, website pages
- Tests: E2E/integration tests invoking cortex-cli

## Notable Hits (initial scan)

- bin/README.md:93 — mentions `pnpm build:cortex-cli`
- bin/README.md:96 — `cp apps/cortex-cli/dist/cortex bin/`
- README.md:386 — lists `cortex-cli` in Applications table
- biome.json:16,33,80 — excludes `apps/cortex-cli/**`
- ecosystem.config.cjs:6 — args reference to `apps/cortex-cli/scripts/mlx-orchestrator.cjs`
- vitest.workspace.ts:5 — includes `apps/cortex-cli`
- config/cortex-config.json:99 — service_name `cortex-cli`
- config/settings.json:409 — key `cortex-cli`
- simple-tests/eval-gate.smoke.test.ts:6 — imports from `../apps/cortex-cli/...`
- simple-tests/rag-eval.cli.smoke.test.ts:7 — imports from `../apps/cortex-cli/...`
- docs/PACKAGING.md:13 — targets include `apps/cortex-cli`
- tests/security/mcp/add.e2e.test.ts:6 — `const bin = 'apps/cortex-cli/dist/index.js'`
- docs/* multiple — references to mcp command files under `apps/cortex-cli/src/commands/*`
- website/docs/apps/cortex-cli/index.md — dedicated page; notes migration to cortex-code

## cortex-cli Commands (to assess for parity)

- mcp: add, bridge, doctor, get, list, remove, search, show
- a2a: doctor, send, list
- rag: eval, ingest, query
- simlab: run, bench, report, list
- ctl: check
- eval: gate
- agent: create

## Next Actions

- Confirm which commands are required in `cortex-code` (Rust) vs deprecated.
- Write failing tests in `apps/cortex-code` for initial parity set:
  - `codex a2a doctor` — returns JSON health { ok: true }
  - `codex mcp list` — returns JSON array (initially empty) and exit 0
- Map remaining commands to `codex` subcommands or separate tools.

## Notes

- Keep history linear; each migration slice: tests → minimal impl → refactor.
- Update docs and CI alongside code changes to avoid drift.

