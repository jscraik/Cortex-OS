# Cortex CLI Task Tracker

[![Overall Progress](https://img.shields.io/badge/Overall%20Progress-Phase%201%20Complete-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Current Status](https://img.shields.io/badge/Status-Phase%202%20In%20Progress-green.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Foundation](https://img.shields.io/badge/Foundation-100%25%20Complete-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Tests](https://img.shields.io/badge/Core%20Tests-15%2F15%20Passing-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![TDD](https://img.shields.io/badge/Methodology-TDD%20Compliant-green.svg)](https://github.com/jamiescottcraik/Cortex-OS)

## Current Status: 🟢 Phase 2 In Progress - Foundation Complete

### Phase 1: Foundation Setup ✅ COMPLETED

- [x] **Task 1.1**: Basic TUI Foundation (TDD) - `v0.1.0-base`
- [x] **Task 1.2**: Configuration System (TDD) - `v0.1.1-config` ✅ COMPLETED
- [x] **Task 1.3**: Error Handling (TDD) - `v0.1.2-errors`

### Phase 2: Core Features 🔄 IN PROGRESS

- [x] **Task 2.1**: Chat CLI + Sessions + REPL (TDD) - Tag: `v0.1.2-chat`
  - [x] One-off chat streaming with mock SSE
  - [x] Session JSONL persistence and resume
  - [x] REPL mode and stdin via `-`
  - [x] README updated; tests pass

[ ] **Task 2.2a**: Provider Abstraction Scaffold (TDD) - Target: `v0.2.1-provider-scaffold` (STATUS: In Progress)

- [x] Introduce trait & registry skeleton
- [x] Initial mock provider(s)
- [ ] Model switching tests (pending)
- [ ] Auth header shaping tests
- [ ] Config selection tests
- [ ] Verification: Scaffold tests pass

- [ ] **Task 2.2b**: Provider Switching & Streaming Parity - Target: `v0.2.1-providers`

- [ ] Implement canonical resolve logic for model->family->provider
- [ ] Add reasoning/verbosity placeholders (or defer to 2.5)
- [ ] Port aggregation adapter parity if needed
- [ ] Verification: Switching & aggregation tests pass

- [ ] **Task 2.3**: Streaming Support (Normalization + Controls) - Target: `v0.2.2-streaming`

- [ ] Add flag normalization layer (legacy -> canonical)
- [ ] Test matrix for all legacy/new flag combos (conflict detection & precedence)
- [ ] Implement raw vs aggregate vs json mode selection
- [ ] Integrate with provider wire API dispatch
- [ ] Verification: Streaming tests pass

- [ ] **Task 2.5**: Reasoning & Verbosity Controls (Proposed)

- [ ] Reasoning delta accumulation tests
- [ ] Final reasoning emission test
- [ ] Verbosity param shaping tests
- [ ] Implementation of minimal reasoning pipeline
- [ ] Verification: reasoning tests green

### Quality Gate Snapshot (Live)

| Gate                     | Status                                              | Action                           |
| ------------------------ | --------------------------------------------------- | -------------------------------- |
| Build & Tests            | Partially Red (CLI streaming flag failures earlier) | Implement normalization & re-run |
| Warnings (`-D warnings`) | Failing (unused imports/mut)                        | Clean or allow in tests          |
| Coverage >=95%           | Not yet measured in this fork                       | Run llvm-cov baseline            |
| Provider Scaffold        | Partial                                             | Add tests (2.2a)                 |
| Streaming Parity         | Not implemented                                     | Task 2.3                         |
| Reasoning Support        | Missing                                             | Task 2.5                         |
| Session Meta Parity      | Partial                                             | Add meta test                    |
| Auth Mode Fallback       | Unverified                                          | Port subset tests                |

### Phase 3: Provider Integration 📋 PLANNED

- [ ] **Task 3.1**: OpenAI Integration (TDD) - Target: `v0.3.0-openai`
- [ ] **Task 3.2**: Anthropic Integration (TDD) - Target: `v0.3.1-anthropic`
- [ ] **Task 3.3**: Local Model Support (TDD) - Target: `v0.3.2-local`

## Rollback Points 🔄

### Available Rollback Tags

- `v0.1.0-base` - Basic TUI foundation ✅
- `v0.1.1-config` - Configuration system ✅ COMPLETED
- `v0.1.2-errors` - Error handling ✅
- `v0.1.2-chat` - Chat CLI + Sessions ✅

### Next Planned Tags

- `v0.2.1-providers` - Provider abstraction
- `v0.2.2-streaming` - Streaming support

## Current Sprint Goals 🎯

### This Week (Updated)

- [ ] Finalize streaming flag normalization (Task 2.3 start)
- [ ] Add provider switching tests (2.2a → 2.2b bridge)
- [ ] Draft reasoning task scaffolding (2.5) if bandwidth

### Success Criteria (Refined)

- 0 failing tests in workspace
- No warnings under `cargo clippy -- -D warnings`
- Coverage command documented & baseline captured
- Provider switching + streaming normalization tests green

## GitHub Integration Note 📝

**GitHub integration will be handled via GitHub MCP integration:**

- Use existing `mcp-client` and `mcp-server` packages
- Access GitHub functionality through MCP tools
- Better modularity following MCP standard
- Handles: repository management, pull requests, issues, code reviews

## Quick Commands 🚀

```bash
# Run all tests
cargo test

# Run specific test suite
cargo test integration

# Check test coverage (macOS/Linux)
# install: brew install cargo-llvm-cov
cargo llvm-cov --workspace --all-features --html

# Enforce minimum coverage threshold (95%) locally
cargo llvm-cov --workspace --all-features --fail-under-lines 95 --text

# Full quality gates
cargo clippy --workspace -- -D warnings
cargo fmt --check

# Run TDD cycle
git add . && git commit -m "Red: Add failing test"
# ... implement ...
git add . && git commit -m "Green: Make test pass"
# ... refactor ...
git add . && git commit -m "Refactor: Improve implementation"

# Create rollback point
git tag v0.x.x-feature-name
git push origin v0.x.x-feature-name
```
