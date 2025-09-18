# Cortex-OS Orchestration Prerequisites

This document captures the minimal environment and config expectations for running the new LangGraph-backed orchestration safely in local dev and CI.

## Required configs (repo-relative defaults)

- `config/mlx-models.json` – MLX model catalog
- `config/ollama-models.json` – Ollama model catalog

Both files must exist and be valid JSON. You may override their locations via:

- `MLX_MODEL_CONFIG_PATH` (default `config/mlx-models.json`)
- `OLLAMA_MODEL_CONFIG_PATH` (default `config/ollama-models.json`)

## Services & environment variables

- Ollama (optional for CI, recommended locally)
  - `OLLAMA_BASE_URL` (e.g., `http://localhost:11434` or `http://localhost:11434/v1` depending on client)
  - If not set, tools will prefer MLX (when available) and may skip Ollama checks in CI.

- MLX (local Apple Silicon recommended)
  - MLX is used directly in Python services and via model registry in orchestration. No env var is strictly required here, but see the model catalog above.

- Frontier (optional adapter)
  - `FRONTIER_API_KEY` only if you plan to use the Frontier provider. Absent by default; tests should skip Frontier integration when not configured.

## CI guidance

- CI should ensure model catalog files exist and are valid.
- Frontier is optional; tests should auto-skip when `FRONTIER_API_KEY` is absent.
- Ollama reachability checks should be non-fatal unless explicitly enabled for a job.

## Quick local sanity check

Run a non-destructive sanity script to check config visibility and optional service hints:

```bash
pnpm tsx scripts/sanity/orchestration-sanity-check.ts
```

This script does not alter repo state and will not fail the build; it only prints a summarized status.
