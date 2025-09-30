# instructor-hybrid-integration TDD Plan

## Goal

Deliver a hybrid-aware Instructor integration for brAInwav Cortex-OS that prefers MLX, falls back to
local Ollama, and optionally escalates to Ollama Cloud while degrading gracefully when the dependency
is absent.

## Test Strategy

1. `libs/python/cortex_ml/tests/test_instructor_client_utils.py`
   - Write new unit tests for a `evaluate_instructor_hybrid_readiness` helper covering privacy mode,
     conjunction toggles, and Ollama Cloud enablement.
   - Assert the helper returns a structured tuple `(enabled, reason)` with brAInwav-branded messaging.
2. `libs/python/cortex_ml/tests/test_instructor_client.py`
   - Update tests to expect optional `None` returns when Instructor is gated off.
   - Add regression coverage ensuring JSON mode and Ollama Cloud base URLs are applied when enabled.
3. `services/ml-inference/tests` (new or existing location)
   - Introduce FastAPI lifespan tests that patch the helper to simulate enabled/disabled paths and
     verify `/ready` reports the correct Instructor status.
4. Manual smoke validation
   - Exercise `/predict` and `/structured` with hybrid gating toggled to confirm structured responses
     switch between MLX-only and Instructor-backed flows.

## Implementation Plan

1. **Hybrid Readiness Helper**
   - Add `evaluate_instructor_hybrid_readiness` in `cortex_ml.instructor_client` to compute whether
     Instructor should initialize based on Instructor availability, privacy mode, `CORTEX_CONJUNCTION_ENABLED`,
     and Ollama Cloud configuration.
   - Emit brAInwav-branded log messages describing the decision and selected base URL (local vs cloud).
   - Update async/sync factory functions to honour the helper result and expose the chosen backend via
     metadata for downstream telemetry.
2. **ML Inference Integration**
   - Replace direct `create_async_instructor` calls inside `services/ml-inference/src/app.py` with the
     helper, logging when privacy mode or missing dependencies skip Instructor setup.
   - Propagate the decision into the readiness response and metrics so `/ready` and `/metrics` reflect
     hybrid status.
   - Ensure `/structured` leverages the optional client and surfaces 503 responses with branded reasons
     when Instructor is unavailable.
3. **Security & Structured Output Validators**
   - Refactor `services/ml-inference/src/security.py` validators to request the optional client lazily,
     reusing the helper for hybrid decisions and Ollama Cloud routing.
   - Add instrumentation so sanitization logs include whether MLX-only or hybrid processing occurred.
4. **MLX Unified CLI Alignment**
   - Initialize the global Instructor/Ollama client inside `apps/cortex-py/src/mlx/mlx_unified.py` using
     the helper, allowing structured chat mode to leverage Ollama Cloud when enabled.
   - Document CLI flags or environment hints for toggling cloud usage in the associated README.
5. **Documentation & Telemetry**
   - Update research notes, README snippets, and CHANGELOG entries to describe the hybrid Instructor
     behaviour, including Ollama Cloud escalation paths.
   - Capture key metrics fields (e.g., `hybrid_backend`) for monitoring with brAInwav branding.

## Implementation Checklist

- [ ] Hybrid readiness helper returns `(enabled, reason, backend)` and logs brAInwav-branded decisions.
- [ ] Instructor factories respect privacy, conjunction, and Ollama Cloud toggles.
- [ ] ML inference lifespan wiring reports Instructor availability in `/ready` and `/metrics`.
- [ ] Security and structured output validators operate correctly when Instructor is disabled or cloud-backed.
- [ ] MLX unified CLI exercises structured chat through the shared helper.
- [ ] New and updated automated tests cover helper decisions and service readiness states.
