# Cortex CLI Changelog

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
