# Cortex-py MLX developer guide

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

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
- Set `HF_HOME`, `TRANSFORMERS_CACHE`, or `MLX_CACHE_DIR` to override default cache paths.
- Override embedding model metadata by supplying a JSON/TOML file to `MLXEmbeddingGenerator(config_path=...)`.

## MLX Integration & Environment Toggles

The embedding stack supports multiple backends with explicit, deterministic environment controls. Capability reporting is available via `get_backend_capabilities()`.

### Environment Variables

| Variable | Effect | Notes | Precedence |
|----------|--------|-------|------------|
| `CORTEX_PY_FAST_TEST=1` | Enables light-weight stub backend (no real model load) | Used in most unit tests for speed | Highest for fast-mode short‑circuit |
| `CORTEX_FORCE_DISABLE_MLX=1` | Forces MLX to be treated as unavailable | Overrides any successful import | High |
| `CORTEX_FORCE_ENABLE_MLX=1` | Forces MLX attempt if components import and platform is Darwin | Still requires successful `mlx` + `mlx_lm` import | High (after disable) |
| `CORTEX_MLX_SHIM=1` | Indicates tests are running under a synthetic shim (no real MLX runtime) | Set automatically by `tests/conftest.py` when shim installed | Informational (affects test assertions) |
| `HF_CACHE_PATH` | Overrides Hugging Face cache path | Used when downloading / retrying sentence-transformers or MLX weights | Model load phase |
| `MLX_DEFAULT_MAX_LENGTH`, `MLX_DEFAULT_MAX_TOKENS`, `MLX_DEFAULT_TEMPERATURE` | Provide defaults for unified chat/embedding stubs | Consumed by `mlx.mlx_unified` shim | Optional |

### Capability Reporting

Programmatic detection:

```python
from mlx.embedding_generator import get_backend_capabilities
caps = get_backend_capabilities()
print(caps)
# Example: {'mlx_available': False, 'sentence_transformers_available': True, 'fast_test_mode': True, 'platform': 'Linux'}
```

### Backend Selection Logic (Simplified)

1. Fast test mode (`CORTEX_PY_FAST_TEST=1`) short-circuits to a deterministic stub (always returns zero vectors of configured dimension) and marks backend as `sentence-transformers` for compatibility.
2. Otherwise a priority list is built: `[mlx? , sentence-transformers?]` based on availability flags.
3. MLX availability = successful imports + Darwin platform, unless forced enabled / disabled by env.
4. First backend that loads a model successfully is selected; exhaustive failure raises `RuntimeError`.

### Shim vs Real MLX

Non-Darwin platforms or CI contexts without Apple Silicon can still exercise import and control‑flow paths via the shim defined in `tests/conftest.py`. The shim sets `CORTEX_MLX_SHIM=1` and provides minimal class & helper APIs so tests achieve coverage without heavy dependencies.

Real MLX execution (model loading & numeric kernels) only occurs on Darwin with proper dependencies installed (`mlx`, `mlx-lm`).

### Adding New Models

Extend `embedding_models.json` (or a TOML override) with:

```jsonc
{
  "new-embedding-model": {
    "path": "repo-or-local-path",
    "dimensions": 768,
    "context_length": 8192,
    "memory_gb": 2.5
  }
}
```

Keep fields lean; treat new fields as optional until widely consumed (contract-first principle).

### Testing Matrix Recommendations

| Scenario | Vars | Purpose |
|----------|------|---------|
| Fast unit suite | `CORTEX_PY_FAST_TEST=1` | Speed + branch coverage |
| Darwin real MLX smoke | `CORTEX_FORCE_ENABLE_MLX=1` | Validate true kernel path |
| Forced disable check | `CORTEX_FORCE_DISABLE_MLX=1` | Ensure graceful fallback/error |
| Shim fallback (Linux CI) | (auto) `CORTEX_MLX_SHIM=1` | Cross-platform path & coverage |

### Failure Diagnostics Tips

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| `No embedding backend available` | Both MLX + ST unavailable (and not fast mode) | Install deps or enable fast test mode |
| Long startup time | Real model download attempted | Pre-cache HF weights / enable fast mode |
| Backend reports `mlx_available=False` on macOS | Missing `mlx` / `mlx_lm` import | `pip/uv add mlx mlx-lm` |
| Unexpected shim skip | `CORTEX_MLX_SHIM=1` leaked into local env | Unset for real run: `unset CORTEX_MLX_SHIM` |

### Minimal Programmatic Usage

```python
from mlx.embedding_generator import MLXEmbeddingGenerator
gen = MLXEmbeddingGenerator("qwen3-embedding-4b-mlx")
vecs = gen.generate_embeddings(["hello", "world"])
print(len(vecs), len(vecs[0]))
```

---

For architectural constraints & contract policies, see root `AGENTS.md` and the Cortex-OS AI Contributor Playbook.
