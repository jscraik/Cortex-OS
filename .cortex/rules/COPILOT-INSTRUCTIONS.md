Developer: <!--
file_path: ".github/instructions/copilot-instructions.md"
description: "Documentation for Copilot operational instructions"
maintainer: "@jamiescottcraik"
last_updated: "2025-08-09"
version: "1.2.0"
status: "active"
-->

# Copilot Operating Instructions for Cortex OS

Begin with a concise checklist (3-7 bullets) of what you will do; keep items conceptual, not implementation-level.

## Authority Order (highest wins)

1. `RULES_OF_AI.md`
2. `AGENTS.md`
3. This file
4. `.github/instructions/*` (code review, tests, markdown, PR, quality gates)
5. MCP configs: `apps/*`, `.vscode/`, `.gemini/`

## Overview

- **Monorepo:** Managed via Turborepo and pnpm.
  - **Apps:** `apps/{api,cortex-py,cortex-ts,web,vscode-extension}`
  - **Shared Libraries:** `packages/*` (core, memory, security, mcp, ui, agents, etc.)
  - **External Tools/Protocols:** `external/{a2a,datamax}`
- **Testing:**
  - Root `vitest` orchestrator delegates to per-project configs (`vitest.config.ts`).
  - Exclude `external/` or vendor folders from tests.
  - Playwright accessibility tests run separately.
- **Cross-Component Workflow:**
  - Node/TypeScript orchestrates.
  - Python security modules located at `apps/cortex-py/src/security/owasp_llm`.
  - TypeScript ↔ Python bridge at `bridge/`.
  - MCP in `packages/mcp` and `packages/mcp-server`.

## Daily Commands (run at repo root)

- **Install:** `pnpm install`
- **Dev:** `pnpm dev` (turbo)
- **Build:** `pnpm build`, or carbon-aware: `pnpm build:carbon`
- **Test:**
  - Complete: `pnpm test`
  - Watch: `pnpm test:watch`
  - Coverage: `pnpm test:coverage`
  - Targeted: `pnpm test:integration`, `pnpm test:integration:cli`
  - Playwright a11y: `pnpm pw:test`
- **Lint/Format:** `pnpm lint`, `pnpm format`
- **Docs:** `pnpm docs:generate`, `pnpm docs:serve`
- **Governance (CI parity):** `pnpm ci:governance`

## Bun Commands (CLI, iOS, React Apps)

- **Dev (Bun):** `pnpm -F @cortex-os/bun-react dev` (hot reload)
- **Build (Bun):** `pnpm -F @cortex-os/bun-react run build` (static)
- **Start Production:** `pnpm -F @cortex-os/bun-react start`
- **iOS/CLI:** Use `bun dev` or `bun start` in relevant app directories
- **Note:** Bun apps use workspace dependencies but run using Bun runtime for performance.

## Conventions

- **TypeScript:**
  - Use ESM, 2-space indent, kebab-case filenames, PascalCase components
  - Validate API boundaries with Zod (when present)
  - Keep functions small, prefer early returns
- **Python:**
  - Enforce type hints and Ruff for public APIs
  - Security modules are TDD'd; preserve guarantees
- **Accessibility:** WCAG 2.2 AA compliance is required. For UI changes, include `jest-axe` and/or Playwright assertions.

## Allowed Actions

- Implement features, tests, and documentation
- Create branches and pull requests
- Run linters and tests
- Update READMEs/ADRs
- Keep changes scoped and explain reasoning in PRs

## Prohibited Actions

- Editing `.github/workflows/**` or `.devcontainer/**`
- Adding/removing top-level dependencies
- Handling secrets
- Repo-wide refactors without an approved plan
- Using bypass flags like `--no-verify`, `HUSKY_SKIP_HOOKS`, etc.

## Patterns to Reference

- **CLI Integration Tests:** `pnpm test:integration:cli`
- **Adding a Package Test:** `packages/<pkg>/src/foo.test.ts`, with local `vitest.config.ts` if needed
- **A11y Validation:** update `tests/a11y.ci.spec.ts`; run `pnpm pw:test`

## Before Opening a PR

1. Run: `pnpm format && pnpm lint && pnpm test`
2. Update documentation for any behavior change (`docs/`, `README.md`)
3. Add a brief test plan plus screenshots/logs for UX/CLI

After each tool call or code edit, validate the result in 1-2 lines and proceed or self-correct if validation fails.