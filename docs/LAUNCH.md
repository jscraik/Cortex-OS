# Cortex-OS Launch Guide

This guide makes the whole project executable locally and in CI with consistent commands.

## Prerequisites

- macOS or Linux
- pnpm >= 8, Node.js LTS (check `package.json` engines)
- Docker Desktop (for optional stack) and Docker Compose v2
- Python via uv (for Python subpackages/tests)

## First-time setup

1. Install node deps
   - Run: pnpm install
2. Install Python deps
   - Run: uv sync
3. Generate env samples
   - Copy `.env.example` files if present into package roots; validate with zod on startup

## Build and typecheck

- Build all: pnpm build
- Dev mode: pnpm dev
- Lint: pnpm lint
- Format: pnpm format

## Run tests

- All tests: pnpm test
- Coverage (gate >= 95%): pnpm test:coverage
- Targeted tests by package: use VS Code task "test:targeted:pkg"
- Targeted by dir/file: use tasks "test:targeted:dir" or "test:targeted:file"

## Launch core runtime (ASBR + features)

- Local stack: pnpm dev (turbo runs affected packages)
- Docker composition (recommended for parity):
  - Run: docker compose -f docker/docker-compose.dev.yml up --build
  - Optional variants: security, faiss, graph per compose files in `docker/`

## MVP server (reference)

- Start the MVP server locally:
  - Run: pnpm --filter apps/cortex-os dev
- Or via Docker:
  - Run: docker compose -f docker/docker-compose.dev.yml up cortex-os

## Web UI and a11y checks

- Start web app: pnpm --filter apps/cortex-web dev
- Playwright a11y: pnpm pw:test

## Security and compliance

- Dependency audit: pnpm audit || true (triage non-prod dev deps)
- Secret scan (example): git secrets or gitleaks (add to CI)
- SBOM: pnpm sbom (or cyclonedx-npm); outputs to `sbom/`

## Code quality gate

- Run: VS Code task "code-quality-check" (node scripts/code-quality-check.mjs)

## Packaging & release

- For packaging instructions, see the Packaging and Release Guide: [docs/PACKAGING.md](docs/PACKAGING.md)

## Readiness gates (coverage ≥ 95%)

- Initialize per-package readiness files: pnpm readiness:init
- Run tests with coverage and enforce thresholds:
  - pnpm readiness:init
  - node tools/readiness/run-package-tests.mjs
  - pnpm readiness:check
- CI enforces the same via `.github/workflows/readiness.yml`

## Open a PR with test plan

- Create a feature branch and push changes
- Ensure CI passes: readiness, security-and-sbom, and governance
- In the PR description, include:
  - Summary of changes and impacted packages
  - Test plan with coverage deltas (paste text-summary)
  - Any a11y and security notes (semgrep highlights)

## Troubleshooting

- Port collisions: free ports 3000/5173/8080 with lsof/kill or set env overrides
- Docker builds slow: enable BuildKit and cache mounts
- Type errors after install: run pnpm clean && pnpm install && pnpm build

## CI expectations

- CI runs: format, lint, build, unit/integration tests, coverage threshold, a11y (Playwright), security scans, sbom
- semantic-release handles versioning and changelog on main

---

See `reports/production-readiness-action-plan.md` for the incremental TDD rollout.
