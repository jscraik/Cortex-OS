# Contributing to Cortex-OS

Thank you for considering a contribution. To keep the project secure and maintainable, please follow these guidelines:

## Development Workflow
1. Fork and clone the repository.
2. Install prerequisites: Node.js 22+, pnpm 9, Python 3.11+ with `uv`.
3. Run `pnpm install` and `uv sync` where appropriate.
4. Follow the PRP loop: plan → generate → review → refactor.

## Code Standards
- Validate all external inputs with Zod schemas.
- Avoid cross-domain imports; use defined contracts.
- Include unit tests and run `pnpm lint` and `pnpm test` before submitting.
- For Python modules run `uv run ruff check .` and `uv run pytest`.

## Governance
- Ensure licenses are MIT compatible.
- Do not commit secrets. Gitleaks and CodeQL run on every PR.
- All contributions require review by CODEOWNERS.

## Accessibility
- UI changes must meet WCAG 2.2 AA. Provide keyboard paths and ARIA labels.

## Commit Messages
- Use conventional commits (`feat:`, `fix:`, etc.).

By contributing, you agree to abide by the project code of conduct.
