# Skills & Workflows Plan Review

- **Reviewer:** code-planner-agent (LLM-assisted)
- **Review Date:** 2025-10-15
- **Source Plan:** "Hybrid Skills Registry + Multi-Agent Graph" proposal (4 phases)

## 1. Governance & Process Alignment

- The proposal lacks explicit references to the mandated planning artifacts (feature spec, research log, TDD plan) and the oversight `vibe_check` gate. These must be scheduled prior to Phase A execution to comply with `AGENTS.md` §2 and the code planner playbook.
- Connector health checks for Wikidata and arXiv MCP services are not documented. They should be run (and logged) before evidence gathering per the planner requirements. If unavailable, capture a waiver request.
- Local Memory updates and decision logging are not mentioned. Add explicit steps to persist planning artifacts into the Local Memory MCP and `.github/instructions/memories.instructions.md`.

## 2. Phase-Level Assessment & Improvements

### Phase A — Schemas + Registry Scaffold

**Strengths**
- Establishes JSON schemas and initial registry scaffolding, keeping the PR small (<12 files).

**Gaps & Recommendations**
- Add automated schema validation scripts (pnpm task) and integrate with CI even in Phase A so later phases inherit the gate.
- Include fixture skill/workflow artifacts plus unit tests that hit the validator to avoid regressions.
- Document schema versioning strategy and migration expectations in `schemas/README.md`.

### Phase B — Graph Runtime Glue

**Strengths**
- Introduces runtime execution primitives alongside workflow samples, balancing implementation and documentation.

**Gaps & Recommendations**
- Ensure `GraphRuntime` TDD coverage meets package thresholds (≥95% changed lines). Add fuzz/edge tests for retry and checkpoint logic.
- Define contracts for A2A messages (`skill:request`, `skill:result`) under `packages/a2a/contracts/` with versioning metadata.
- Update `packages/orchestration/docs/datasheet.md` (or add) to capture runtime SLO/a11y impacts.

### Phase C — CLI & UI Surfacing

**Strengths**
- Breaks CLI and UI exposure into manageable file counts, mindful of a11y requirements.

**Gaps & Recommendations**
- Include jest-axe (or equivalent) coverage for new UI pages per package agent guidelines.
- Provide mock skills/workflows fixtures for CLI tests to avoid coupling to local filesystem state.
- Add screenshot/recording requirements to the PR checklist to satisfy UI evidence expectations.

### Phase D — Governance & Telemetry Hooks

**Strengths**
- Focuses on safety and observability hooks once core functionality exists.

**Gaps & Recommendations**
- Clarify how telemetry sinks map to existing OTEL exporters and update the security threat model docs.
- Extend CI to validate licenses and accessibility flags declared in skills metadata.
- Coordinate with `packages/tdd-coach` maintainers to define enforcement severity levels for missing skill tests.

## 3. Cross-Cutting Risks & Mitigations

| Risk | Impact | Recommended Mitigation |
| ---- | ------ | ---------------------- |
| Lack of evidence artifacts (Wikidata/arXiv logs, vibe check output) | CI/Review block | Schedule evidence collection and attach logs in each phase; run oversight before implementation. |
| Schema drift without versioning | Runtime incompatibility | Adopt semantic versioning per schema and document upgrade steps. |
| Incomplete governance updates | Audit failures | Update root/package docs, Local Memory, and add CI rules concurrently with functional changes. |

## 4. Next Actions

1. Draft required planning artifacts (feature spec, research log, TDD plan) and run connector health checks; attach evidence.
2. Update the phase roadmap with the recommendations above, including schema validation automation and governance artifacts.
3. Secure reviewer alignment on gating strategy (tests, CI checks, telemetry) before Phase A implementation begins.
