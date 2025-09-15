
TDD Remediation Plan
===================

Strict documentation, reproducible, easy-to-trace slices – each item has a single focus, uses “test → implementation → refactor”.
Each step foreshadows its verification steps.

1. **Restore Shared Guardrails**

- Goal: Return ESLint/Biome settings to the repo standard once code has been cleaned.
- [x] Undo temporary rule relaxations (`@typescript-eslint/no-explicit-any`, underscore naming, Biome `noExplicitAny`) after downstream tasks finish.
- [x] Tests: `pnpm lint:smart`; drive this task last, once TypeScript/Rust/legacy fixes are done.

2. **Node Tooling – Telemetry Package**

- Objective: Ensure `@cortex-os/telemetry` can run tests without “vitest not found”.
- [x] Add a deterministic Vitest installation or make the package consume the root runner.
- [x] Wire the package script/tsconfig so the test target resolves vitest.
- [x] Confirm `pnpm --filter @cortex-os/telemetry test`.

3. **Node Tooling – A2A Events Package**

- Target: Replace the “missing jest config” failure.
- [x] Introduce `vitest.config.ts` or a working Jest config via Nx.
- [x] Update `packages/a2a/a2a-events/project.json` to use the chosen runner.
- [x] Add a minimal smoke test; drive it from `nx test a2a-events`.
- [ ] Ensure the task is isolated (single commit).

4. **Node Tooling – MVP Package**

- Problem: Nx expects `packages/mvp/vitest.config.ts`.
- [ ] Create or fix the config, add a placeholder/real Vitest spec.
- [ ] Re-run `nx run mvp:test`.
- [ ] Validate the build pipeline still passes (`pnpm build:smart`).

5. **Inversify Configuration Cleanup**

- Issue: We temporarily removed `skipBaseClassChecks` in `apps/cortex-os/src/boot.ts`.
- [ ] Confirm the container still validates its bindings via TDD (add a unit test).
- [ ] If required by newer versions of Inversify, explore alternative DI validation – commit only once tests demonstrate the desired safety.

6. **Telemetry Policy Parser (`apps/cortex-os/packages/ingest`)**

- Aim: Make Biome’s `noExplicitAny` happy.
- [ ] Write tests for the parser options (when the YAML is missing, malformed, etc.).
- [ ] Refactor `dispatch.ts` to use a typed `IngestPolicy`.
- [ ] Ensure `pnpm lint:smart` no longer flags that file.

7. **A2A Retry Policy Naming**

- Goal: Remove `snake_case` warnings in `packages/a2a/a2a-events/src/github/envelope.ts`.
- [ ] Add or adjust a unit test around `calculateNextRetryDelay`.
- [ ] Rename destructured properties to camelCase once tests cover the behavior.

8. **Agents Package – Helper Cleanup**

- Focus: Eliminate `_secureId` and `unused_firstAttempts` test variables.
- [ ] Add coverage on the code paths calling `generateAgentId`/`TraceId`.
- [ ] Remove the private helper and rename/trim unused test variables.

9. **Orchestration Package – Lint Debt**

- Scope: Remove `no-explicit-any`/unused-var lint noise.
- [ ] Break down by sub-domain (bridges, CLI, tests).
- [ ] For each file, write failing tests first if behavior is uncertain, then tighten typing or rename/discard unused placeholders.

10. **Runtime Package – Lint & Type Fixes**

- [ ] Rename runtime sentinel constants (e.g., `__RUNTIME_SENTINEL__`), etc., to be naming-compliant, ensuring tests cover uses.
- [ ] Remove unused `_e` placeholders in error handlers and adjust tests.
- [ ] Validate with `pnpm lint:smart --filter runtime`.

11. **ASBR Package – Lint & Type Fixes**

- [ ] Address lint and type issues as above.

12. **GitHub Package – Rust Lint & Type Cleanups**

- [ ] Translate Rust linter warnings into actionable changes (e.g., `while` loops `is_some()`, reduce function args).
- [ ] Add unit tests around the modified Rust logic.
- [ ] Run `cargo check -- -D warnings` before/after each change.
- [ ] Run `cargo clippy -- -D warnings` before/after each change.

13. **Cross-Package any & Biome Cleanups**

- Goal: After targeted fixes above, re-enable the strict guardrails confidently.
- [ ] Re-run `pnpm lint:smart` to validate the ecosystem.
- [ ] Make sure `CODESTYLE.md` compliance is documented in commit messages.

14. **Final Validation**

- [ ] Run `pnpm build:smart`
- [ ] Run `pnpm lint:smart`
- [ ] Run `pnpm test:smart`

---
This sequencing keeps each task small, test-first, and traceable. Each item can live on its own branch/PR with a focused commit series, making it easy to review and revert if needed.
