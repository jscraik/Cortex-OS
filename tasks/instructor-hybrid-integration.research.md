# instructor-hybrid-integration Research

## Goal

Assess how the `instructor` Python library is currently integrated and identify the gaps that
prevent alignment with the brAInwav hybrid model solution (MLX-first with Ollama and cloud
fallbacks).

## Current Usage Overview

- `python/src/cortex_mlx/router.py`: Wraps an Ollama-backed `OpenAI` client with
  `instructor.from_openai` when the dependency is available to deliver structured chat responses.
- `libs/python/cortex_ml/instructor_client.py`: Provides shared sync and async Instructor client
  factories that honor `OLLAMA_BASE_URL`, prefer JSON mode, and expose helpers for structured
  chat invocations.
- `services/ml-inference/src/app.py`: Imports `instructor` at module scope and creates an async
  client during FastAPI startup via `create_async_instructor`, with a local fallback helper if the
  shared module import fails.
- `services/ml-inference/src/security.py`: Imports `instructor`, casts it to `Any`, and depends on
  the shared async factory for validation and structured output shaping.
- `apps/cortex-py/src/mlx/mlx_unified.py`: Optionally imports Instructor but never initializes the
  global `ollama_client`, so the structured path never executes even when Instructor is installed.
- `examples/instructor-ollama/src/main.py`: Demonstrates direct Instructor + Ollama structured
  extraction.

## Hybrid Model Context

- `apps/cortex-py/src/cortex_py/hybrid_config.py`: Implements `HybridMLXConfig`, defining MLX-first
  priorities, required models, branding, and health/embedding metadata for hybrid deployments.
- `config/hybrid-model-strategy.json`: Captures routing rules that decide between MLX, local Ollama,
  and Ollama cloud backends for embeddings, tool calling, and other workloads.
- `config/hybrid-deployment.yml`: Describes operational expectations for hybrid rollout, including
  health monitoring and branding requirements.

## Problems Identified (from earlier review)

1. `services/ml-inference/src/app.py` and `services/ml-inference/src/security.py` import
   `instructor` eagerly, causing import-time failures in environments where the optional dependency
   is absent.
2. `apps/cortex-py/src/mlx/mlx_unified.py` never constructs the Instructor/Ollama client, leaving
   the hybrid structured output branch unused.

## Hybrid-Alignment Gaps

- There is no shared utility that decides when to route to MLX versus Instructor/Ollama based on the
  hybrid strategy signals.
- Structured output flows (MLX services and security validators) do not expose hybrid routing state
  through brAInwav-branded telemetry.
- The ML inference service does not currently leverage `HybridMLXConfig` to determine when to build
  Instructor clients or remain strictly MLX-only.

## References & Constraints

- Logs and user-facing status must include brAInwav branding.
- All new code must respect the async/await-only rule and the ≤40-line function limit.
- Optional dependencies must degrade gracefully when missing to keep tests that rely on
  `_safe_has_module("instructor")` passing.

## Open Questions / Clarifications Needed

- Should hybrid routing decisions be surfaced in ML inference responses (for example, which backend
  served a request)?
- Is there an existing hybrid controller in Python to reuse, or should we extend
  `HybridMLXConfig` for runtime decisions?
- How should Ollama cloud credentials or URLs be handled when Instructor is enabled in hybrid mode
  (current helpers default to the local base URL)?
