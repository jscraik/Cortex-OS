# CODESTYLE.md

## Purpose

This document defines mandatory coding standards for the Cortex-OS monorepo.  
All contributors must follow these rules. Enforced in CI via Biome, Clippy, pytest, and Nx.

---

## 1. General Principles

- **Functional first**: Pure, composable functions are preferred.
- **Classes**: Allowed only when required by framework (e.g. React ErrorBoundary) or for unavoidable state encapsulation.
- **Functions**: ≤ 40 lines. Split if readability suffers.
- **Exports**: Named exports only. No `export default`.
- **DRY**: Shared logic lives in `src/lib/` (TS), `apps/cortex-py/lib/` (Python), `crates/common/` (Rust).

---

## 2. JavaScript / TypeScript

- **Types**: Explicit type annotations at all public API boundaries.
- **Project references**: All packages must set `composite: true` for Nx task graph.
- **Async**: Use `async/await`. Avoid `.then()` chains.
- **Style**: Enforced via `biome.json`.
- **Error handling**: Guard clauses for readability. No deep nesting.
- **MLX**: All MLX integrations must be real. No mocks or placeholders in production code.

---

## 3. React Components

- **Granularity**:
  - Containers fetch data, manage state, call mutations.
  - Children are pure, stateless, and presentational.
  - Lists separated from stateless list items.
- **Async states**: Every component handling async must handle:
  - Loading
  - Error
  - Empty
  - Success
- **Accessibility**:
  - All interactive components require ARIA roles/labels.
  - Never rely on color alone (WCAG 2.2 AA).
  - Must support full keyboard navigation.

---

## 4. Python (uv-managed)

- **Identifiers**: `snake_case` for functions/variables, `PascalCase` for classes.
- **Type hints**: Required on all public functions.
- **Packaging**: Every app has `pyproject.toml` and `uv.lock`.
- **Testing**: Use `pytest` with ≥ 95% branch coverage. Target 100% where feasible.
- **Imports**: Absolute imports only. No relative dot imports.

---

## 5. Rust (TUI/CLI only)

- **Style**: Enforced via `rustfmt` + `clippy --deny warnings`.
- **Error handling**: Use `anyhow::Result` or error enums.
- **UI**: ratatui/crossterm. Provide ASCII fallback. Never color-only indicators.
- **Modules**: < 500 LOC. Extract shared logic into crates.
- **Testing**: Unit tests in same module. Integration tests in `tests/`.

---

## 6. Naming Conventions

- **Directories & files**: `kebab-case`
- **Variables & functions**: `camelCase`
- **Types & components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Python**: `snake_case`
- **Rust**: `snake_case` for vars/fns, `PascalCase` for types

---

## 7. Commit & Release Discipline

- **Commits**: Must follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, etc.
- **Releases**: SemVer enforced.
- **Breaking changes**: Require `BREAKING CHANGE:` footer.

---

## 8. Toolchain Enforcement

- **mise**: pins Node, Bun, Python, uv, Rust versions.
- **Corepack**: enforces package manager version (pnpm or bun).
- **Lockfiles**: `pnpm-lock.yaml` or `bun.lock`. Only one allowed repo-wide.
- **CI**: All installs must use `--frozen-lockfile`.

---

## 9. Security & Compliance

- **Dependencies**: Lockfile is source of truth.
- **Secrets**: Never hard-coded. Use `.env.local` or Nx env config.
- **Scanning**: Every PR runs:
  - Semgrep rules
  - OSV vulnerability scanner
  - License compliance check
- **SBOM**: Generated at release.

---

## 10. Accessibility

- **WCAG 2.2 AA** baseline for web/UI.
- **Keyboard shortcuts** documented.
- **Screen readers** supported via semantic HTML + ARIA.
- **CLI/TUI** must support `--plain` mode for AT compatibility.

---

## Config References

- **Biome**: `.biome.json` in repo root.
- **TSConfig**: `tsconfig.base.json` with project refs.
- **Python**: `pyproject.toml` + `uv.lock`.
- **Rust**: `rustfmt.toml` + `clippy.toml`.
- **Mise**: `.mise.toml` pins tool versions.
- **CI**: `.github/workflows/ci.yml` enforces standards.

---
