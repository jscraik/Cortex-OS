# Dependency Currency Log

## 2025-10-04
- Node: `pnpm outdated --long` (no updates required)
- Python: `uv pip list --outdated` (no updates required)
- Test evidence: `pnpm run setup:deps`, `pnpm run test:live`
- Exceptions: none
- Approvers: Codex (automation), Jamie Craik

## 2025-10-08
- Node: `pnpm outdated --long` → `pnpm up --latest`; upgraded `@anthropic-ai/sdk` 0.61→0.65, `@langchain/core` 0.3.32→0.3.78, `@prisma/client` 5.22→6.17, `promptfoo` 0.44→0.118, `@playwright/test` 1.51→1.56, etc. Added `@fastify/cors` for HTTP hardening and `apache-arrow` (17.0.0) to satisfy `@lancedb/lancedb`. Pinned `zod` to 3.25.76, `better-sqlite3` to 11.10.0, and `chokidar` to 3.6.0 to keep peer dependencies green; removed unused `@nx/linter`.
- Python: `uv pip list --outdated` → `uv lock --upgrade --upgrade-package ...`; refreshed fastapi 0.118.1, huggingface-hub 0.35.3, langchain-community 0.3.31, langchain-openai 0.3.35, langsmith 0.4.33, codecarbon 3.0.6, pandas 2.3.3, pydantic 2.12.0, mlx{,-lm,-metal} 0.29.2/0.28.2, ruff 0.14.0, sentry-sdk 2.40.0, tiktoken 0.12.0, transformers 4.57.0, etc. Retained `openai` 1.109.1 and `httpx` 0.27.2 (codecarbon requires <0.28). Major upgrades for `anthropic` 0.69, `llama-*` 0.14+, `marshmallow` 4.x, `python-json-logger` ≥4, and `pytest-rerunfailures` ≥16 deferred pending API compatibility review. `fastmcp` remains on 2.1.2 because newer wheels pull in a large OpenAPI toolchain we are not ready to adopt.
- Test evidence: `pnpm run setup:deps`, `pnpm run check:deps` (verifies Node + uv sync).
- Exceptions / follow-ups: track CodeCarbon’s `httpx` pin, schedule evaluations for `anthropic`/`llama-index` major releases, and plan migration off legacy `fastmcp` once OpenAPI client updates are vetted.
- Approvers: Codex (automation)

