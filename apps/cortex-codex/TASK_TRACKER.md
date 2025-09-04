# Cortex Task Tracker

## Current Status: ✅ Ready for Phase 2 - Foundation Complete

### Phase 1: Foundation Setup ✅ COMPLETED

- [x] **Task 1.1**: Basic TUI Foundation (TDD) - `v0.1.0-foundation` ✅ COMPLETED  
- [x] **Task 1.2**: Configuration System (TDD) - `v0.1.1-config` ✅ COMPLETED  
- [x] **Task 1.3**: Error Handling (TDD) - `v0.1.2-errors` ✅ COMPLETED

### Phase 2: Core Features 🔄 IN PROGRESS

- [ ] **Task 2.1**: Basic Chat Interface (TDD) - Target: `v0.2.0-chat`
  - [ ] Write tests for chat message handling
  - [ ] Write tests for message history
  - [ ] Implement simple chat interface
  - [ ] Add message persistence
  - [ ] Verification: Chat interface tests pass
  
- [ ] **Task 2.2**: Model Provider Abstraction (TDD) - Target: `v0.2.1-providers`
  - [ ] Write tests for provider interface
  - [ ] Write tests for model switching
  - [ ] Implement provider abstraction
  - [ ] Add configuration for providers
  - [ ] Verification: Provider abstraction tests pass

- [ ] **Task 2.3**: Streaming Support (TDD) - Target: `v0.2.2-streaming`
  - [ ] Write tests for streaming responses
  - [ ] Write tests for stream interruption
  - [ ] Implement streaming in TUI
  - [ ] Add streaming controls
  - [ ] Verification: Streaming tests pass

### Phase 3: Provider Integration 📋 PLANNED

- [ ] **Task 3.1**: OpenAI Integration (TDD) - Target: `v0.3.0-openai`
- [ ] **Task 3.2**: Anthropic Integration (TDD) - Target: `v0.3.1-anthropic`
- [ ] **Task 3.3**: Local Model Support (TDD) - Target: `v0.3.2-local`

## Rollback Points 🔄

### Available Rollback Tags

- `v0.1.0-base` - Basic TUI foundation ✅
- `v0.1.1-config` - Configuration system ✅ COMPLETED
- `v0.1.2-errors` - Error handling ✅

### Next Planned Tags

- `v0.2.0-chat` - Basic chat interface
- `v0.2.1-providers` - Provider abstraction
- `v0.2.2-streaming` - Streaming support

## Current Sprint Goals 🎯

### This Week

- [ ] Complete Task 2.1: Basic Chat Interface
- [ ] Begin Task 2.2: Provider Abstraction

### Success Criteria

- All existing tests continue to pass
- New features have >= 95% test coverage (enforced)
- Performance remains under baseline targets
- Simple TUI experience is preserved

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
