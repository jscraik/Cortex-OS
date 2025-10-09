# CODESTYLE.md

## Purpose

This document defines **mandatory coding standards** for the Cortex‑OS monorepo.  
All contributors and automation agents must follow these rules. CI enforces them via Nx targets and checks (Biome, ESLint, Ruff, Pyright, Clippy, pytest, mutation testing, Semgrep, supply‑chain scanners).

---

## 0. brAInwav Production Standards (Hard Prohibitions)

**ABSOLUTE PROHIBITION** — It is a policy violation to ship or describe anything as “production‑ready”, “complete”, “operational”, or “fully implemented” if any of the following exist anywhere in a production code path:

- `Math.random()` (or equivalent) used to fabricate data
- Hard‑coded mock responses (e.g., “Mock adapter response”)
- `TODO`/`FIXME`/`HACK` comments in production paths
- Placeholder stubs (e.g., “will be wired later”)
- Disabled features signaling gaps (e.g., `console.warn("not implemented")`)
- Fake metrics or synthetic telemetry presented as real

**Branding & truthfulness**

- All system outputs, **error messages**, and **logs** must include **brAInwav** branding.
- Status claims in UIs, logs, or docs must be **evidence‑backed by code** and passing checks.
- The file `.cortex/rules/RULES_OF_AI.md` is normative; this document complements it.

**Detection**

- Pattern guards, AST‑Grep, Semgrep, and CI checks fail on violations.
- Any new exception requires an ADR and a temporary, time‑boxed allowlist entry.

---

## 1. General Principles

- **Functional‑first**: Prefer pure, composable functions. Minimize hidden state and side effects.
- **Classes**: Only when required by a framework (e.g., React ErrorBoundary) or to encapsulate unavoidable state.
- **Functions**: ≤ 40 lines; split if readability suffers. Prefer guard clauses over deep nesting.
- **Exports**: Named exports only. No `export default`.
- **ESM everywhere**: JS/TS packages use `"type": "module"`. Avoid CJS.
- **Determinism**: No ambient randomness/time in core logic; inject seeds/clocks.
- **DRY**: Shared logic lives in:
  - `src/lib/` (TypeScript)
  - `apps/cortex-py/lib/` (Python)
  - `crates/common/` (Rust)

---

## 2. Monorepo Task Orchestration (Nx “Smart” Mode)

- Use **smart wrappers** instead of blanket `nx run-many`:
  - `pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart`, `pnpm typecheck:smart`
  - Dry‑run: `--dry-run` prints affected summary and exits.
- **Non‑interactive by default**: `NX_INTERACTIVE=false` (and `CI=true` if unset). Do not forward `--no-interactive` to child tools.
- Affected detection via `NX_BASE`/`NX_HEAD` or previous commit fallback. If diff cannot be resolved, wrappers explicitly warn and fall back to full run.
- Emit consistent diagnostics lines:  
  `[nx-smart] target=<t> base=<sha> head=<sha> changed=<n> strategy=affected|all`.

---

## 3. JavaScript / TypeScript

**Type discipline**

- Explicit types at **all public API boundaries** (functions, modules, React props).
- `strict: true` with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Prefer `unknown` over `any`. Use `satisfies` for object literal constraint checking.

**Async & cancellation**

- Prefer `async/await`. Avoid deep `.then()` chains.
- Support **cancellation** via `AbortSignal` for all I/O and long‑running operations.

**Errors**

- Guard‑clause style; propagate context‑rich errors (include operation, inputs, correlation id).
- Never swallow errors; route to the logging layer (see §12).

**Style & linting**

- **Biome** is the **formatter** and provides base linting (`.biome.json` at repo root).
- **ESLint** remains for **policy/architecture/security** rules (imports/boundaries, sonarjs, etc.).
- Prettier is **not** used. Do not add Prettier configs.

**Testing**

- Co‑located tests in `__tests__` or `*.test.ts`.
- Snapshots only for intentionally stable serialized outputs (avoid DOM tree snapshots).

**Security**

- No `eval`/dynamic Function. No unpinned remote code. Validate/sanitize all external inputs.

**MLX rule**

- All MLX integrations must be real; no mocks/placeholders in production code.

---

## 4. React / Next.js

- **Component roles**
  - Containers: fetch, state, mutations.
  - Presentational children: pure and stateless.
  - List containers separate from stateless items; use keys and virtualize when needed.

- **React Server Components (RSC)**
  - Default to **Server Components**. Mark client code with `"use client"`.
  - Use `use server` for server actions. Keep client components thin.

- **Async UI states**
  - Use **Suspense** and **Error Boundaries**. Every async surface must render: Loading, Error (with retry), Empty, Success.

- **Accessibility**
  - WCAG **2.2 AA** baseline.
  - Proper roles/labels for all interactive elements.
  - Full keyboard navigation and visible focus. Never rely on color alone.

---

## 5. Python (uv‑managed)

- **Identifiers**: `snake_case` (funcs/vars), `PascalCase` (classes).
- **Types**: Required on all public functions. Enforce with **Pyright** (`strict`).
- **Lint/format**: **Ruff** (`ruff check --fix` + `ruff format`) is mandatory.
- **Packaging**: Each app has `pyproject.toml` and `uv.lock`. Use `uv` for sync/run.
- **Imports**: Absolute imports only.
- **Testing**: `pytest` suite participates in repo quality gates (see §10). Aim for high branch coverage per package; release‑readiness gates may require ≥95%.

---

## 6. Rust (TUI/CLI only)

- **Edition**: Pin to **Rust 2024** unless a crate requires otherwise (document via ADR).
- **Style & lints**: `rustfmt` + `cargo clippy -- -D warnings` (CI fails on warnings).
- **Errors**: CLI binaries use `anyhow::Result`; libraries expose structured enums (e.g., `thiserror`).
- **UI**: `ratatui`/`crossterm`. Provide ASCII fallback; never color‑only indicators.
- **Modules**: < 500 LOC; extract shared logic into crates.
- **Testing**: Unit tests alongside modules; integration tests under `tests/`.

---

## 7. Naming Conventions

- **Directories & files**: `kebab-case`
- **Variables & functions**: `camelCase` (JS/TS), `snake_case` (Python/Rust)
- **Types & components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`

---

## 8. Commit, Releases, ADRs

- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, etc.).
- **Signing**: All commits/tags are signed (GPG/SSH or Sigstore **Gitsign** in CI).
- **Releases**: SemVer; changelogs generated (Changesets/Nx release).
- **ADRs**: Required for significant decisions; store under `docs/adr/` (MADR template).

---

## 9. Toolchain & Lockfiles

- **Mise** (`.mise.toml`) pins Node, Python, uv, Rust, and other tool versions.
- **Package manager**: **pnpm** (single repo‑wide choice).
- **Corepack** manages pnpm version; do not rely on Corepack for Bun (Bun is not used here).
- **Lockfiles**: Only **`pnpm-lock.yaml`** exists in the repo.
- **Frozen installs**
  - Node: `pnpm install --frozen-lockfile`
  - Python: `uv sync --frozen`
  - Rust: `cargo build --locked`

---

## 10. Quality Gates: Coverage, Mutation, TDD

**PR Merge Gate (must pass)**

- Branch coverage ≥ **65%** (`BRANCH_MIN` env override)
- Mutation score ≥ **75%** (`MUTATION_MIN` env override)

**Aspirational baselines (Vitest config)**

- Statements 90% • Branches 90% • Functions 90% • Lines 95%

**Readiness workflows**

- Package‑level release readiness may enforce **≥95%** coverage (per workflow policy).

**Mutation testing**

- Use **Stryker** for JS/TS. Enforce `MUTATION_MIN` in CI; produce badges/metrics.

**TDD enforcement**

- Use the **TDD Coach** package:
  - Dev watch for feedback
  - Pre‑commit validation for staged files
  - CI status check blocks non‑compliant PRs

---

## 11. Automation & Agent‑Toolkit (MANDATORY for agents)

- Agents and automation **must** use `packages/agent-toolkit` for:
  - Code search (`multiSearch`) instead of raw `grep/rg`
  - Structural refactors/codemods
  - Cross‑language validation and pre‑commit checks
- Shell “Just” recipes are canonical entry points:
  - `just scout "<pattern>" <path>`
  - `just codemod 'find(:[x])' 'replace(:[x])' <path>`
  - `just verify changed.txt`
- Architecture: contract‑first (Zod), event‑driven, MCP compatible, layered design.

---

## 12. Security, Supply Chain & Compliance

- **Dependencies**: Lockfile is the source of truth; no ad‑hoc CI upgrades.
- **Secrets**: Never hard‑code. Use env injection/secret manager. Prevent client bundle leaks.
- **Scanning per PR**
  - Vulnerabilities: OSV‑Scanner, `pnpm audit`, `pip-audit`, `cargo audit`
  - Licenses: ScanCode/ORT (SPDX allowlist)
  - Static analysis: **Semgrep** (OWASP + LLM + project rules)
  - Structural policies: AST‑Grep + pattern guard
- **SBOMs**: Generate **CycloneDX** per artifact (containers, packages) at release.
- **Provenance & signing**
  - Produce **SLSA 1.0** provenance (in‑toto attestations) for build artifacts.
  - Sign/verify with **Sigstore Cosign**; enforce admission policy where applicable.
  - Commits/tags signed (see §8).
- **Containers**
  - Minimal, pinned base images (distroless where possible), non‑root, read‑only FS, drop caps.

---

## 13. AI/ML Engineering

- **Transparency**
  - Ship a **Model Card** and **Eval report** with each model.
  - Datasets require **Datasheets for Datasets** (lineage, consent, restrictions).

- **Reproducibility**
  - Fixed seeds, hashed datasets, versioned configs, recorded training/inference params.

- **Evaluations**
  - Maintain an eval harness: task metrics, safety/abuse tests, bias probes. Regressions block merges.

- **Privacy**
  - No PII ingestion without legal basis/DPA. Apply minimization and irreversible de‑identification where possible.

- **Safety & governance**
  - Align with **EU AI Act** timelines (e.g., GPAI/foundation‑model obligations) and maintain NIST AI RMF / ISO/IEC 23894 risk registers.

---

## 14. Accessibility

- **Baseline**: WCAG **2.2 AA**.
- **Keyboard**: Full operation via keyboard; document shortcuts.
- **Screen readers**: Semantic HTML first; ARIA only where necessary.
- **CLI/TUI**: `--plain`/`--no-color` modes for AT compatibility.

---

## 15. Observability, Logging & Streaming

- **OpenTelemetry**: Instrument services/CLIs to emit OTLP traces, logs, and metrics. Correlate request IDs end‑to‑end.
- **brAInwav logging**
  - Structured logs must include a `brand: "brAInwav"` field; unstructured logs must prefix messages with `[brAInwav]`.
  - Log levels: `error`, `warn`, `info`, `debug`, `trace` only.
- **Performance budgets**: Define bundle/time/memory budgets per app. Fail CI if exceeded.
- **Streaming modes (CLI)**
  - Default: token delta streaming to stdout.
  - `--aggregate` for aggregated final output.
  - Force token streaming: `--no-aggregate`.
  - JSON event streaming: `--json` or `--stream-json` (`delta`, `item`, `completed` events).
  - Precedence: **CLI flag > env (`CORTEX_STREAM_MODE`) > config > internal default**.

---

## 16. Resource Management & Memory Discipline

- Respect active mitigations until baseline is declared stable:
  - pnpm: `childConcurrency: 2`, engine pinning, `engineStrict: true`
  - Nx: serialized heavy tasks (`parallel: 1`, `maxParallel: 1`)
  - `.nxignore` reduces watcher churn
- Use `scripts/sample-memory.mjs` to record RSS/heap during heavy ops.
- Before increasing parallelism, run comparative sampler sessions (before/after) and attach results to the PR.

---

## 17. Repository Scripts & Reports

- **Codemap snapshots**
  - `pnpm codemap` runs `scripts/codemap.py` and emits `out/codemap.json` + `out/codemap.md` with **brAInwav‑branded** output.
  - Optional tools (`lizard`, `madge`, `depcheck`) annotate results under `analysis` without failing if missing.
  - Scopes: `repo`, `package:<name>`, `app:<name>`, `path:<relative>`.

- **Badges & metrics**
  - Coverage and mutation badges are static SVGs under `reports/badges/`.
  - Inline sparkline is injected between `BRANCH_TREND_INLINE_START/END` markers via `pnpm sparkline:inline`.
  - `reports/badges/metrics.json` carries composite metrics for GitHub Pages or API use.

---

## 18. MCP & External Tools

- MCP adapters and developer helpers must not hard‑code user‑specific paths.
- Use `tools/mcp/wrap_local_memory.sh` and `tools/mcp/check_mcp_paths.sh` for local reproducibility.
- Expose MCP endpoints via the documented ports/tunnels; health checks must be scriptable.

---

## 19. Config References (Authoritative)

- **Biome**: `.biome.json` (root; packages may extend)
- **ESLint**: `.eslintrc.*` for policy/security/import‑boundaries rules
- **TSConfig**: `tsconfig.base.json` (project references enabled)
- **Python**: `pyproject.toml` + `uv.lock` (Ruff/Pyright config)
- **Rust**: `rustfmt.toml` + Clippy in CI
- **Mise**: `.mise.toml` pins tool versions
- **CI**: `.github/workflows/*.yml` enforce gates (quality, security, supply chain, badges)
- **ADRs**: `docs/adr/` (MADR template)
- **brAInwav Rules**: `.cortex/rules/RULES_OF_AI.md` (primary production standards)

---
