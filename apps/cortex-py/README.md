# Cortex-py MLX developer guide

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This file explains how to run MLX-related tests and model loads locally and in CI in a reproducible, network-safe way.

## Goals

- Provide steps to run tests that depend on MLX without unexpected weight downloads during CI.
- Document how to pre-cache Hugging Face/MLX model caches and run `uv` reproducibly.

## Locally (developer)

1. Install Python deps and create `.venv`:

```bash
# ensure uv is installed and available
uv sync
```

2. Install MLX extras into the venv (so tests can import MLX runtime):

```bash
uv add mlx mlx-lm mlx-vlm transformers torch numpy faiss-cpu qdrant-client chromadb
uv sync
```

3. Option A: Use a small local model (recommended for fast CI/workflows)

- Place a local model directory under `tests/models/local-small-model` and provide its path to tests via env var or CLI:

```bash
export MLX_LOCAL_MODEL_PATH=tests/models/local-small-model
.venv/bin/python -m pytest apps/cortex-py/tests/test_mlx_unified.py -q
```

4. Option B: Pre-cache Hugging Face models on an artifacts runner or sidecar

- On a machine with network access, pre-download model weights to a shared cache (set `HF_HOME` or `TRANSFORMERS_CACHE`).
- Upload the cache as a CI artifact and restore it in the job before running tests.

Example CI steps (pseudo):

```yaml
- name: Restore model cache
  uses: actions/download-artifact@v4
  with:
    name: hf-cache

- name: Install deps
  run: uv sync

- name: Run tests
  run: .venv/bin/python -m pytest apps/cortex-py/tests/test_mlx_unified.py -q
```

## In CI (trusted runners)

- Prefer using small local models or pre-cached weights to avoid flaky downloads and rate limits.
- Add a dedicated CI matrix job that runs MLX-heavy tests only when `MLX=true` is set in the workflow.

## Safety notes

- Loading large models will incur disk and network usage. Use `MLX_LOCAL_MODEL_PATH` or pre-cached `HF_HOME` to avoid on-the-fly downloads.
- For reproducible builds, pin model versions and use checksum verification where possible.

## Troubleshooting

- If tests fail due to missing MLX imports, ensure `uv add` and `uv sync` were run and `.venv` is activated.
- If model load was attempted and failed, check `HF_HOME` and `MLX_CACHE_DIR` env vars.
