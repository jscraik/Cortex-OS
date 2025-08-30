# Changelog — @cortex-os/agents

## 0.1.0 — 2025-08-30

- Removed legacy `fallbackEnabled` field from `ExecutionContext` and related validation.
  - Rationale: feature flag previously used to gate fallback behavior; fallback chaining is now configured via `ProviderChainConfig` and provider chain constructors.
  - Migration: callers that passed `fallbackEnabled` in execution contexts should stop doing so. No runtime behavior now depends on this flag inside `packages/agents`.

- Removed back-compat coercion in `code-analysis-agent` that converted suggestion arrays of strings into structured suggestion objects.
  - Migration: agents should produce/validate structured suggestion objects; input parsing is stricter now.

- Fallback chain now emits `provider.fallback` events to the configured `EventBus` on provider failures (best-effort, non-blocking publish).

### Notes & next steps

- Unit tests updated in `packages/agents/tests` to reflect the removed fields.
- Developers maintaining other packages should audit for `fallbackEnabled` usage; if provided to agents from upstream code, remove the field from those payloads.
- Follow-up: perform a cross-repo inventory for `pythonPath` (it remains widely used in bridges & adapters) and propose safe replacements (see `docs/hosting-python.md` as a potential target for docs).
