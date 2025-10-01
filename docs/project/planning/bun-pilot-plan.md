# Bun Pilot Plan

1. Create branch `feature/bun-pilot`.
2. Replace `"packageManager": "bun@1.2.2"` in `package.json`. Commit `bun.lock` only.
3. Run CI A/B for 5–10 PRs. Track: install time, flaky tests, plugin compatibility, developer feedback.
4. Switch default only if:
   - ≥10% total CI wall-clock reduction,
   - zero regressions in Nx executors/generators,
   - editors stable (VS Code, IntelliJ).
5. If switching, update structure-guard to require `bun.lock` and forbid `pnpm-lock.yaml`.
