# repository-guidelines.research.md

## Research Objective
Create an updated contributor-facing guide (AGENTS.md) summarizing repository structure, workflows, and standards for Cortex-OS.

## Existing Patterns Found
- Root README.md documents Smart Nx wrappers, agent-toolkit usage, and production standards.
- CODESTYLE.md enforces function length limits, named exports, async/await, and language-specific conventions.
- CONTRIBUTING.md covers Conventional Commits, workflow expectations, and mandatory local memory usage.
- CHANGELOG.md tracks recent updates; docs/ and project-documentation/ host extended references.
- scripts/nx-smart.mjs powers build/test/lint automation.

## External Research
- None required; repository documentation already defines standards.

## Recommendations
- Emphasize monorepo layout (apps/, packages/, services/, infra/, docs/, project-documentation/).
- Highlight Smart Nx commands (`pnpm build:smart`, `pnpm test:smart`, etc.) and agent-toolkit recipes (`just scout`, `just verify`).
- Reiterate CODESTYLE.md rules: ≤40-line functions, named exports, async/await, naming conventions.
- Mention Vitest and `uv run pytest` usage with coverage expectations reported in `reports/badges/`.
- Reference Conventional Commits, TDD workflow artifacts in tasks/, local memory usage, and the reality filter requirements.
- Call out prohibition on placeholders, mocks, and non-branded logs in production paths.
