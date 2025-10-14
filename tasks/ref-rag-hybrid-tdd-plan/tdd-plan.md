# TDD Plan: REF-RAG Hybrid Context System

**Task ID**: `ref-rag-hybrid-tdd-plan`  
**Created**: 2025-10-12  
**Status**: Draft  
**Estimated Effort**: 3-4 days  
**PRP Integration**: G0-G7 gates this task supports

---

## Task Summary

Implement REF-RAG hybrid context system with tri-band architecture for enhanced retrieval precision while maintaining backward compatibility and full observability through structured testing approach.

---

## PRP Gate Alignment

### Enforcement Profile Reference
- **Source**: Default brAInwav Profile
- **Coverage Targets**: From PRP G2 (Test Plan gate)
  - Lines: 95%
  - Branches: 90%
  - Functions: 95%
  - Statements: 95%
- **Security**: brAInwav Zero-Tolerance Policy
  - Critical: 0
  - High: 0
  - Medium: ≤5

### Gate Cross-References
- **G2 (Test Plan)**: This document fulfills test planning requirements
- **G4 (Verification)**: Quality gates defined below align with G4 validation
- **Evidence Trail**: All artifacts linked in `.cortex/evidence-index.json`

---

## Scope & Goals

### In Scope
- ✅ Tri-band context system (Bands A/B/C)
- ✅ Risk-based query classification
- ✅ Budget management and allocation
- ✅ Fact extraction for structured data
- ✅ Verification and escalation loop
- ✅ brAInwav branding in all outputs and error messages
- ✅ Coverage targets per enforcement profile

### Out of Scope
- ❌ Real-time inference optimization
- ❌ Advanced RL-based relevance scoring
- ❌ Cross-document relationship modeling

### Success Criteria
1. All tests pass (100% green)
2. Quality gates pass: `pnpm lint && pnpm test && pnpm security:scan`
3. Coverage meets/exceeds 95% targets
4. Performance budgets satisfied
5. Security scan clean
6. No mock/placeholder code in production paths
7. brAInwav branding consistently applied

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: All tests MUST be written and failing BEFORE implementation begins.

### Phase 1: Unit Tests (Write First)

#### Test Suite 1: Query Guard
**File**: `packages/rag/__tests__/ref-rag/query-guard.test.ts`

**Test Cases**:

1. **Test**: `should classify code queries as precision risk`
   - **Given**: Query containing code patterns (`function`, `class`, backticks)
   - **When**: `classifyRisk()` called with code query
   - **Then**: Returns `riskClass: 'precision'` with appropriate expansion hints
   - **Coverage Target**: `classifyRisk`, `detectCodePatterns`

2. **Test**: `should identify numerical data queries as precision risk`
   - **Given**: Query with numbers, units, percentages
   - **When**: Risk classification performed
   - **Then**: Returns `riskClass: 'precision'` with numerical expansion hints

3. **Test**: `should classify safety queries with appropriate restrictions`
   - **Given**: Query with safety-related keywords
   - **When**: Risk assessment executed
   - **Then**: Returns `riskClass: 'safety'` with restrictive requirements

4. **Test**: `should handle general queries with default classification`
   - **Given**: Simple conversational query
   - **When**: Classification performed
   - **Then**: Returns `riskClass: 'general'` with basic requirements

#### Test Suite 2: Relevance Policy
**File**: `packages/rag/__tests__/ref-rag/relevance-policy.test.ts`

**Test Cases**:

1. **Test**: `should apply duplication penalties to similar chunks`
   - **Given**: Chunks with overlapping text content
   - **When**: `scoreRelevance()` executed
   - **Then**: Similar chunks receive penalty adjustments

2. **Test**: `should boost domain-specific content based on risk class`
   - **Given**: Code chunks for precision queries
   - **When**: Scoring applied with risk class context
   - **Then**: Code content receives appropriate boost

3. **Test**: `should maintain deterministic sorting with stable tie-breaking`
   - **Given**: Multiple chunks with identical scores
   - **When**: Scoring and sorting performed multiple times
   - **Then**: Consistent ordering maintained across runs

#### Test Suite 3: Expansion Planner
**File**: `packages/rag/__tests__/ref-rag/expansion-planner.test.ts`

**Test Cases**:

1. **Test**: `should allocate chunks within budget constraints`
   - **Given**: Budget limits for each band
   - **When**: Allocation performed with excess chunks
   - **Then**: Respects budget limits and prioritizes appropriately

2. **Test**: `should enforce per-document diversity limits`
   - **Given**: Multiple chunks from same document
   - **When**: Allocation executed with diversity constraints
   - **Then**: Limits chunks per document as configured

3. **Test**: `should handle mandatory expansions correctly`
   - **Given**: High-priority chunks marked as mandatory
   - **When**: Allocation performed
   - **Then**: Mandatory chunks always included in Band A

#### Test Suite 4: Fact Extractor
**File**: `packages/rag/__tests__/ref-rag/fact-extractor.test.ts`

**Test Cases**:

1. **Test**: `should extract numerical data with units`
   - **Given**: Text with currency, percentages, measurements
   - **When**: `extractFacts()` executed
   - **Then**: Returns structured facts with proper typing

2. **Test**: `should identify and extract quoted content`
   - **Given**: Text with quoted strings and attributions
   - **When**: Fact extraction performed
   - **Then**: Quotes extracted with source attribution

3. **Test**: `should prevent PII leakage in extracted facts`
   - **Given**: Text containing potential PII data
   - **When**: Extraction with PII filtering
   - **Then**: PII data excluded from structured facts

#### Test Suite 5: Pack Builder
**File**: `packages/rag/__tests__/ref-rag/pack-builder.test.ts`

**Test Cases**:

1. **Test**: `should format Band A with proper citations`
   - **Given**: Allocated chunks with source information
   - **When**: `buildHybridPack()` executed
   - **Then**: Band A text includes `[1]`, `[2]` citation markers

2. **Test**: `should compress Band B vectors efficiently`
   - **Given**: High-dimensional embedding vectors
   - **When**: Pack building with compression
   - **Then**: Band B vectors compressed within size limits

3. **Test**: `should assemble Band C structured tables`
   - **Given**: Extracted facts and metadata
   - **When**: Pack assembly performed
   - **Then**: Band C contains well-formed table structures

### Phase 2: Integration Tests (Write First)

#### Integration Test 1: Full Pipeline Flow
**File**: `packages/rag/__tests__/ref-rag/pipeline.integration.test.ts`

**Scenario**: End-to-end REF-RAG processing with synthetic data

**Test Cases**:

1. **Test**: `should process precision query through complete pipeline`
   - **Setup**: Mock retrieval with synthetic chunks
   - **Given**: Precision query with code content
   - **When**: Full pipeline execution
   - **Then**: Returns tri-band pack with appropriate allocation

2. **Test**: `should trigger escalation loop on verification failure`
   - **Setup**: Mock verification failure conditions
   - **Given**: Query requiring escalation
   - **When**: Pipeline execution with verification enabled
   - **Then**: Escalation triggered, Band B promoted to Band A

#### Integration Test 2: Model Gateway Band Routing
**File**: `packages/model-gateway/tests/chat-handler-bands.test.ts`

**Test Cases**:

1. **Test**: `should accept and route tri-band chat payloads`
   - **Setup**: Mock MLX adapter
   - **Given**: Chat request with band payloads
   - **When**: Request processed through gateway
   - **Then**: Bands properly forwarded to adapter

### Phase 3: Security Tests

**File**: `packages/rag/__tests__/ref-rag/security.test.ts`

**Test Cases**:

1. **Test**: `should sanitize inputs to prevent injection attacks`
2. **Test**: `should not expose sensitive data in error messages`
3. **Test**: `should validate all configuration inputs`

---

## Implementation Checklist

> **Order**: Follow this sequence strictly. Each checkbox should be marked when complete.
> **TDD Rule**: Tests are written and RED before implementation begins.

### Phase 0: Setup & Scaffolding

- [ ] Create REF-RAG directory structure
  - [ ] `packages/rag/src/ref-rag/` directory
  - [ ] `packages/rag/__tests__/ref-rag/` directory
  - [ ] Test fixtures and mocks directory

- [ ] Set up test configuration
  - [ ] Vitest config for new test suites
  - [ ] Coverage reporting configured for ref-rag modules

### Phase 1: Write Failing Tests (RED)

- [ ] **Query Guard Tests**
  - [ ] Code pattern classification - Status: ❌ RED
  - [ ] Numerical data detection - Status: ❌ RED
  - [ ] Safety query handling - Status: ❌ RED
  - [ ] General query defaults - Status: ❌ RED

- [ ] **Relevance Policy Tests**
  - [ ] Duplication penalty tests - Status: ❌ RED
  - [ ] Domain boost tests - Status: ❌ RED
  - [ ] Deterministic sorting tests - Status: ❌ RED

- [ ] **Expansion Planner Tests**
  - [ ] Budget constraint tests - Status: ❌ RED
  - [ ] Diversity enforcement tests - Status: ❌ RED
  - [ ] Mandatory expansion tests - Status: ❌ RED

- [ ] **Fact Extractor Tests**
  - [ ] Numerical extraction tests - Status: ❌ RED
  - [ ] Quote extraction tests - Status: ❌ RED
  - [ ] PII filtering tests - Status: ❌ RED

- [ ] **Pack Builder Tests**
  - [ ] Citation formatting tests - Status: ❌ RED
  - [ ] Vector compression tests - Status: ❌ RED
  - [ ] Table assembly tests - Status: ❌ RED

- [ ] **Integration Tests**
  - [ ] Pipeline integration tests - Status: ❌ RED
  - [ ] Gateway routing tests - Status: ❌ RED

- [ ] Run test suite - verify ALL tests are RED (failing)

### Phase 2: Minimal Implementation (GREEN)

> **Goal**: Write minimal code to make tests pass. Don't optimize yet.

- [ ] **Core Types & Interfaces**
  - [ ] Define `RefRagConfig`, `BandContext`, `RiskClass` types
  - [ ] Create Zod schemas for input validation
  - [ ] Export from ref-rag index

- [ ] **Query Guard Implementation**
  - [ ] Implement `classifyRisk()` function (≤40 lines)
  - [ ] Add pattern detection utilities
  - [ ] Run guard tests - verify GREEN for this module

- [ ] **Relevance Policy Implementation**
  - [ ] Implement `scoreRelevance()` function (≤40 lines)
  - [ ] Add scoring utilities and penalties
  - [ ] Run policy tests - verify GREEN

- [ ] **Expansion Planner Implementation**
  - [ ] Implement budget allocation logic (≤40 lines)
  - [ ] Add diversity enforcement
  - [ ] Run planner tests - verify GREEN

- [ ] **Fact Extractor Implementation**
  - [ ] Implement regex-based extraction (≤40 lines)
  - [ ] Add PII filtering
  - [ ] Run extractor tests - verify GREEN

- [ ] **Pack Builder Implementation**
  - [ ] Implement pack assembly logic (≤40 lines)
  - [ ] Add citation formatting
  - [ ] Run builder tests - verify GREEN

- [ ] **Pipeline Orchestrator**
  - [ ] Implement end-to-end coordinator (≤40 lines)
  - [ ] Add verification and escalation
  - [ ] Run all tests - verify ALL GREEN

### Phase 3: Refactor (REFACTOR while keeping GREEN)

- [ ] **Code Quality Improvements**
  - [ ] Extract duplicated logic into shared utilities
  - [ ] Ensure all functions are ≤40 lines
  - [ ] Add JSDoc comments for public APIs
  - [ ] Verify named exports only

- [ ] **Performance Optimization**
  - [ ] Add caching where appropriate
  - [ ] Optimize scoring algorithms
  - [ ] Run performance tests

- [ ] Run full test suite - verify ALL still GREEN after refactoring

### Phase 4: Integration & Documentation

- [ ] **Gateway Integration**
  - [ ] Update chat schema in model-gateway
  - [ ] Update MLX adapter for band forwarding
  - [ ] Test contract compatibility

- [ ] **Documentation**
  - [ ] Update package README.md with REF-RAG usage
  - [ ] Add inline code comments
  - [ ] Create examples in documentation

### Phase 5: Quality Gates

- [ ] **Linting & Formatting**
  - [ ] Run `pnpm biome:staged` - verify pass
  - [ ] Run `pnpm lint:smart` - verify pass

- [ ] **Type Checking**
  - [ ] Run `pnpm typecheck:smart` - verify pass

- [ ] **Testing**
  - [ ] Run `pnpm test:smart` - verify 100% pass
  - [ ] Run coverage check - verify ≥95% coverage
  - [ ] All tests GREEN

- [ ] **Security**
  - [ ] Run `pnpm security:scan` - verify zero high findings
  - [ ] Fix any security issues

---

## Risk Mitigation

| Risk | Mitigation Strategy | Status |
|------|-------------------|--------|
| Test flakiness | Use deterministic seeds, avoid time-based tests | Planned |
| Performance regression | Monitor token budgets in tests | Planned |
| Schema incompatibility | Comprehensive contract testing | Planned |

---

## Monitoring & Observability

### Metrics to Track
- **Test Coverage**: Line and branch coverage for ref-rag modules
- **Performance**: Token budget compliance in test scenarios
- **Quality**: Lint and type check success rates

### Test Artifacts
- Coverage reports in `tasks/ref-rag-hybrid-tdd-plan/verification/`
- Test logs in `tasks/ref-rag-hybrid-tdd-plan/test-logs/`

---

**Implementation Started**: Not Started  
**Implementation Completed**: In Progress  
**Tests All Green**: No  
**Quality Gates Passed**: No

Co-authored-by: brAInwav Development Team