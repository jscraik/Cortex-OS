# Dependency Currency Log

## 2025-10-04
- Node: `pnpm outdated --long` (no updates required)
- Python: `uv pip list --outdated` (no updates required)
- Test evidence: `pnpm run setup:deps`, `pnpm run test:live`
- Exceptions: none
- Approvers: Codex (automation), Jamie Craik

## 2025-10-05
- Node: `pnpm outdated --json` (high-signal upgrades applied: `@biomejs/biome@2.2.5`, `@cyclonedx/bom@4.1.2`, `chalk@5.6.2`, `crawlee@3.15.1`, `nanoid@5.1.6`, `react-router-dom@7.9.3`, `typescript@5.9.3`, `@eslint/js@9.37.0`, `eslint@9.37.0`, `@typescript-eslint/{parser,eslint-plugin}@8.45.0`, `@playwright/test@1.55.1`, `prettier@3.6.2`).
- Major-version deltas flagged for follow-up: `prisma@6.x`, `uuid@13`, `zod@4.x`, `lint-staged@16`, `neo4j-driver@6`, `openai@2.x`, `promptfoo@0.118.x` — pending compatibility evaluation.
- Python: `uv pip list --outdated` (notable gaps: `anthropic@0.69.0`, `deepeval@3.6.2`, `fastmcp@2.12.4`, `openai@2.1.0`, `llama-index@0.14.4`, `mlx@0.29.2`, `pandas@2.3.3`, `pytest-rerunfailures@16.0.1`).
- Tooling: `pnpm run setup:deps` (pass) and `uv sync` reconverged locks; `pnpm run test:live` currently failing — blockers: legacy memories Jest harness still imports `@cortex-os/memories`, kernel Nx build tests timing out, `scripts/test-safe.sh` missing, and Agent Toolkit RED specs expecting live tool telemetry.
- Baseline: `pnpm baseline:refresh` aborted (`nx-smart` terminated with exit 130) — multiple package builds required extension-qualified imports and real toolchain availability. See `nx` run i5QSme5r3P.
- Approvers: Codex (automation), Jamie Craik; follow-up required for test flakes before flipping CI guard to hard enforcement.

