# TDD Plan: Vibe Check MCP Oversight Integration

**Task ID**: `vibe-check-integration`  
**Created**: 2025-10-11  
**Status**: In Progress  
**Estimated Effort**: 4-6 hours  
**PRP Integration**: G2/G4

---

## Task Summary
Implement HTTP client and guard to call external vibe_check before side-effects; enforce branding and evidence.

---

## Testing Strategy (Write Tests First!)

### Phase 1: Unit Tests
- File: apps/cortex-os/tests/vibe-check-guard.test.ts
  1) updates constitution when rules provided; returns low risk
  2) handles unknown tool with branded error (to add)

### Phase 2: Integration Tests
- Scenario: orchestration.run wrapper emits logs with "brAInwav-vibe-check" (to add)

### Phase 3: End-to-End (defer)

---

## Success Criteria
- All tests green; coverage ≥90% on new files; branding present in logs.
