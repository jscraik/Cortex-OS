# Cortex-OS App

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

This app wires the `@cortex-os/memories` service using env-driven factories for storage and embedders.

## Quick Env Reference

- Storage (layered short/long backends):
  - `MEMORIES_SHORT_STORE`: `memory | sqlite | prisma | local` (default: `memory`)
  - `MEMORIES_LONG_STORE`: `memory | sqlite | prisma | local` (default: `sqlite`)
  - `MEMORIES_SQLITE_PATH`, `MEMORIES_VECTOR_DIM`
  - `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`
- Encryption (per-namespace):
  - `MEMORIES_ENCRYPTION_SECRET`
  - `MEMORIES_ENCRYPTION_NAMESPACES` (e.g., `secure,pii`)
  - `MEMORIES_ENCRYPTION_REGEX` (e.g., `^sec:`)
  - `MEMORIES_ENCRYPT_VECTORS`, `MEMORIES_ENCRYPT_TAGS`
- Embedder:
  - `MEMORIES_EMBEDDER`: `noop | mlx | ollama` (default: `noop`)
  - MLX: `MLX_MODEL`, `MLX_SERVICE_URL`, `MLX_MODELS_DIR`, `PYTHON_EXEC`, `PYTHONPATH`
  - Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Decay:
  - `MEMORIES_DECAY_ENABLED`, `MEMORIES_DECAY_HALFLIFE_MS`

The app’s `provideMemories()` uses these envs via the memories package factories.

## Definition of Done
- [ ] Boots ASBR; wires MCP/A2A/Memory/RAG; exposes REST control plane.
- [ ] One-command dev up; graceful shutdown; provenance artifacts saved.

## Test Plan
- [ ] Golden path E2E.
- [ ] Incident path E2E.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

