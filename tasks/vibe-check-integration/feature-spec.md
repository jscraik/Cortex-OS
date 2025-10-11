# Feature Specification: Vibe Check MCP Oversight Integration

**Task ID**: `vibe-check-integration`  
**Feature Branch**: `feature/vibe-check-integration`  
**Created**: 2025-10-11  
**Status**: In Progress  
**Priority**: P1  
**Assignee**: Unassigned

**User Request**:
> Integrate https://github.com/PV-Bhat/vibe-check-mcp-server into our agentic workflow and enforce its use.

---

## Executive Summary
Integrate an external MCP server providing CPI-based oversight (“vibe_check”) into brAInwav Cortex-OS orchestration. Enforce a reflection gate after planning and before side-effecting actions, with brAInwav-branded audit evidence.

---

## User Scenarios & Testing (mandatory)

### User Story 1: CPI reflection before side-effects (Priority: P1)
**As a** runtime orchestrator,  
**I want to** automatically trigger a vibe_check before file writes/network calls,  
**So that** agents avoid reasoning lock-in and harmful actions.

Why: Core safety gate for MCP-first runtime.
Independent Test Criteria: Unit+integration tests simulate server and assert gating + logs.

Acceptance:
1. Given a planned task, When orchestration.run begins, Then vibe_check is called and evidence logs include "brAInwav-vibe-check".
2. Given high-risk response, When guard policy is strict, Then run is blocked with branded error.

brAInwav Branding Requirements:
- Logs, errors, and metrics include brand:"brAInwav" and string "brAInwav-vibe-check".

### Edge Cases & Error Scenarios
- Server unavailable → Soft-fail in dev; branded warning; policy toggle for prod strictness.
- Schema mismatch → Zod-validated error with brand; no secrets in logs.

---

## Requirements (mandatory)

### Functional Requirements
1. [FR-001] Add pre-action oversight gate invoking vibe_check with goal, plan, sessionId.
   - Validation: unit/integration tests + log evidence.
2. [FR-002] Support constitution tools to set per-session rules.
   - Validation: unit test ensures update_constitution called.
3. [FR-003] brAInwav branding in outputs/logs/errors.

### Non-Functional Requirements
- [NFR-S-001] Pass security scans; no secrets in code.
- [NFR-T-001] 90%+ coverage on new code.
- [NFR-O-001] Emit A2A/observability events with brand tag.

---

## Technical Constraints
- Named exports only; functions ≤40 lines; async/await; Zod validation.
- No new root deps; HTTP via fetch; env VIBE_CHECK_HTTP_URL.

### Integration Points
- MCP Tools: vibe_check, update/reset/check_constitution (external server).
- A2A Events: reuse existing tool execution started/completed.

---

## Architecture & Design
- Thin client wrapper under apps/cortex-os/src/mcp/clients/; guard under src/operational/; orchestration wrapper in services.ts (soft-enforce).