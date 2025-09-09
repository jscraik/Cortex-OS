# Cortex CLI Task Management

## Current Sprint: Phase 2 - Core Features (v0.2.x)

### Active Tasks

#### ✅ COMPLETED

- [x] **Task 0.0**: Project setup and planning

  - [x] Copy codex-rs foundation
  - [x] Create software engineering plan
  - [x] Initialize git repository
  - [x] Create task management system

- [x] **Task 1.1**: Project Setup & Build System (TDD)

  - [x] Fix Rust edition compatibility issues
  - [x] Ensure all workspace members compile
  - [x] Rollback Point: `v0.1.0-foundation`

- [x] **Task 1.2**: Configuration System Integration (TDD) ✅ COMPLETED

  - [x] Write tests for profile-based configuration loading
  - [x] Write tests for configuration override parsing
  - [x] Write tests for environment variable support
  - [x] Write tests for configuration validation
  - [x] Implement comprehensive configuration system with TDD
  - [x] Add dot-notation override support
  - [x] **Result**: 11/11 tests passing, fully TDD-compliant configuration system

- [x] **Task 1.3**: Error Handling & Logging (TDD)
  - [x] Write tests for error propagation and formatting
  - [x] Write tests for structured logging output
  - [x] Implement comprehensive error types
  - [x] Add structured logging with tracing
  - [x] Verification: Error handling and logging tests pass
  - [x] Rollback Point: `v0.1.2-errors`

#### 🔄 IN PROGRESS (Phase 2 Continued)

- [x] **Task 2.1**: Chat CLI + Sessions + REPL (TDD)
  - [x] One-off chat streaming tests (mock SSE)
  - [x] Session JSONL and resume tests
  - [x] REPL loop and stdin `-` support
  - [x] README updated
  - [x] Verification: core/cli chat tests pass
  - [x] Rollback Point: `v0.1.2-chat`

#### 🔄 IN PROGRESS

- [ ] **Task 2.2a**: Provider Abstraction Scaffold (TDD)

  - [ ] Trait & registry definition tests
  - [ ] Minimal mock providers (OpenAI/Anthropic/Ollama placeholders)
  - [ ] Config-driven provider resolution tests
  - [ ] Auth header shaping tests (basic)
  - [ ] Rollback Point: `v0.2.1-provider-scaffold`

- [ ] **Task 2.2b**: Provider Switching & Aggregation Parity (TDD)
  - [ ] Model -> family -> provider resolution matrix tests
  - [ ] Aggregation adapter / aggregate stream parity tests (ported subset)
  - [ ] Extended auth & base URL shaping tests
  - [ ] Session meta propagation tests
  - [ ] Rollback Point: `v0.2.1-providers`

#### 📋 TODO - NEXT UP

- [ ] **Task 2.3**: Streaming Normalization & Controls (TDD)

  - [ ] Flag normalization tests (legacy -> canonical)
  - [ ] Conflict precedence tests (aggregate vs no-aggregate vs raw/json)
  - [ ] Mode selection tests (raw, aggregate, json, json-stream)
  - [ ] Provider dispatch integration tests
  - [ ] Rollback Point: `v0.2.2-streaming`

- [ ] **Task 2.5 (Proposed)**: Reasoning & Verbosity Controls (TDD)
  - [ ] Reasoning delta accumulation tests
  - [ ] Final reasoning block emission tests
  - [ ] Verbosity parameter shaping tests
  - [ ] Minimal reasoning pipeline stub
  - [ ] Rollback Point: `v0.2.5-reasoning`

### Task Details

#### Task 2.1: Basic Chat Interface

**Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Dependencies**: Foundation completed  
 **Target Tag**: `v0.1.2-chat`

**Test-First Approach**:

1. Write failing tests for chat message handling and history
2. Implement minimal TUI/CLI chat loop to pass tests
3. Add persistence tests and implement durable history

**Acceptance Criteria**:

- [x] Unit/integration tests for message append, read-back, and ordering
- [x] History persists across runs (smoke test)
- [x] Streaming placeholder interface compiles behind a feature flag
- [x] All quality gates pass (see Definition of Done)

**Files to Modify**:

- `tui/` or `cli/` modules for chat loop
- `core/` message and history storage
- Tests under `tui/tests` or `cli/tests`

**Verification Commands**:

```bash
cargo test --workspace --all-features
cargo clippy --workspace -- -D warnings
cargo fmt --check
cargo llvm-cov --workspace --all-features --fail-under-lines 95 --text
```

#### Task 2.2a: Provider Abstraction Scaffold

**Priority**: HIGH  
**Estimated Time**: 6-10 hours  
**Dependencies**: Task 2.1 testing scaffolds  
**Target Tag**: `v0.2.1-provider-scaffold`

**Test-First Approach**:

1. Write failing tests for provider trait signature (request shaping/auth hooks)
2. Write failing tests for registry insert/lookup & config selection
3. Implement minimal mock providers (no network) to satisfy contracts

**Acceptance Criteria**:

- [ ] Provider trait/API stable and covered by tests
- [ ] Registry resolves provider via config + model hints
- [ ] Base auth/header shaping path exists (minimal)
- [ ] All quality gates pass (see Definition of Done)

**Files to Modify**:

- `core/src/providers/traits.rs`
- `core/src/providers/registry.rs`
- `core/tests/provider_*`

#### Task 2.2b: Provider Switching & Aggregation Parity

**Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Dependencies**: Task 2.2a  
**Target Tag**: `v0.2.1-providers`

**Test-First Approach**:

1. Write failing tests for model -> family -> provider resolution (matrix)
2. Write failing tests for aggregate stream adapter parity subset
3. Write failing tests for session meta propagation & extended auth shaping

**Acceptance Criteria**:

- [ ] Resolution matrix passes (all mapped models)
- [ ] Aggregate adapter parity subset validated
- [ ] Session meta included where expected
- [ ] Extended auth shaping paths covered
- [ ] All quality gates pass

**Files to Modify**:

- `core/src/providers/*`
- `core/src/chat/` (adapter integration)
- Tests in `core/tests` & `cli/tests`

#### Task 2.3: Streaming Normalization & Controls

**Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Dependencies**: Task 2.1 (chat), partial 2.2a
**Target Tag**: `v0.2.2-streaming`

**Test-First Approach**:

1. Write failing tests for flag normalization (legacy flags -> canonical struct)
2. Add failing conflict resolution tests (aggregate vs raw vs json precedence)
3. Add failing tests for streaming mode selection pipeline

**Acceptance Criteria**:

- [ ] Normalization matrix passes (all flag combinations)
- [ ] Conflicts resolved deterministically (documented precedence)
- [ ] Streaming dispatcher selects correct mode (raw / aggregate / json / json-stream)
- [ ] Quality gates pass

**Files to Modify**:

- `cli/src/main.rs` (arg parsing & normalization)
- `cli/src/streaming/*.rs` (modes)
- Tests in `cli/tests/` & maybe `core/tests`

#### Task 2.5 (Proposed): Reasoning & Verbosity Controls

**Priority**: MEDIUM  
**Estimated Time**: 4-6 hours (scaffold)  
**Dependencies**: Streaming normalization (Task 2.3)  
**Target Tag**: `v0.2.5-reasoning`

**Test-First Approach**:

1. Write failing tests for reasoning delta accumulation (ordered events)
2. Write failing test for final reasoning block emission
3. Write failing tests for verbosity shaping (quiet vs verbose streams)

**Acceptance Criteria**:

- [ ] Reasoning deltas accumulate in buffer
- [ ] Final reasoning block emitted once, after content
- [ ] Verbosity flag modifies output granularity
- [ ] All quality gates pass

**Files to Modify**:

- `cli/src/streaming/reasoning.rs` (new)
- `core/src/reasoning/mod.rs` (optional scaffold)
- Tests in `cli/tests/reasoning_*.rs`

**Verification Commands**:

```bash
cargo test --workspace --all-features
cargo llvm-cov --workspace --all-features --fail-under-lines 95 --text
```

### Daily Standup Format

#### What did I complete yesterday?

- Completed project setup and planning
- Created comprehensive software engineering plan
- Established TDD methodology and rollback strategy

#### What will I work on today?

- Task 2.1: Implement chat loop to satisfy tests
- Task 2.2a: Define provider trait & registry tests
- Task 2.2b: Prepare switching matrix & aggregation parity test scaffolds
- Ensure clean build across all workspace members

#### What blockers do I have?

- Need to resolve Rust 2024 edition compatibility
- May need to update dependencies for compatibility

### Definition of Done

For each task to be considered complete:

1. **Tests Written First** ✅

   - Failing tests written before implementation
   - Tests cover all acceptance criteria
   - Tests are maintainable and clear

2. **Implementation Complete** ✅

   - All tests pass
   - Code follows project standards
   - No compiler warnings

3. **Documentation Updated** ✅

   - Code documented with examples
   - Architecture decisions recorded
   - Task completion logged

4. **Quality Gates Passed** ✅

   - `cargo test --workspace` passes
   - `cargo clippy --workspace` with no warnings
   - `cargo fmt --check` passes
   - `cargo llvm-cov --workspace --all-features --fail-under-lines 95` passes

5. **Rollback Point Created** ✅
   - Git tag created for safe rollback
   - Changes committed with clear messages
   - Branch state is stable

### Risk Assessment

#### Current Risks

1. **HIGH**: Rust edition compatibility blocking progress
2. **MEDIUM**: Large workspace may have complex dependencies
3. **LOW**: May need to update individual package versions

#### Mitigation Strategies

1. **Edition Compatibility**:

   - Start with stable 2021 edition
   - Gradually migrate to 2024 when stable
   - Use feature flags for edition-specific code

2. **Dependency Management**:

   - Lock compatible versions in workspace Cargo.toml
   - Use `cargo tree` to identify conflicts
   - Update dependencies incrementally

3. **Testing Strategy**:
   - Write comprehensive integration tests
   - Use property-based testing for edge cases
   - Mock external dependencies

### Next Sprint Planning

#### Phase 3 Preview: Provider Integrations & RAG

- OpenAI and Anthropic integrations (cloud)
- Anthropic-compatible GLM via Z.AI
- Local runtimes (Ollama/MLX) per ADR-002
- Embeddings (mxbai-embed-large, bge-m3) and rerankers (BGE-Reranker-v2-m3, Qwen3-Reranker-0.6B)

#### Estimated Timeline

- Phase 1 (Foundation): 1-2 weeks — Completed
- Phase 2 (Core Features): 2-3 weeks
- Phase 3 (Providers & RAG): 2-3 weeks
- Phase 4 (MCP): 2-3 weeks
- Phase 5 (GitHub): 1-2 weeks

**Total Estimated Timeline**: 8-12 weeks for full integration
