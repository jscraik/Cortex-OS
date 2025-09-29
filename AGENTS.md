# Repository Guidelines

## 🏛️ GOVERNANCE: brAInwav Project Structure Standards

**CRITICAL**: This repository follows strict governance standards enforced by brAInwav development practices. Only approved files belong at the repository root level to maintain architectural clarity and professional standards.

### Root-Level File Governance

- **Authoritative Documentation**: Comprehensive agent instruction files (AGENTS.md, CLAUDE.md, QWEN.md, GEMINI.md) at root
- **Core Standards**: Foundation documents like CODESTYLE.md, README.md, CHANGELOG.md belong at root
- **Structure Guard**: Automated validation of root entries against governance `allowedRootEntries` list
- **brAInwav Branding**: All root-level documentation must include brAInwav company context and branding

**Agent Compliance**: When creating, moving, or suggesting file placement, verify compliance with governance standards. Specialized configurations belong in subdirectories (`.cortex/rules/`, `config/`, `infra/`).

---

## Project Structure & Module Organization

- Apps live in `apps/`, libraries in `packages/`, service adapters in `services/`, and infrastructure in `infra/` and `config/`.
- Docs and ADRs stay in `docs/` and `project-documentation/`; active research and TDD artifacts belong in `tasks/` with semantic slugs until archived.
- `packages/agent-toolkit/` supplies the mandatory search, codemod, and validation utilities for agents and scripts.

## Build, Test, and Development Commands

- `pnpm install` prepares tooling; run pipelines via Smart Nx wrappers.
- `pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart`, and `pnpm typecheck:smart` execute affected targets (`--dry-run` previews). Use `pnpm dev` per app README for local work.
- `just scout "pattern" path` performs repo-aware search and `just verify changed.txt` runs targeted checks before committing.

## Coding Style & Naming Conventions

- `CODESTYLE.md` rules apply: functions ≤40 lines, named exports only, promises handled with `async/await`, guard clauses over deep nesting.
- Biome formatting enforces tab indentation, 100-character lines, single quotes, and semicolons; naming uses `kebab-case` directories, `camelCase` identifiers, `PascalCase` types, `UPPER_SNAKE_CASE` constants, and Python `snake_case`.
- Production code must exclude placeholder logic (`Math.random()` data, mock responses, TODO stubs) and surface brAInwav-branded logs or errors.

## Testing Guidelines

- TypeScript suites run on Vitest via `pnpm test:smart` or scoped `pnpm vitest -- --runInBand`; configs reside in `vitest.*.config.ts`.
- Python modules execute with `uv run pytest`; sustain ≥95% branch coverage and track `reports/badges/`.
- Co-locate tests with sources (e.g., `apps/*/tests`, `packages/*/tests`) and attach Smart Nx/pytest output in PRs.

## Agent Workflow & Repo Standards

- Follow five phases: Research (`*.research.md`), Planning (`*-tdd-plan.md`), Implementation (TDD checklists), Verification (Smart Nx + coverage logs), Archive (docs + CHANGELOG + website updates).
- Store decisions and lessons in local memory adapters; query them via semantic search before new work.
- Apply the Reality Filter—label unverifiable statements `[Inference]`, avoid speculation, and cite file:line references.
- Never claim production readiness while placeholders, mocks, or missing integrations remain.

## Commit & Pull Request Guidelines

- Use Conventional Commit syntax with scopes (e.g., `feat(agent-toolkit): add multiSearch audit`) and keep each commit focused.
- PRs must cite the related `tasks/` slug, summarize the change, include validation snippets, and list documentation updates (CHANGELOG, README, website).
- Run `pnpm biome:staged` and rerun affected Smart Nx targets before requesting review.

## Security & Operational Notes

- Do not commit secrets; rely on `.env.local`/Nx environment config.
- Prefer `createAgentToolkit()` over ad-hoc scripts for automation; log anomalies with brAInwav-branded messaging.
