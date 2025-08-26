# Python libraries audit

This report reviews the Python packages under `libs/python` with a focus on packaging, typing, performance and interoperability.

## Package scores

| Package | Packaging | Typing | Performance | Interop | Score |
| --- | --- | --- | --- | --- | --- |
| cortex_core | Minimal `pyproject.toml`, missing metadata and pinned deps | Pydantic models typed but no `py.typed` | Light code, no benchmarks | Isolated models only | 4/10 |
| cortex_ml | `pyproject.toml` only, no source code | N/A | N/A | N/A | 1/10 |
| brainwav-memories | `pyproject.toml` with broad deps, limited metadata | Good Pydantic typing, no `py.typed` | HTTP client without perf tests | Basic HTTP API client | 5/10 |

## Findings
- `pyproject.toml` files lack classifiers, URLs, and explicit wheel/sdist settings.
- No packages ship a `py.typed` marker for type hint distribution.
- Dependencies and Python ABI are not pinned or hashed.
- Optional MLX acceleration flags are absent.
- No lock files or hash checking to ensure reproducible environments.
- Limited automated tests beyond a simple contract check.

## Fix plan
1. Pin `requires-python` and dependency versions; publish both sdist and wheel with SHA256 hashes.
2. Add `py.typed` to each package and include it in build artefacts.
3. Expand `pyproject.toml` metadata (classifiers, URLs, description) and enable lint/type check hooks.
4. Provide optional `mlx` extras for Apple silicon acceleration where applicable.
5. Generate `uv.lock` or `requirements.lock` files to guarantee reproducible installs.
6. Add performance benchmarks, import-time baselines, and property tests for data models.

## Score
Overall readiness score: **3/10**. Packaging completeness and environment reproducibility are the highest priority for improvement.
