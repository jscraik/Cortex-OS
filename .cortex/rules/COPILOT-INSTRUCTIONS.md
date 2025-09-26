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

## 🔄 Agentic Coding Workflow for Copilot

All GitHub Copilot sessions working on brAInwav Cortex-OS must follow this structured 4-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `mcp-tool-validation` or `ui-component-accessibility`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** following Copilot-specific principles:
  - **Reuse monorepo patterns** - leverage Turborepo and pnpm workspace structure
  - **Follow package boundaries** - respect TypeScript/Python/Rust separation
  - **Implement incrementally** - small, focused changes with immediate feedback
  - **Test-first approach** - write failing tests before implementation
  - **brAInwav integration** - include branding in outputs and error messages
- **Write comprehensive plan** to `[feature]-tdd-plan.md`

### 3. Implementation

- **Execute the TDD plan** with Copilot assistance for rapid iteration
- **Follow monorepo commands** as specified in daily commands section
- **Maintain quality gates** - run `pnpm lint && pnpm test` frequently
- **Implementation must be 100% deployable** unless explicitly noted

### 4. Verification

- **Run comprehensive validation**: `pnpm format && pnpm lint && pnpm test`
- **Check governance compliance**: `pnpm ci:governance`
- **Validate accessibility** where applicable (Playwright a11y tests)
- **Update documentation** for any behavior changes
- **Update task status** to **"verified"** once complete

## Authority Order (highest wins)

1. `RULES_OF_AI.md`
2. `AGENTS.md`
3. This file
4. `.github/instructions/*` (code review, tests, markdown, PR, quality gates)
5. MCP configs: `apps/*`, `.vscode/`, `.gemini/`

## Time Freshness Rules

See `.cortex/rules/_time-freshness.md` for timezone and date handling rules that all agents must follow.

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
