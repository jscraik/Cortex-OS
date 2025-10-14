# Implementation Checklist: REF-RAG Hybrid Context System

**Task ID**: `ref-rag-hybrid-tdd-plan`  
**Created**: 2025-10-12  
**Owner**: Development Team  

---

## Phase 0: Setup & Scaffolding

- [ ] **Create REF-RAG directory structure**
  - [ ] Create `packages/rag/src/ref-rag/` directory
  - [ ] Create `packages/rag/__tests__/ref-rag/` directory
  - [ ] Set up test fixtures and mocks directory
  - [ ] Update package.json exports if needed

- [ ] **Configure testing infrastructure**
  - [ ] Verify Vitest config includes ref-rag modules
  - [ ] Set up coverage reporting for new modules
  - [ ] Configure test file patterns

---

## Phase 1: TDD - Write Failing Tests First (RED)

### Core Module Tests

- [ ] **Task 1: Query Guard Tests** (`query-guard.test.ts`)
  - [ ] Test: Code pattern classification → Status: ❌ RED
  - [ ] Test: Numerical data detection → Status: ❌ RED  
  - [ ] Test: Safety query handling → Status: ❌ RED
  - [ ] Test: General query defaults → Status: ❌ RED
  - [ ] Verify all tests fail with missing implementation

- [ ] **Task 2: Relevance Policy Tests** (`relevance-policy.test.ts`)
  - [ ] Test: Duplication penalty application → Status: ❌ RED
  - [ ] Test: Domain-specific boost factors → Status: ❌ RED
  - [ ] Test: Deterministic sorting stability → Status: ❌ RED
  - [ ] Test: Score normalization → Status: ❌ RED

- [ ] **Task 3: Expansion Planner Tests** (`expansion-planner.test.ts`)
  - [ ] Test: Budget constraint enforcement → Status: ❌ RED
  - [ ] Test: Per-document diversity limits → Status: ❌ RED
  - [ ] Test: Mandatory expansion handling → Status: ❌ RED
  - [ ] Test: Band overflow allocation → Status: ❌ RED

- [ ] **Task 4: Fact Extractor Tests** (`fact-extractor.test.ts`)
  - [ ] Test: Numerical data extraction → Status: ❌ RED
  - [ ] Test: Quote extraction with attribution → Status: ❌ RED
  - [ ] Test: Code span detection → Status: ❌ RED
  - [ ] Test: PII filtering prevention → Status: ❌ RED

- [ ] **Task 5: Pack Builder Tests** (`pack-builder.test.ts`)
  - [ ] Test: Band A citation formatting → Status: ❌ RED
  - [ ] Test: Band B vector compression → Status: ❌ RED
  - [ ] Test: Band C structured table assembly → Status: ❌ RED
  - [ ] Test: Metadata generation → Status: ❌ RED

### Integration Tests

- [ ] **Task 6: Pipeline Integration Tests** (`pipeline.integration.test.ts`)
  - [ ] Test: End-to-end precision query processing → Status: ❌ RED
  - [ ] Test: Escalation loop triggering → Status: ❌ RED
  - [ ] Test: Budget compliance across pipeline → Status: ❌ RED
  - [ ] Test: Error handling and graceful degradation → Status: ❌ RED

### Gateway Integration Tests

- [ ] **Task 7: Model Gateway Band Tests**
  - [ ] Update `chat-handler.test.ts` with band payload tests → Status: ❌ RED
  - [ ] Update `chat.spec.ts` with tri-band scenarios → Status: ❌ RED
  - [ ] Add MLX adapter band forwarding tests → Status: ❌ RED

- [ ] **Verify All Tests RED**
  - [ ] Run `pnpm test packages/rag -- --testPathPattern=ref-rag`
  - [ ] Confirm ALL new tests are failing
  - [ ] Get stakeholder approval on test scenarios

---

## Phase 2: Implementation (GREEN)

### Core Type Definitions

- [ ] **Task 1: Define REF-RAG Types**
  - [ ] Create `packages/rag/src/ref-rag/types.ts`
  - [ ] Implement `RefRagConfig`, `BandContext`, `RiskClass` interfaces
  - [ ] Add `HybridContextPack`, `StructuredFact` types
  - [ ] Create Zod validation schemas
  - [ ] Export types from `ref-rag/index.ts`

- [ ] **Task 2: Extend Core Library Types**
  - [ ] Update `packages/rag/src/lib/types.ts`
  - [ ] Extend `Chunk` interface with `metadata.refRag` field
  - [ ] Add budget and verification configuration types

### Implementation Modules

- [ ] **Task 3: Implement Query Guard**
  - [ ] Create `packages/rag/src/ref-rag/query-guard.ts`
  - [ ] Implement `classifyRisk()` function (≤40 lines)
  - [ ] Add pattern detection utilities
  - [ ] Test: Run query guard tests → Status: ✅ GREEN

- [ ] **Task 4: Implement Relevance Policy**
  - [ ] Create `packages/rag/src/ref-rag/relevance-policy.ts`
  - [ ] Implement `scoreRelevance()` function (≤40 lines)
  - [ ] Add scoring utilities and penalty calculations
  - [ ] Test: Run relevance policy tests → Status: ✅ GREEN

- [ ] **Task 5: Implement Budget System**
  - [ ] Create `packages/rag/src/ref-rag/budgets.ts`
  - [ ] Define budget presets per risk class
  - [ ] Add environment variable overrides
  - [ ] Test: Verify budget allocation tests → Status: ✅ GREEN

- [ ] **Task 6: Implement Expansion Planner**
  - [ ] Create `packages/rag/src/ref-rag/expansion-planner.ts`
  - [ ] Implement allocation algorithm (≤40 lines)
  - [ ] Add diversity enforcement logic
  - [ ] Test: Run expansion planner tests → Status: ✅ GREEN

- [ ] **Task 7: Implement Fact Extractor**
  - [ ] Create `packages/rag/src/ref-rag/fact-extractor.ts`
  - [ ] Implement regex-based extraction (≤40 lines)
  - [ ] Add PII filtering safeguards
  - [ ] Test: Run fact extractor tests → Status: ✅ GREEN

- [ ] **Task 8: Implement Pack Builder**
  - [ ] Create `packages/rag/src/ref-rag/pack-builder.ts`
  - [ ] Implement pack assembly logic (≤40 lines)
  - [ ] Add citation formatting and compression
  - [ ] Test: Run pack builder tests → Status: ✅ GREEN

- [ ] **Task 9: Implement Verification System**
  - [ ] Create `packages/rag/src/ref-rag/verification.ts`
  - [ ] Implement post-answer verification (≤40 lines)
  - [ ] Add escalation loop logic
  - [ ] Test: Run verification tests → Status: ✅ GREEN

- [ ] **Task 10: Implement Pipeline Orchestrator**
  - [ ] Create `packages/rag/src/ref-rag/pipeline.ts`
  - [ ] Implement end-to-end coordinator (≤40 lines)
  - [ ] Add configuration validation and error handling
  - [ ] Test: Run pipeline integration tests → Status: ✅ GREEN

### Gateway Integration

- [ ] **Task 11: Update Model Gateway Schema**
  - [ ] Update `packages/model-gateway/src/server.ts`
  - [ ] Extend `ChatBodySchema` with band fields
  - [ ] Add audit logging for band metadata
  - [ ] Test: Run updated chat handler tests → Status: ✅ GREEN

- [ ] **Task 12: Update MLX Adapter**
  - [ ] Update `packages/model-gateway/src/adapters/mlx-adapter.ts`
  - [ ] Add band serialization and CLI arg passing
  - [ ] Implement graceful fallback for unsupported bands
  - [ ] Test: Run MLX adapter tests → Status: ✅ GREEN

### Python Integration

- [ ] **Task 13: Update MLX Python Runner**
  - [ ] Update `apps/cortex-py/src/mlx/mlx_unified.py`
  - [ ] Add CLI argument parsing for band files
  - [ ] Implement band processing and prompt integration
  - [ ] Test: Run Python band processing tests → Status: ✅ GREEN

### Main Package Integration

- [ ] **Task 14: Update RAG Package Exports**
  - [ ] Update `packages/rag/src/index.ts`
  - [ ] Export REF-RAG pipeline and configuration types
  - [ ] Update generation layer with band support
  - [ ] Test: Verify package exports and compatibility

- [ ] **Verify All Tests GREEN**
  - [ ] Run complete test suite: `pnpm test:smart`
  - [ ] Confirm 100% GREEN status
  - [ ] Validate coverage targets ≥95%

---

## Phase 3: Code Quality & Refactoring (REFACTOR)

- [ ] **Code Quality Improvements**
  - [ ] Extract duplicated logic into shared utilities
  - [ ] Ensure all functions are ≤40 lines
  - [ ] Simplify complex conditionals with guard clauses
  - [ ] Add comprehensive JSDoc comments for public APIs
  - [ ] Verify named exports only (no default exports)

- [ ] **Performance Optimization**
  - [ ] Add caching for expensive operations (scoring, extraction)
  - [ ] Optimize vector compression algorithms
  - [ ] Reduce unnecessary object allocations
  - [ ] Validate performance budgets in tests

- [ ] **Error Handling Standardization**
  - [ ] Standardize error messages with brAInwav branding
  - [ ] Add structured error objects with codes
  - [ ] Improve error recovery logic throughout pipeline

- [ ] **Final Test Validation**
  - [ ] Run full test suite after refactoring
  - [ ] Verify ALL tests remain GREEN
  - [ ] Confirm coverage targets maintained

---

## Phase 4: Documentation & Integration

- [ ] **Package Documentation**
  - [ ] Update `packages/rag/README.md`
    - [ ] Add REF-RAG overview and benefits
    - [ ] Include configuration examples
    - [ ] Document usage patterns and best practices
    - [ ] Add brAInwav branding
  - [ ] Create `packages/rag/docs/ref-rag.md`
    - [ ] Architecture overview with tri-band explanation
    - [ ] Budget configuration guide
    - [ ] Troubleshooting guide
  - [ ] Update `packages/model-gateway/README.md`
    - [ ] Document new chat payload fields
    - [ ] Include band forwarding examples

- [ ] **API Documentation**
  - [ ] Add inline JSDoc comments for all public APIs
  - [ ] Include usage examples in documentation
  - [ ] Document configuration schema and validation

- [ ] **Integration Documentation**
  - [ ] Update deployment guides with new environment variables
  - [ ] Create migration guide for existing deployments
  - [ ] Document rollout strategy and feature flags

---

## Phase 5: Quality Gates & Validation

- [ ] **Linting & Formatting**
  - [ ] Run `pnpm biome:staged` → Verify: ✅ PASS
  - [ ] Run `pnpm lint:smart` → Verify: ✅ PASS
  - [ ] Fix any linting violations

- [ ] **Type Checking**
  - [ ] Run `pnpm typecheck:smart` → Verify: ✅ PASS
  - [ ] Fix any type errors
  - [ ] Ensure strict TypeScript compliance

- [ ] **Testing Validation**
  - [ ] Run `pnpm test:smart` → Verify: ✅ 100% PASS
  - [ ] Run coverage analysis → Verify: ✅ ≥95% coverage
  - [ ] Validate performance test compliance
  - [ ] All tests consistently GREEN

- [ ] **Security Validation**
  - [ ] Run `pnpm security:scan` → Verify: ✅ Zero high findings
  - [ ] Run Semgrep security scan → Verify: ✅ Clean
  - [ ] Validate PII filtering in fact extraction
  - [ ] Fix any security issues

- [ ] **Structure & Standards**
  - [ ] Verify Constitution compliance (≤40 line functions)
  - [ ] Confirm brAInwav branding throughout
  - [ ] Validate conventional commit format
  - [ ] Ensure no mock/placeholder code in production

---

## Phase 6: Deployment Preparation

- [ ] **Configuration Management**
  - [ ] Document new environment variables
  - [ ] Set up feature flag defaults (REF-RAG off by default)
  - [ ] Prepare configuration examples for different environments

- [ ] **Rollout Planning**
  - [ ] Create staged rollout plan (shadow mode → high-precision → general)
  - [ ] Define rollback procedures
  - [ ] Set up monitoring and alerting thresholds

- [ ] **Final Integration Testing**
  - [ ] Run end-to-end integration tests
  - [ ] Validate backward compatibility
  - [ ] Test feature flag toggling

---

## Completion Verification

- [ ] **Code Merged Successfully**
  - [ ] All PRs merged to main branch
  - [ ] CI/CD pipeline passes completely
  - [ ] No merge conflicts or regressions

- [ ] **Quality Standards Met**
  - [ ] Test coverage ≥95% achieved and maintained
  - [ ] All quality gates passing in CI
  - [ ] Security scans clean
  - [ ] Performance budgets satisfied

- [ ] **Documentation Complete**
  - [ ] All README files updated
  - [ ] API documentation comprehensive
  - [ ] Migration guides available
  - [ ] Examples provided

- [ ] **Rollout Ready**
  - [ ] Feature flags configured
  - [ ] Monitoring dashboards updated
  - [ ] Rollback procedures documented
  - [ ] Team training completed

---

**Status**: ⏳ Not Started  
**All Tasks Complete**: ❌ No  
**Quality Gates Passed**: ❌ No  
**Ready for Rollout**: ❌ No

**Last Updated**: 2025-10-12  
Co-authored-by: brAInwav Development Team