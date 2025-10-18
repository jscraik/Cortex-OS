# skills-registry-v1 — Implementation Checklist

Use this checklist to track completion of the plan. Mark each item with ✅ / ⏳ / ❌.

## Governance & PrefLight
- [ ] Time Freshness waiver recorded and linked.
- [ ] Connectors health curl checks executed or waiver filed; logs stored under `logs/research/`.
- [ ] Oversight vibe check initiated (`logs/vibe-check/initial.json`).
- [ ] Baton metadata updated (`planner.*`, `parallel.*`, evidence list).

## Documentation
- [ ] ADR `docs/adr/ADR-00xx-skills-registry-v1.md` authored and merged.
- [ ] Skills README updated with schema guidance and registry references.
- [ ] Canonical `skills/examples/SendEmail.md` committed.
- [ ] Generated catalogue documented under `project-documentation/skills-catalog/`.

## Code Implementation
- [ ] `packages/skills-schema` created with Zod schema + tests.
- [ ] Filesystem loader and in-memory registry implemented with fixtures/tests.
- [ ] `packages/skills-lints` CLI and JSON schema added; unit tests passing.
- [ ] `packages/skills-observability` audit module implemented with tests.
- [ ] CLI command `apps/cli/src/commands/skills.ts` implemented & tested.
- [ ] API routes `apps/api/src/routes/skills.ts` implemented & tested.
- [ ] Orchestrator integration updated with feature flag + audits.
- [ ] Agent toolkit utilities updated to query registry.

## CI & Quality Gates
- [ ] `.github/workflows/ci.yml` updated with lint/typecheck/test/mutation ordering.
- [ ] Coverage & mutation thresholds met or exceeded.
- [ ] Security scans (`pnpm security:scan*`) executed with evidence archived.
- [ ] Test logs saved under `test-logs/` with timestamps.

## Rollout & Verification
- [ ] Feature flag `CORTEX_SKILLS_REGISTRY_V1` toggled in staging and validated.
- [ ] Final vibe check logged to `logs/vibe-check/final.json`.
- [ ] Summary report updated (`summary.md`) with evidence links.
- [ ] Memories instructions updated with final decisions.

