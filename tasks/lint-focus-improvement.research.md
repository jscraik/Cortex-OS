# lint-focus-improvement Research

## Goal

Limit `pnpm <target>:smart --focus <project>` runs so that Nx executes only the
explicitly focused project and avoids cascading lint failures from unrelated
packages.

## Current Behavior

- `scripts/nx-smart.mjs` computes `focusList` and forwards `--projects=<focus>`
  to `nx affected` or `nx run-many`.
- For lint targets that rely on `nx:run-commands`, Nx forwards extra CLI flags
  (such as `--projects`) to the underlying command (eslint, biome, etc.),
  producing `Invalid option '--projects'` failures.
- When the flag is accepted, `nx affected` still expands to the entire affected
  set, so focusing on `@cortex-os/local-memory` triggers roughly fifty lint
  targets.

## Constraints & Considerations

- Preserve doc-only skip, dry-run, telemetry, and metrics behavior.
- Honor CODESTYLE.md requirements: named exports, ≤40 lines per function, and
  exclusive async/await usage.
- Keep CI defaults untouched, including disabling the Nx daemon by default.
- Prefer opt-in behavior so standard affected runs remain unchanged for other
  workflows.

## Potential Approaches

1. **Strict focus mode**: When `--focus` is present, bypass `nx affected` and
  run `nx run <project>:<target>` sequentially so only the requested projects
  execute and no extra CLI flags leak.
2. **Per-target allowlist**: Emit `--projects` only for targets backed by native
  Nx executors that absorb the flag; fall back to strict mode otherwise to
  protect lint commands.
3. **Post-filter**: Let `nx affected` run but intercept non-focus tasks. This is
  riskier because it depends on internal scheduler hooks.

## Open Questions

- Should strict focus be opt-in (e.g., `--strict-focus`) or automatic whenever a
  focus list exists?
- Is sequential execution acceptable, or should we synthesize a filtered
  `nx run-many` call without forwarding `--projects`?

## Next Steps

- Draft a TDD plan around strict focus semantics.
- Update the wrapper implementation and add regression coverage (integration
  script or smoke test).
