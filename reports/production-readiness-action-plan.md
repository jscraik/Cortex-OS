# Production Readiness Action Plan (TDD-first)

This plan drives each package to 95-100% across Testing, Reliability, Security, Architecture, Docs, and Accessibility using strict TDD and engineering principles.

## Quality gates (global, enforced)

- Test coverage: statements/branch/functions/lines >= 95% per package; target 100% where feasible
- Lint/typecheck: zero errors; warnings fail CI for changed files
- Static analysis: ESLint, Knip, TS config strict; Python: ruff/mypy
- Security: `pnpm audit` (or `npm audit --omit=dev` parity) clean; `semgrep` and secret scan zero findings; SBOM present
- Commit hygiene: conventional commits; commitlint + semantic-release dry run in CI
- Docs: README per package includes quickstart, API surface, config, examples
- a11y: Playwright a11y checks for web surfaces; axe minimum WCAG AA on critical paths
- Build reproducibility: lockfiles up to date; pinned Docker images where used

## TDD workflow (applies to every change)

1. Write failing unit tests (Vitest/Jest in TS; PyTest in Python) for the behavior
2. Implement the minimal code to pass tests
3. Refactor with characterization tests for legacy paths
4. Add integration tests using contracts in `libs/typescript/contracts` and A2A events
5. Ensure mocks/stubs follow DI boundaries (no cross-feature imports; use broker interfaces)
6. Update package README and examples

## Packages and priority focus

Prioritize lowest scoring packages first while unblocking critical path runtimes: `mvp`, `mvp-server`, `prp-runner`, `simlab-mono`, `memories`, `asbr`.

For each package, apply the checklist below and raise scores to 95%+.

### Per-package TDD checklist template

- Tests
  - [ ] Unit tests cover all public functions/classes
  - [ ] Contract tests for A2A messages (publish/subscribe) with zod schemas
  - [ ] Integration tests for DI wiring in ASBR runtime (where applicable)
  - [ ] Error paths and edge cases (timeouts, retries, invalid input)
  - [ ] Coverage >= 95% statements/branches/functions/lines
- Reliability
  - [ ] Idempotency/retry policies defined (exponential backoff)
  - [ ] Deterministic seeds for non-deterministic logic
  - [ ] Resource caps: timeouts, memory, concurrency
  - [ ] Logging with correlation IDs
- Security
  - [ ] Input validation with Zod; output typed
  - [ ] No secrets in repo; dotenv schema validation
  - [ ] Least privilege for tool integrations (MCP)
  - [ ] Semgrep and dependency audit clean
- Architecture
  - [ ] ESM only, boundary-safe imports
  - [ ] Interfaces in `libs/typescript/contracts`; utils from `libs/typescript/utils`
  - [ ] No cross-feature imports; use A2A or service interfaces via DI
- Documentation
  - [ ] README with quickstart, API, config, examples
  - [ ] CHANGELOG updated by semantic-release
- Accessibility (web UIs only)
  - [ ] Playwright a11y tests for critical flows
  - [ ] Axe rule violations addressed or waived with rationale

## Concrete tasks by domain

1. Testing and coverage
   - Create per-package `vitest.config.ts` inheriting from workspace; add `test:pkg` targets
   - Add boundary tests for A2A broker publish/subscribe using fake broker
   - Contract enforcements with zod: schema.parse in tests on emitted events
   - Add Playwright tests in `apps/cortex-web` for a11y

2. Reliability
   - Introduce `p-retry` wrappers and circuit breakers for external calls (MCP manager)
   - Add timeouts with `AbortController` and test cancellations

3. Security
   - Add `semgrep` ruleset and CI step; fix findings
   - Validate env via `zod` schema per package; fail fast tests for missing vars
   - Generate SBOM with `pnpm sbom` or `cyclonedx-npm` and store in `sbom/`

4. Architecture
   - Move contracts to `libs/typescript/contracts` when found local
   - Replace direct imports with A2A messages or DI service interfaces

5. Docs
   - Add `README.md` skeletons where missing
   - Wire `docs/LAUNCH.md` and package quickstarts

## Success criteria

- All targeted packages at or above 95% coverage and passing gates
- CI shows zero high/critical vulnerabilities, zero secret leaks, and green a11y checks
- Unified launch doc verified end-to-end locally

## Implementation cadence

- Week 1: mvp, mvp-server, prp-runner
- Week 2: asbr, memories, simlab-mono
- Week 3: a2a, mcp-bridge, registry
- Week 4: long-tail packages and polish

---

Refer to `docs/LAUNCH.md` for runbooks and how to execute coverage and checks.
