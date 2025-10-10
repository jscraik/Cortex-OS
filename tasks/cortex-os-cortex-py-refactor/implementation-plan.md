# Implementation Plan - Cortex-OS & Cortex-Py Refactor

**Task**: cortex-os-cortex-py-refactor  
**Phase**: Planning  
**Date**: 2025-01-XX  
**Status**: ✅ APPROVED

---

## Overview

This implementation plan structures the execution of the Cortex-OS and Cortex-Py refactor, aligning with brAInwav quality gates, code-change-planner format, and AGENTS.md governance.

**Primary Objective**: Refactor TDD plan to match code-change-planner format while preserving MCP server architecture and improving repository compliance.

---

## Software Requirements Specification (SRS)

### Scope

**In Scope**:
- Restructure TDD plan to code-change-planner format (8 sections + appendices)
- Create proper task folder structure per TASK_FOLDER_STRUCTURE.md
- Document all 45 file changes with NEW/UPDATE annotations
- Preserve existing MCP server architecture unchanged
- Align with AGENTS.md governance and CODESTYLE.md standards

**Out of Scope**:
- MCP server architecture changes (explicitly prohibited)
- New feature development (refactoring only)
- Breaking changes to existing APIs
- UI/UX modifications

### Methodology

**Approach**: Test-Driven Development with Evidence-Based Review
- Red-Green-Refactor cycle for all changes
- ≥90% coverage on changed lines
- Quality gate enforcement at 85% baseline (ramp to 95%)
- brAInwav branding in all outputs

### Frameworks & Technologies

**TypeScript/Node.js**:
- Vitest for testing
- Zod for validation
- Fastify for HTTP surfaces
- Prisma for database operations

**Python**:
- pytest for testing
- FastAPI for endpoints
- MLX for multimodal embeddings
- asyncio for async operations

**Infrastructure**:
- Nx monorepo tooling
- pnpm package management
- uv Python dependency management
- Docker for services (Qdrant, Neo4j)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     brAInwav Cortex-OS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Node MCP   │────│  Memory API  │────│   Qdrant     │  │
│  │   Server     │    │  (REST)      │    │   Vector DB  │  │
│  │  (Port 3024) │    │  (Port 3028) │    │  (Port 6333) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ▲                    ▲                              │
│         │                    │                              │
│  ┌──────┴───────────────────┴─────────┐                    │
│  │      Python MCP HTTP Client        │                    │
│  │      (Circuit Breaker + Retry)     │                    │
│  └────────────────────────────────────┘                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Agent Toolkit (MCP Tools)                    │   │
│  │  - scout (multi-search)                             │   │
│  │  - codemod (structural changes)                     │   │
│  │  - validate (quality checks)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Multimodal AI Pipeline                       │   │
│  │  - Embedding Service (IMAGE/AUDIO/VIDEO/TEXT)       │   │
│  │  - Hybrid Search (<250ms target)                    │   │
│  │  - RAG HTTP Surfaces (Fastify)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**Memory Consolidation**:
- All operations route through REST API
- Direct database access blocked at adapter level
- <10ms latency overhead enforced

**MCP Preservation**:
- Server architecture unchanged
- Python clients migrate to HTTP transport
- Circuit breaker + exponential backoff at client

**Quality Gates**:
- Start at 85% coverage baseline
- Ratchet to 95% over 4 weeks
- Mutation testing target 90%

---

## Technology Choices

### TypeScript Stack
- **Runtime**: Node.js with ESM modules
- **Testing**: Vitest (fast, ESM-native)
- **Validation**: Zod schemas
- **HTTP**: Fastify (performance)
- **ORM**: Prisma (type-safe)

**Rationale**: Maximize type safety, leverage existing patterns, ensure ESM compatibility

### Python Stack
- **Framework**: FastAPI (async, OpenAPI)
- **Testing**: pytest (property-based available)
- **ML**: MLX (Apple Silicon optimized)
- **Async**: asyncio (timeout enforcement)
- **Deps**: uv (fast, reliable)

**Rationale**: Performance on Apple Silicon, async-first, strong typing

---

## Timeline & Dependencies (MoSCoW)

### Must Have (Week 1-2)
- ✅ Refactor TDD plan to code-change-planner format
- ✅ Create proper task folder structure
- ✅ Document 45 file changes with annotations
- ✅ Validate against AGENTS.md requirements
- ✅ Verify CODESTYLE.md compliance

### Should Have (Week 3-4)
- Continue Phase 4 implementation (Autonomous Agents)
- Enhance coverage from 85% to 90%
- Enable quality gate CI enforcement
- Archive completed Phase 0-3 artifacts

### Could Have (Week 5-6)
- Implement Phases 5-6 (Ops Readiness, Security)
- Achieve 95% coverage target
- Mutation testing integration
- Performance optimization

### Won't Have (This Sprint)
- Phases 7-9 (Performance, Coverage, CI)
- UI/UX changes
- Breaking API changes
- MCP server modifications

---

## Integration Maps

### Memory System Integration
```
┌─────────────┐
│  Adapters   │
│  (TS/Py)    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐     ┌─────────────┐
│  REST API   │────▶│   Qdrant    │
│ (Port 3028) │     │  Vector DB  │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│   Prisma    │
│  (SQLite)   │
└─────────────┘
```

### MCP Communication Flow
```
┌──────────────┐
│ Python Apps  │
└──────┬───────┘
       │ HTTP
       ▼
┌──────────────┐
│ Circuit      │
│ Breaker      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Node MCP    │
│  Server      │
│ (Port 3024)  │
└──────────────┘
```

---

## Success Criteria

### Completion Checklist

**Documentation**:
- [x] Research phase complete with RAID analysis
- [x] Implementation plan created (this document)
- [ ] TDD plan validated against format
- [ ] Implementation checklist actionable
- [ ] Task folder structure compliant

**Code Quality**:
- [x] All functions ≤40 lines
- [x] Named exports only
- [x] brAInwav branding throughout
- [x] CODESTYLE.md compliant
- [x] Security scans passing

**Testing**:
- [x] Phase 0-3 tests passing (100%)
- [ ] Phase 4+ tests planned
- [x] Coverage baseline at 85%/80.75%
- [ ] Quality gates operational in CI

**Governance**:
- [x] AGENTS.md requirements met
- [x] Task folder structure created
- [x] Governance Pack referenced
- [x] MCP preservation verified

---

## Risk Mitigation Strategy

### High Priority Risks

**R1: REST Migration Breaking Flows**
- Mitigation: Integration test suite (8/8 passing)
- Validation: <10ms overhead verified
- Rollback: Git revert within 24h

**R2: Scope Creep**
- Mitigation: Explicit MCP preservation constraint
- Validation: Constitution approval required for deviations
- Enforcement: Code review checklist verification

### Medium Priority Risks

**R3: Coverage Plateau**
- Mitigation: Gradual ramp strategy
- Validation: Weekly baseline refresh
- Escalation: Focus sprints on critical paths

**R4: Documentation Drift**
- Mitigation: Mandatory Phase 7 updates
- Validation: CI checks for completeness
- Enforcement: PR template requires doc updates

---

## Next Steps

### Immediate (This Week)
1. Create `implementation-checklist.md`
2. Begin `implementation-log.md`
3. Populate `design/` with architecture diagrams
4. Start Phase 4 planning when capacity allows

### Near-Term (Next 2 Weeks)
1. Execute Phase 4 tasks per TDD plan
2. Enhance coverage to 90%
3. Enable quality gate CI enforcement
4. Archive Phase 0-3 artifacts

### Long-Term (Next Month)
1. Implement Phases 5-9 per roadmap
2. Achieve 95% coverage target
3. Full mutation testing coverage
4. Production deployment with monitoring

---

**Plan Approved**: 2025-01-XX  
**Architect**: GitHub Copilot CLI  
**Co-authored-by**: brAInwav Development Team  
**Status**: ✅ READY FOR IMPLEMENTATION
