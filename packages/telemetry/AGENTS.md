# AGENTS — @brainwav/telemetry

**Status:** Inherits from Root  
**Maintainer:** brAInwav Development Team  
**Scope:** brAInwav structured telemetry system for Cortex-OS

---

This package inherits all rules from the root `AGENTS.md` with no package-specific modifications.

## Package-Specific Guidelines

### Telemetry Privacy Standards
- **Privacy-First Design**: All sensitive data must be redacted before emission
- **Default Redaction**: Remove `labels.prompt` and other sensitive fields
- **brAInwav Context**: Include brAInwav branding in all telemetry outputs
- **Structured Events**: Use AgentEvent schema for all emissions

### Testing Requirements
- **TDD Mandate**: Write failing tests before implementation
- **Coverage**: ≥95% line coverage for all changed files
- **Schema Validation**: All events must pass AgentEvent schema validation
- **Privacy Testing**: Verify redaction works correctly

### Performance Standards
- **Emission Latency**: <10ms P95 for telemetry event emission
- **Memory Usage**: No memory leaks from event accumulation
- **Bus Integration**: Graceful error handling for bus failures

---

All other rules inherit from root AGENTS.md without modification.

Co-authored-by: brAInwav Development Team