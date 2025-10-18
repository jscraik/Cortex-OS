---
title: 'ADR 003: First-class Skills Registry v1'
date: 2025-10-18
status: proposed
deciders:
  - brAInwav Architecture Working Group
reviewers:
  - Cortex-OS Skills Program
---

## Status

Proposed — pending implementation of the Skills Registry v1 rollout gates and reviewer sign-off per Constitution §3.2.

## Context

Cortex-OS currently treats `skills/*.md` documents as informal references without machine-readable guarantees. This has led to:

- Divergence between orchestrator invocations and documented capabilities, creating runtime risk.
- Limited discoverability for CLI/API consumers, increasing onboarding cost for new agents.
- Missing lifecycle metadata (deprecation, supersession), making migrations opaque.
- Lack of observability hooks, violating RULES_OF_AI logging requirements.

Governance drivers:

- **Constitution**: requires verifiable evidence, feature flags, and audit trails for new capabilities.
- **CODESTYLE**: mandates Zod-based validation, deterministic tooling, ≤40-line functions, and branded errors/logs.
- **Agentic Coding Workflow**: enforces TDD, coverage thresholds, and CI gates for new packages.

Constraints and non-goals:

- Must preserve existing skills markdown authoring experience while formalizing structure.
- Must expose read-only discovery interfaces (CLI, REST) without introducing mutable state.
- Non-goal: designing cost-based routing or dependency graph visualization (future ADR).

## Decision

Adopt a first-class **Skills Registry v1** comprising the following components:

1. **Machine-validated schema** — New `packages/skills-schema` package exporting a Zod contract for `SkillMetadata`. Required fields include identity (`name`, `version`, `category`), implementation binding (`impl`), inputs/outputs schemas, preconditions, side effects, estimated cost, and lifecycle metadata (`deprecated`, `sunsetDate`, `supersededBy`). Optional hooks cover dependency edges (`calls`), context requirements, and observability flags. Schema enforces semver, ISO-8601 timestamps, and branded error messages.
2. **Filesystem loader + registry** — Deterministic scanner (`skills/**/*.md`) that parses YAML front-matter, validates via the schema, and materializes an in-memory registry supporting `list`, `get`, `has`, and `validateInputs`. Registry caches results and exposes feature flag `CORTEX_SKILLS_REGISTRY_V1` for controlled rollout.
3. **Tooling surface** —
   - CLI command `cortex skills {list, describe, validate}` within `apps/cli`.
   - REST endpoints `GET /skills` and `GET /skills/:name` within `apps/api`, including ETag + rate limits.
   - CI lint via `packages/skills-lints` and workflow updates to gate malformed skills.
4. **Observability integration** — Orchestrator (`packages/orchestrator`) consults registry before execution, enforces input validation, and emits MCP audit events via `packages/skills-observability`.
5. **Documentation** — Contributor guide (`skills/README.md`), canonical example (`skills/examples/SendEmail.md`), and generated catalogue under `project-documentation/skills-catalog/`.

Implementation will follow TDD with new unit tests preceding code, coverage ≥ repo threshold, mutation checks, and adherence to Conventional Commits. All outputs remain branded “brAInwav”.

## Consequences

Positive outcomes:

- Eliminates schema drift by blocking invalid skills at CI and runtime.
- Improves discoverability for humans (docs catalogue) and agents (CLI/API).
- Enhances safety via feature-flagged rollout, audit events, and deprecation metadata.
- Aligns with governance by providing evidence artifacts (vibe checks, connectors health, task logs).

Trade-offs and follow-up work:

- Slight startup cost due to registry initialization; mitigated with caching.
- Requires contributors to update skills markdown to match schema; migration support needed during rollout.
- Future ADR needed for advanced dependency graph tooling, cost-aware orchestration, and automated documentation publishing pipelines.

Verification:

- CI jobs (`skills-lint`, `test:smart -- --coverage`) must pass before merge.
- Feature flag audit documented in task summary with evidence links.
