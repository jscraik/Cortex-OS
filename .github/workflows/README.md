# Workflow Inventory

This repository now uses a **lean, fully working** GitHub Actions setup. The goal is to keep only the workflows that provide clear value and are easy to maintain.

## Active Workflows

| Workflow | Purpose |
| --- | --- |
| [`ci.yml`](./ci.yml) | Runs the reusable quality gates (lint, typecheck, tests, build) on pushes to `main` and every pull request. |
| [`quality-gates.yml`](./quality-gates.yml) | Reusable workflow that encapsulates pnpm installation, caching, and the core monorepo quality checks. |
| [`security.yml`](./security.yml) | Consolidated security automation covering CodeQL analysis, Gitleaks secret scanning, and `pnpm audit` dependency checks. |

## Shared Patterns

All workflows rely on the same core steps:

1. Checkout with full history (required for nx smart targets and CodeQL tracing).
2. Install Node.js 22 and pnpm 10.18 to match the repository toolchain.
3. Reuse the pnpm store cache to avoid redundant installs.
4. Run targeted scripts defined in `package.json` (`lint:smart`, `typecheck:smart`, `test:smart`, `build:smart`).

## Adding New Workflows

When additional automation is required:

- Prefer consuming [`quality-gates.yml`](./quality-gates.yml) from new workflows instead of reimplementing setup logic.
- Keep triggers explicit and minimal to avoid duplicate runs.
- Pin every third-party action to a major version or commit SHA.
- Document the workflow intent in this file to maintain a single source of truth.

## Retired Workflows

All previously duplicated or broken workflows have been removed. Historical runs remain available in the Actions tab for auditing, but the YAML definitions are no longer present in the repository.
