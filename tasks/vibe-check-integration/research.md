# Research Document: Vibe Check MCP Oversight Integration

**Task ID**: `vibe-check-integration`  
**Created**: 2025-10-11  
**Researcher**: AI Agent  
**Status**: Complete

---

## Objective
Evaluate integrating PV-Bhat/vibe-check-mcp-server into brAInwav Cortex-OS to provide CPI-based oversight and enforce reflection gates.

---

## Current State Observations
### Existing Implementation
- Location: apps/cortex-os/src/services.ts (orchestration.run), src/mcp/gateway.ts, src/mcp/server.ts
- Current Approach: MCP gateway + HTTP surface; no pre-action CPI reflection.
- Limitations: Lacks enforced reflection and constitution policy.

### Related Components
- Observability bus, A2A publishers (runtime.ts)
- Run bundle recorder (run-bundle/*)

### brAInwav-Specific Context
- MCP-first design; branding mandates; governance gates.

---

## External Standards & References
- Vibe Check MCP README (v2.7.0): tools and installers.
- CPI research links (ResearchGate DOI).

---

## Technology Research
### Option 1: External HTTP client + guard (Selected)
Pros: Low coupling, fast to adopt; Cons: external availability risk.
Compatibility: High; aligns with MCP/A2A.

### Option 2: Embed as subpackage
Pros: Tighter control; Cons: increases deps/maintenance.
Compatibility: Medium.

---

## Recommended Approach
Selected: Option 1. Rationale: minimal change, aligns with governance, easy rollback.

---

## Constraints & Considerations
- Local-first; zero exfil configuration; named exports; ≤40-line functions; branding in logs.

## Open Questions
- Strict enforcement policy thresholds? (to be defined post-pilot)

## POC Findings
- Unit test with mock server demonstrates guard + constitution calls.