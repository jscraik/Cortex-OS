# Cortex-OS GitHub Workflows Overview

_Last updated: February 2025_

## 🎯 Goals

- Provide a reliable baseline of automation that always runs successfully.
- Remove legacy/duplicated workflows that were conflicting with one another.
- Centralise core setup logic so future workflows stay consistent.

## 🧱 Building Blocks

### `quality-gates.yml`
Reusable workflow that installs dependencies with pnpm, reuses the pnpm store cache, and executes the four critical monorepo checks:

1. `pnpm lint:smart`
2. `pnpm typecheck:smart`
3. `pnpm test:smart`
4. `pnpm build:smart`

Inputs allow downstream workflows to toggle individual steps or pass custom install flags.

### `ci.yml`
Primary workflow triggered on pushes to `main` and all pull requests. It simply calls the reusable quality gates and publishes a short run summary. Concurrency is enabled to avoid duplicate runs on the same ref.

### `security.yml`
Scheduled weekly, on main pushes, and on pull requests. It brings together three previously separate automations:

- **CodeQL** for static analysis of the TypeScript/JavaScript codebase.
- **Gitleaks** secret scanning with SARIF upload so alerts appear in the Security tab.
- **`pnpm audit`** for dependency vulnerability checks.

## ➕ Adding More Automation

When a new workflow is required:

- Start from `quality-gates.yml` to avoid repeating setup code.
- Limit new triggers to the minimum necessary surface area.
- Document the addition in both this file and `README.md`.
- Keep workflows short—prefer multiple focused workflows over a monolithic pipeline.

## ♻️ Change Management

- Deleting legacy workflows is preferred to leaving them disabled in place.
- All newly added workflows should include a summary step that writes to `$GITHUB_STEP_SUMMARY`.
- Reviewers should ensure new actions are pinned to a major version (`@vX`) or commit SHA.

With the simplified layout in place, the Actions tab is easier to navigate and the automation now aligns directly with the project's most important quality and security gates.
