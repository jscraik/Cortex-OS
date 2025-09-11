# Cortex Sec TDD Plan

This roadmap outlines micro-tasks to harden `packages/cortex-sec` under strict TDD:

1. **Red test** – write failing tests for each requirement.
2. **Green code** – implement minimal code to pass tests.
3. **Refactor** – improve design while keeping tests green.
4. **Commit** – one focused Conventional Commit per task.
5. Run `pre-commit run --files <changed files>` and `pnpm lint && pnpm test` (or `pnpm docs:lint` for docs-only).

---

## Technical Review

- `readiness.yml` shows zero coverage and all checklist items `false`.
- `check-policy.js` parses CLI thresholds with Zod but lacks tests and error classifications.
- `semgrep-parse.js` silently returns `[]` on parse errors, masking CI failures.
- Semgrep rulesets are untested against real fixtures and OWASP/ATLAS mappings.

## Strict Software Engineering Principle

Security rules are code: every rule, parser, and policy check must be test-driven, versioned, and validated before merging.

## TDD Implementation Tasks

1. **Add test harness**
   - Create Vitest setup for `cortex-sec`.
   - Failing test: `semgrep-parse` parses minimal sample output.
   - Implement parsing for success path.
2. **Robust error handling**
   - Failing test: malformed JSON throws explicit error.
   - Implement error classes and coverage.
3. **Policy threshold enforcement**
   - Failing tests for high/medium threshold breaches and missing reports.
   - Refactor script to surface exit codes and messages.
4. **Rule validation tests**
   - For each Semgrep rule, add fixtures that trigger and do not trigger the rule.
   - Map findings to OWASP/ATLAS.
5. **Coverage & readiness**
   - Configure coverage reports; update `readiness.yml` thresholds.
   - Add readiness check in CI.
6. **Documentation**
   - README with usage examples and contribution guidelines.
   - Docs lint test in CI.

---

## Verification Checklist for Each Commit

1. `pre-commit run --files <changed files>`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm docs:lint` for documentation updates
