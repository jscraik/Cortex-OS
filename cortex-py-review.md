# cortex-py Technical Review and TDD Plan

## Technical review
- The FastAPI layer initializes an MLX embedding generator at import time and exposes a single `/embed` endpoint without input validation beyond Pydantic’s schema.
- The unified MLX module hard-codes macOS-specific cache locations and sets `BaseModel` to `None` when the optional `instructor` dependency is missing, making the module unusable in environments lacking that package.
- Embedding generation depends on Qwen models and fails immediately if MLX is unavailable; model metadata (dimensions, memory, context length) is embedded in code rather than configuration.
- The project demands Python ≥3.13 and includes heavyweight MLX and transformer dependencies gated by `sys_platform == 'darwin'`, complicating cross-platform support and dependency management.
- Test suite currently fails during import of `mlx_unified` because `instructor` is absent, indicating insufficient isolation of optional dependencies.

## Software engineering principle
**Principle:** Every cortex‑py component must be environment‑agnostic, dependency-resilient, and fully test-driven: configuration through explicit parameters or environment variables only; no hard-coded platform assumptions; optional dependencies must degrade gracefully; global state minimized; each commit includes tests, documentation, and code verifying operational readiness.

## TDD implementation plan
1. **Graceful `instructor` fallback**
   - Write a failing test asserting `mlx_unified` imports when `instructor` is absent.
   - Implement conditional definition of `ChatResponse` using `pydantic.BaseModel` only when available.
2. **Configurable cache directories**
   - Failing test: verify that setting `HF_HOME`, `TRANSFORMERS_CACHE`, and `MLX_CACHE_DIR` overrides defaults.
   - Refactor constants into environment-aware getters; document behavior.
3. **Dependency injection for embeddings**
   - Failing test: ensure FastAPI app can be instantiated with a stub generator.
   - Refactor `_generator` to be injected via app startup or dependency.
4. **Robust API validation**
   - Failing test: POST `/embed` with empty text returns 422 and logs error.
   - Add explicit request validation and structured error responses.
5. **Model metadata from config**
   - Failing test: loading custom model config from JSON/TOML yields correct metadata.
   - Move `DEFAULT_EMBEDDING_MODELS` to configurable file; adjust loader.
6. **Cross-platform CI readiness**
   - Failing test: pipeline script verifies tests run without Darwin-only packages.
   - Introduce conditional extras and mock MLX in CI.
7. **End-to-end smoke tests**
   - Failing test: containerized run of API returns a normalized embedding for sample text.
   - Provide Dockerfile test harness and ensure no network/model download is required.

## Testing
- `pytest apps/cortex-py/tests -q` – import error: `TypeError: NoneType takes no arguments` from missing `instructor` dependency.

## Notes
- Tests require optional dependencies (e.g., `instructor`) or mocks; install or mock accordingly before running the suite.
