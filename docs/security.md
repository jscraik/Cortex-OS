# Cortex-OS Memory Security Posture

_Last updated: 2024-12-01_

Cortex-OS is under active development. The memory subsystem ships with baseline safeguards, but several production hardening tasks remain outstanding. This document captures the current truth so teams can plan mitigations.

## Current Safeguards

- **Network isolation**: The default Docker Compose stack exposes Qdrant only to the internal Compose network. Administrators needing host access must bind it manually to `127.0.0.1`.
- **Embedding backends opt-in**: Semantic search is disabled until an MLX or Ollama embedding endpoint is configured via environment variables. Without configuration, memory operations fall back to keyword search.
- **Provenance metadata**: Memories stored in Qdrant capture tenant, label, and source provenance to enable policy enforcement and audit trails.
- **Query budgeting**: Memory searches clamp result limits and offsets to prevent runaway scans and enforce fair-use budgets.
- **Secret scrubbing**: Sensitive tokens (e.g., API keys, JWTs, SSN-like patterns) are redacted before vectorization to reduce leakage risk.

## Known Gaps

- **Transport security**: TLS/mTLS is not yet enforced between services in the default stack. Deploy behind a trusted gateway or service mesh until native support lands.
- **AuthN/Z gateway**: A dedicated memory API gateway enforcing RBAC/ABAC policies is still in design. Current libraries expect the caller to supply vetted tenant/label context.
- **Observability**: Memory operations emit structured logs, but OpenTelemetry spans and audit event streams remain TODOs.
- **Documentation drift**: Architecture diagrams are being refreshed to reflect the latest topology. Track progress in the project documentation backlog.

## Roadmap Highlights

1. **Gateway enforcement** – introduce an authenticated memory API with tenant isolation, rate limiting, and audit logging.
2. **End-to-end encryption** – enable TLS termination at the gateway with optional mTLS for east-west traffic.
3. **Operational telemetry** – add OpenTelemetry spans and ship audit events to SIEM targets.
4. **Lifecycle automation** – automate right-to-be-forgotten workflows across SQLite and Qdrant.

## Deployment Recommendations

- Bind Qdrant to private interfaces or service meshes only; never expose it directly to the public Internet.
- Provision per-environment API keys or OAuth tokens for embedding backends and rotate them regularly.
- Configure environment variables such as `MEMORY_MAX_OFFSET` and `MEMORY_MAX_LIMIT` to match your tenant safety budget.
- Monitor logs for `MemoryProviderError` events indicating query guard triggers or embedding backend failures.

By keeping these notes accurate, Cortex-OS maintains compliance with brAInwav governance and ensures teams understand both capabilities and limitations of the current release.
