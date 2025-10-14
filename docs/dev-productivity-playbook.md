# Cortex-OS Developer Productivity Playbook

This playbook documents the fastest feedback loop for day-to-day development in Cortex-OS. It aligns with the quality and automation expectations captured in CODESTYLE §§10–11.

## Canonical Smart Loop

1. **Compile incrementally with `pnpm build:smart`.** This target scopes builds to the packages affected by your working tree, allowing you to surface type and bundling issues quickly without paying for a full repo rebuild.
2. **Exercise targeted tests with `pnpm test:smart`.** Run this immediately after the smart build to execute only the suites touched by your changes. Pair the command with watch mode when iterating on a feature to keep the red/green signal tight.
3. **Finish each iteration with the Just recipes.** Use `just scout "<pattern>" <path>` for deterministic search, `just codemod 'find(:[x])' 'replace(:[x])' <path>` for structured edits, and `just verify changed.txt` before staging. These recipes are the required entry points for the agent-toolkit and keep local validation aligned with CI.

## TDD Coach Integration

- Install and run the **TDD Coach** package to enforce the red/green/refactor cadence described in CODESTYLE §10. Keep the coach in watch mode during active development so it can block regressions before they reach source control.
- Treat TDD Coach signals as blockers: fix failing guidance before committing. The package feeds into pre-commit validation and is wired into CI (§10), so local compliance prevents churn later.
- When automation is required, invoke the agent-toolkit APIs through the documented Just recipes (§11) so that the TDD Coach has complete context for mutations, coverage deltas, and pending refactors.

## Daily Readiness Checklist

- Smart build completed (no errors)
- Smart tests green (with new/updated specs first)
- Just verification run and diffs reviewed
- TDD Coach checklist cleared (no outstanding red steps)
- Notes captured for any deviations that require a follow-up spec or waiver

Following this loop keeps local productivity aligned with the CI quality gates and ensures the team maintains the required TDD discipline.
