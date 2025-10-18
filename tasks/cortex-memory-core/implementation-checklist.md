# Cortex Memory Core — Implementation Checklist

- [ ] Migrations applied (`pnpm db:migrate`) and rolled back cleanly; RLS policies verified via `current_setting('app.tenant_id')`.
- [ ] Unique `payload_hash` constraint enforced; concurrent insert test green.
- [ ] OpenAPI spec served at `/v1/memory/openapi.json` (or equivalent) and validates requests/responses.
- [ ] Signature verification covers Ed25519 and Sigstore pathways with constant-time hash comparison.
- [ ] `scripts/a11y-ci.ts` rejects missing `alt` text, missing `sr_note`, and color-only semantics.
- [ ] `saveSnapshot` honours `Idempotency-Key` header and deduplicates by `payload_hash`.
- [ ] Hybrid index pipeline writes `tsv` and vector embeddings (with `facets.pending=["vector"]` fallback).
- [ ] Search rankings respect α/β/γ/δ weighting and MMR diversification on seeded fixtures.
- [ ] Observability logs/metrics include `brAInwav` branding and tenant context.
- [ ] `pnpm test:smart -- --coverage` passes with ≥ repo thresholds (aspire ≥90%).
- [ ] `pnpm security:scan` and `pnpm security:scan:gitleaks` pass with evidence stored in `test-logs/`.
- [ ] Mutation testing scaffold executes for high-risk modules (record results in `verification/`).
- [ ] MCP bridge tool `cortex.snapshot.save` end-to-end test succeeds.
- [ ] `SUMMARY.md` updated with evidence links and waiver references (including `VIBE-2025-10-18-01`).
- [ ] Conventional Commit messages used for each task-level PR.

