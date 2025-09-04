# Cortex CLI Changelog

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

### Added

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
