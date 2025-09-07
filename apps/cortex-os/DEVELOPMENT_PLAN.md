# ASBR-lite Development Plan

## Overview

This document outlines the strict software engineering and test-driven development plan for the ASBR-lite brain in `apps/cortex-os`.

## Development Plan

| Stage | Objective | Commit Breakdown (TDD) | Notes |
|-------|-----------|------------------------|-------|
| **0. Scaffolding Review**                   | Confirm baseline DI and event bus wiring.                | 1. ✅ Add regression tests for current DI & event routing.<br>2. ✅ Fix any failing tests.                                                                                                 | Locks in existing behavior before new work. |
| **1. Contract Registry**                    | Maintain contract definitions with lookup & validation.  | 1. ❌ Add failing tests for registering & retrieving contracts.<br>2. ✅ Implement registry with schema validation.<br>3. ✅ Integrate registry into DI container.                         | Use JSON schema + provenance tags.          |
| **2. Policy Router**                        | Enforce routing policy rules.                            | 1. ❌ Test: events violating policy should be rejected.<br>2. ✅ Implement router; config-driven policies.<br>3. ✅ Link with contract registry for contract-aware routing.                | Supports future hot-reload.                 |
| **3. Structure Guard**                      | Validate event payload structure.                        | 1. ❌ Test: malformed event fails guard.<br>2. ✅ Implement guard using JSON schema.<br>3. ✅ Integrate guard into routing pipeline.                                                       | Ensures data integrity.                     |
| **4. Provenance Enhancements**              | End-to-end provenance tracking.                          | 1. ❌ Test: provenance metadata persists across services.<br>2. ✅ Extend memory store & event bus to propagate provenance.<br>3. ✅ Expose provenance via diagnostics API.                | Enables lifecycle traceability.             |
| **5. OpenTelemetry (OTEL)**                 | Metric & trace instrumentation.                          | 1. ❌ Test: OTEL exporter receives metrics from bus.<br>2. ✅ Wire OTEL SDK; instrument bus, DI, thermal guard.<br>3. ✅ Documentation for OTEL setup.                                     | Foundation for observability.               |
| **6. Workflow & Capability Use Cases**      | Start workflow, route capability, emit lifecycle events. | 1. ❌ Tests for each use case: start workflow → events; capability routing; lifecycle emissions.<br>2. ✅ Implement service stubs fulfilling tests.<br>3. ✅ Integration tests across bus. | Demonstrates end-to-end flow.               |
| **7. Privacy Pin to MLX & Cost Guardrails** | Secure MLX interactions & cost awareness.                | 1. ❌ Test: MLX requests reject unauthorized access.<br>2. ✅ Implement privacy pin; cost tracking & throttling.<br>3. ✅ Extend thermal guard for cost metrics.                           | Aligns with resource governance.            |
| **8. Policy Hot‑Reload**                    | Runtime policy updates without restart.                  | 1. ❌ Test: modify policy file ⇒ router uses new rules.<br>2. ✅ File watcher reloads policies.<br>3. ✅ Add health metrics for reload successes/failures.                                 | Builds on policy router.                    |
| **9. Admin Health/Routing UI**              | Web UI for health & route inspection.                    | 1. ❌ Accessibility-first React tests (axe-core) for health UI.<br>2. ✅ Implement minimal UI with WCAG 2.2 AA compliance.<br>3. ✅ Hook UI to event bus & diagnostics endpoints.          | Provide keyboard navigation & SR labels.    |

## Operating Principles

1. **TDD Cycle:** red (write failing test) → green (implement) → refactor (cleanup & commit).
2. **Small Commits:** Each bullet in "Commit Breakdown" becomes its own commit with descriptive message.
3. **CI Gate:** Run linter, unit tests, coverage, and security scans per commit; merge only on green.
4. **Documentation:** Update README or inline docs when APIs change; reference commit hashes in changelog.
5. **Code Review:** Every feature/bugfix via pull request; require at least one reviewer and all checks passing.
6. **Versioning:** Tag milestones (e.g., `v0.1`, `v0.2`) once Must-haves and Should-haves reach minimal viability.

## Milestone Targets

| Milestone                          | Includes   | Target |
| ---------------------------------- | ---------- | ------ |
| **M1: Governance Core**            | Stages 1–5 | Week 1 |
| **M2: Use Case Enablement**        | Stage 6    | Week 2 |
| **M3: Resource & Policy Maturity** | Stages 7–8 | Week 3 |
| **M4: Operational UI**             | Stage 9    | Week 4 |
