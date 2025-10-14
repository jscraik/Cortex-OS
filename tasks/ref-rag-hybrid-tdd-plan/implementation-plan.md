# Implementation Plan: REF-RAG Hybrid Context System

**Task ID**: `ref-rag-hybrid-tdd-plan`  
**Created**: 2025-10-12  
**Status**: Draft  
**Coverage Target**: ≥95%

---

## 1) File Tree of Proposed Changes

```
packages/rag/
├─ src/ref-rag/
│  ├─ index.ts                         NEW – export helpers & config defaults
│  ├─ types.ts                         NEW – tri-band context, risk, and trace types
│  ├─ budgets.ts                       NEW – risk-class budget presets & overrides
│  ├─ query-guard.ts                   NEW – classify risk & mandatory expansion hints
│  ├─ relevance-policy.ts              NEW – hybrid scoring with heuristic fallbacks
│  ├─ expansion-planner.ts             NEW – allocate chunks across Bands A/B/C
│  ├─ fact-extractor.ts                NEW – numbers/quotes/code detectors for Band C
│  ├─ pack-builder.ts                  NEW – assemble tri-band context payload + citations
│  ├─ verification.ts                  NEW – self-check/escalation orchestration
│  └─ pipeline.ts                      NEW – end-to-end REF‑RAG controller
├─ __tests__/ref-rag/
│  ├─ query-guard.test.ts              NEW – risk classification coverage
│  ├─ relevance-policy.test.ts         NEW – scoring heuristics & penalties
│  ├─ expansion-planner.test.ts        NEW – band allocation edge cases
│  └─ pipeline.integration.test.ts     NEW – happy-path & escalation loop
packages/model-gateway/src/
├─ server.ts                           UPDATE – chat schema + logging for bands
├─ model-router.ts                     UPDATE – propagate hybrid chat request
└─ adapters/mlx-adapter.ts             UPDATE – forward bands to Python runner
apps/cortex-py/src/mlx/
└─ mlx_unified.py                      UPDATE – accept tri-band inputs & expand on demand
```

## 2) Implementation Plan (Atomic Tasks)

### Task 1 — Define REF‑RAG Types & Config Surface
**Goal**: Establish foundational types and configuration schema for tri-band context system  
**Files to touch**: `packages/rag/src/ref-rag/types.ts`, `packages/rag/src/lib/types.ts`

**Implementation Aids**:
```typescript
// packages/rag/src/ref-rag/types.ts (NEW FILE)
export interface RefRagConfig {
  enableRefRag: boolean;
  budgets: BandBudgets;
  verification: VerificationConfig;
}

export interface BandContext {
  bandA: { text: string; citations: Citation[] };
  bandB: { vectors: Float32Array; metadata: VectorMetadata };
  bandC: { facts: StructuredFact[]; tables: TableData[] };
}

export type RiskClass = 'precision' | 'code' | 'safety' | 'general';
```

**Run & verify**: `pnpm test packages/rag -- --coverage ref-rag/types`  
**Commit**: `feat(rag): add REF-RAG core types and configuration schema`

### Task 2 — Implement Query Guard & Risk Classification  
**Goal**: Build heuristic-based query classifier for risk assessment and expansion hints

**Implementation Aids**:
```typescript
// packages/rag/src/ref-rag/query-guard.ts (NEW FILE)
export function classifyRisk(query: string): {
  riskClass: RiskClass;
  hardRequirements: string[];
  expansionHints: ExpansionHint[];
} {
  const codePatterns = /```|function|class|import|const\s+/;
  const numericPatterns = /\d+\.?\d*\s*(ms|MB|%|dollars?)/;
  // ... heuristic logic
}
```

**Commit**: `feat(rag): implement query risk classification with heuristics`

### Task 3 — Build Relevance Policy & Scoring Engine
**Goal**: Implement hybrid scoring combining similarity, duplication penalties, and domain bonuses

### Task 4 — Create Expansion Planner & Budget Management
**Goal**: Allocate retrieved chunks across Bands A/B/C while enforcing budget constraints

### Task 5 — Build Fact Extractor for Structured Data
**Goal**: Extract numbers, quotes, code spans, and citations from text for Band C

### Task 6 — Implement Pack Builder & Citation Assembly  
**Goal**: Assemble tri-band context payload with proper citation headers and metadata

### Task 7 — Add Verification & Escalation Loop
**Goal**: Post-answer verification with automatic escalation on quality issues

### Task 8 — Build REF-RAG Pipeline Orchestrator
**Goal**: End-to-end pipeline coordinating all REF-RAG components

### Task 9 — Extend Model Gateway Schema & Routing
**Goal**: Extend model gateway to accept and route tri-band chat payloads

### Task 10 — Update Python MLX Runner for Band Processing
**Goal**: Accept tri-band inputs in Python and integrate with MLX inference

## 3) Technical Rationale

**Modular Architecture**: Housing REF-RAG logic under `src/ref-rag/` maintains strict separation from legacy RAG pipeline, enabling incremental adoption and reduced blast radius during rollout.

**Tri-Band Design**: Separating text (Band A), compressed vectors (Band B), and structured facts (Band C) optimizes for different data types and consumption patterns.

**Budget Management**: Risk-class-specific budget presets ensure consistent token usage while allowing runtime overrides.

## 4) Risks & Mitigations

| Risk | Mitigation | Verification |
|------|------------|--------------|
| **Virtual token incompatibility** | Graceful fallback omitting Band B when backend rejects payload | Unit tests with mock rejections |
| **Performance degradation** | Budget enforcement + metrics tracking + feature flag controls | Performance tests with token count assertions |
| **Schema drift** | Zod validation + API versioning + comprehensive contract tests | Schema validation tests |

## 5) Testing Strategy

**TypeScript Testing (Vitest)**:
- Unit tests for each ref-rag module with edge cases
- Integration tests covering full pipeline with synthetic data
- Gateway tests for schema validation and routing

**Python Testing (Pytest)**:
- CLI argument parsing and band processing tests
- Integration tests with MLX runner

## 6) Completion Criteria

- [ ] REF-RAG pipeline merged with feature flag defaulted off
- [ ] All tests passing with ≥95% line coverage on changed files
- [ ] No lint, type, or security errors in CI pipeline
- [ ] Documentation updated with REF-RAG overview and usage
- [ ] Feature flag rollout plan documented

---

**Implementation Ready**: Tasks defined with atomic scope and clear verification criteria  
**Conventional Commits**: All commits follow conventional format  
**Coverage Target**: ≥95% for all new code