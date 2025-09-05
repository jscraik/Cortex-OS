# Cortex CLI Changelog

## [Unreleased] - 2025-09-04

### ✅ COMPLETED: Task 2.2 - Provider Abstraction Layer (TDD)

#### Provider Abstraction Features

- **Provider Abstraction System**: Complete provider abstraction layer with unified interface
- **Provider Registry**: Dynamic provider registration and management system
- **Mock Providers**: Comprehensive mock implementations for OpenAI, Anthropic, and Ollama
- **Streaming Support**: Infrastructure for streaming responses with futures integration
- **Configuration Integration**: Provider configuration validation and error handling

#### Provider Implementation Files

- `core/src/providers/traits.rs` - Core ModelProvider trait with async methods
- `core/src/providers/registry.rs` - Provider registry for dynamic provider management
- `core/src/providers/mocks.rs` - Mock provider implementations for testing
- `core/tests/provider_abstraction_tests.rs` - 10 comprehensive tests covering all functionality
- Enhanced error handling with ConfigurationError variant

#### Provider Testing Coverage

- Provider trait implementation tests (basic operations)
- Provider registry tests (registration, discovery, defaults)
- Mock provider tests (OpenAI, Anthropic, Ollama behavior)
- Streaming support tests
- Configuration validation tests
- Error handling tests for provider operations

### ✅ COMPLETED: Task 2.1 - Chat Interface Implementation

#### Chat Interface Features

- **Conversation Management**: Stateful conversation handling with persistence
- **Message History**: Message storage and retrieval system
- **CLI Integration**: Chat subcommand with conversation state management

#### Chat Implementation Files

- `core/src/conversation_manager.rs` - Conversation state management
- `core/src/message_history.rs` - Message persistence and retrieval
- `core/tests/config_tests.rs` - Configuration validation tests
- Enhanced chat subcommand in `cli/src/main.rs`

## [v0.1.2-chat] - 2025-09-03

### Features

- `codex chat` subcommand with streaming output (single-turn)
- Multi-turn chat options:
  - `--session NAME` and `--session-file PATH` for JSONL history
  - `--reset` to truncate an existing session file
  - `--repl` simple line-based REPL (type `:q` to quit)
  - Support `-` to read the prompt from stdin
- Session JSONL persists both user and assistant items for accurate replay
- Session metadata includes Git info when available (commit hash, branch, repo URL)

### Testing & Tooling

- Mocked SSE chat completions via wiremock in core test suite
- Fixture-driven SSE for hermetic tests via `CODEX_RS_SSE_FIXTURE`
- CLI one-off chat integration tests (once-only streaming assertions)
- Clippy strict (`-D warnings`) passes across updated crates

### Docs

- Expanded README with chat usage, sessions/REPL flags, and developer SSE fixture notes

## [v0.1.1-config] - 2025-09-03

### ✅ COMPLETED: Task 1.2 - Configuration System Integration (TDD)

#### Added

- **Configuration System**: Complete TDD-driven configuration system with 11/11 tests passing
- **Profile Support**: TOML-based configuration with profile loading (development, production)  
- **Override System**: Dot-notation configuration overrides (e.g., `model.provider=openai`)
- **Environment Variables**: Support for `CODEX_MODEL_PROVIDER`, `CODEX_API_TIMEOUT_SECONDS`
- **Configuration Validation**: Comprehensive validation with detailed error messages
- **Serialization**: Bidirectional TOML serialization with error handling

#### Files Created

- `core/src/config_types_new.rs` - Modern configuration types (ModelProvider, ApiSettings, etc.)
- `core/src/config_tdd.rs` - TDD-focused SimpleConfig implementation  
- `core/tests/config_tests.rs` - Comprehensive test suite (11 tests)

#### Files Modified  

- `core/src/error.rs` - Extended with ConfigError enum for configuration-specific errors
- `core/src/lib.rs` - Added new configuration modules

#### TDD Results

- **Red Phase**: 11 comprehensive tests written covering all requirements
- **Green Phase**: All tests passing with full implementation
- **Refactor Phase**: Clean, maintainable code structure

#### Next Steps

- Ready for Task 2.1: Basic Chat Interface (TDD)
- Phase 1 Foundation nearly complete

---

## [Unreleased] - 2025-09-03

### Added (plan, ci, infra)

- Complete software engineering plan with TDD principles
- Task tracking system with rollback points
- CI/CD configuration with pre-commit hooks
- Architecture Decision Records (ADR) framework
- Integration test examples

### Changed

- **BREAKING**: Removed Phase 4 (Enhanced TUI Integration) from original plan
- **BREAKING**: Removed Phase 5 (GitHub Integration) from original plan
- GitHub integration will now be handled via GitHub MCP tools instead of direct API integration

### Technical Details

- Plan now focuses on 3 phases: Foundation, Core Features, Provider Integration
- GitHub functionality will use existing `mcp-client` and `mcp-server` packages
- Better modularity following MCP standard
- All phases maintain strict TDD approach with test coverage >= 95%

### Benefits of MCP Approach

- ✅ Better separation of concerns
- ✅ Follows established MCP protocol standards
- ✅ Leverages existing codex-rs MCP infrastructure
- ✅ Easier to maintain and extend
- ✅ More modular architecture

### Migration Guide

- No migration needed as this is the initial plan
- GitHub features will be available through MCP tools
- Simple TUI experience is preserved
- All existing codex-rs functionality remains available
