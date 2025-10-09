# Feature Specification: Memory Migration Completion

**Task ID**: `memory-migration-completion`  
**Feature Branch**: `feature/memory-migration-completion`  
**Created**: 2025-10-09  
**Status**: Draft  
**Priority**: P1
**Assignee**: Unassigned

**User Request**: 
> Complete the migration of the legacy `packages/memories` to the new `packages/memory-core` package, as per the TDD plan.

---

## Executive Summary

This feature completes the final phases of the memory architecture refactor, ensuring that `packages/memory-core` becomes the single source of truth for all memory-related operations in brAInwav Cortex-OS. This involves refactoring the MCP server and REST API to be thin adapters, finalizing the Docker Compose integration, and completing the verification and documentation.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: MCP Server as a Thin Adapter (Priority: P1)

**As a** developer,  
**I want** the MCP server to be a thin adapter that delegates all memory and agent-toolkit operations to their respective providers,  
**So that** business logic is centralized and the architecture is simplified.

**Why This Priority**: This is a core architectural principle of the new memory system and is essential for maintainability and scalability.

**Independent Test Criteria**: 
The MCP server can be tested by calling its tool endpoints and verifying that the calls are correctly routed to the `memory-core` and `agent-toolkit` packages without any intervening business logic.

**Acceptance Scenarios**:

1. **Given** the MCP server is running,
   **When** a `memory.store` tool call is made,
   **Then** the MCP server should directly call the `store` method on the `MemoryProvider` in `memory-core`.
   **And** the response from the `MemoryProvider` should be returned to the client with minimal modification.

2. **Given** the MCP server is running,
   **When** an `agent_toolkit_search` tool call is made,
   **Then** the MCP server should directly call the `search` handler in the `agent-toolkit`.
   **And** the response from the `agent-toolkit` should be returned to the client.

**brAInwav Branding Requirements**:
- All logs and error messages from the MCP server must include "brAInwav".

---

### User Story 2: Final Verification and Documentation (Priority: P2)

**As a** developer,
**I want** a comprehensive verification script and updated documentation for the new memory architecture,
**So that** I can easily verify the system's correctness and understand how to use it.

**Why This Priority**: This is important for ensuring the long-term stability and usability of the new memory system.

**Independent Test Criteria**: 
The verification script can be run independently to test the entire memory stack. The documentation can be reviewed for clarity, accuracy, and completeness.

**Acceptance Scenarios**:

1. **Given** the entire memory stack is running (via Docker Compose),
   **When** the `scripts/verify-unified-stack.sh` script is executed,
   **Then** all tests should pass, and the script should exit with a status of 0.

2. **Given** a developer wants to learn about the new memory architecture,
   **When** they read the documentation,
   **Then** they should be able to understand the architecture, how to use the `agent-toolkit`, the A2A event specification, and how to migrate from the legacy system.

**brAInwav Branding Requirements**:
- All documentation should adhere to brAInwav branding guidelines.

---

## Requirements *(mandatory)*

### Functional Requirements

1. **[FR-001]** The `mcp-server` package must not contain any memory-related business logic.
   - **Rationale**: To ensure a clean separation of concerns and a thin adapter architecture.
   - **Validation**: Code review and automated tests that check for the absence of business logic.

2. **[FR-002]** A verification script at `scripts/verify-unified-stack.sh` must be created.
   - **Rationale**: To provide a single command to verify the correctness of the entire memory stack.
   - **Validation**: The script exists and successfully runs all tests.

3. **[FR-003]** The documentation must be updated to reflect the new memory architecture.
   - **Rationale**: To ensure developers can understand and use the new system.
   - **Validation**: The documentation is reviewed and approved by the team.

4. **[FR-004]** brAInwav branding included in:
   - System outputs and status messages
   - Error messages and warnings
   - Health check responses
   - Telemetry and logging

### Non-Functional Requirements

#### Performance
- **[NFR-P-001]** MCP server tool calls should add no more than 10ms of overhead to the underlying provider calls.

#### Security
- **[NFR-S-001]** Must pass `pnpm security:scan` with zero high-severity findings.

#### Testing
- **[NFR-T-001]** 90%+ test coverage maintained for all new and refactored code.
- **[NFR-T-002]** TDD approach with tests written first for all new functionality.

#### Observability
- **[NFR-O-001]** OpenTelemetry spans for all MCP tool calls.
- **[NFR-O-002]** Structured logging with brAInwav context for all MCP server operations.

---

## Technical Constraints

### Must Use
- Named exports only (no `export default`)
- Async/await exclusively (no `.then()` chains)
- Functions ≤ 40 lines (split if longer)
- Zod schemas for input validation
- brAInwav branding in all outputs

### Must Avoid
- Business logic in the `mcp-server` package.
- Direct database access from the `mcp-server` package.

### Integration Points
- **MCP Tools**: The `mcp-server` will delegate all `memory.*` and `agent_toolkit_*` tool calls.
- **A2A Events**: The `mcp-server` will continue to emit A2A events for tool execution.
- **Databases**: All database interactions will be handled by `memory-core`.

---

## Architecture & Design

### System Components
```
┌─────────────────┐
│   MCP Server    │ (packages/mcp-server/src/index.ts)
│ (Thin Adapter)  │
└────────┬────────┘
         │
         ├─→ `memory-core` (for memory.* tools)
         └─→ `agent-toolkit` (for agent_toolkit_* tools)
```

---

## Implementation Phases

### Phase 1: Refactor MCP Server
- [ ] Move all memory-related business logic from `mcp-server` to `memory-core`.
- [ ] Update the `mcp-server` to be a thin adapter that delegates all tool calls.
- [ ] Write integration tests to verify the delegation.

### Phase 2: Create Verification Script
- [ ] Create the `scripts/verify-unified-stack.sh` script.
- [ ] Add steps to the script to:
    - Start the Docker stack.
    - Run all relevant test suites.
    - Verify the parity of results between the MCP and REST APIs.
    - Check for architectural compliance.

### Phase 3: Update Documentation
- [ ] Create an `agent-toolkit` integration guide.
- [ ] Create a tools path resolution guide.
- [ ] Create an A2A event specification.
- [ ] Create a migration guide from the legacy memory system.
- [ ] Update all existing documentation to reflect the new architecture.

---

## Success Metrics

### Quantitative
- [ ] 100% of memory-related business logic removed from the `mcp-server`.
- [ ] The `verify-unified-stack.sh` script passes with 100% success.
- [ ] 90%+ test coverage achieved for all new and refactored code.

### Qualitative
- [ ] Code review approval from maintainers for the `mcp-server` refactor.
- [ ] The new documentation is clear, accurate, and complete.
- [ ] brAInwav branding consistently applied.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Refactoring the `mcp-server` breaks existing functionality. | High | Medium | A comprehensive suite of integration tests will be written before the refactor begins to ensure that all existing functionality is preserved. |

---

## Open Questions

1. **Should the legacy files in `packages/memories` be physically deleted as part of this feature, or should that be a separate task?**
   - **Decision needed by**: Start of Phase 1.
   - **Options**: 
     1. Delete the files as part of this feature.
     2. Create a separate, low-priority task to delete the files later.

---

## Compliance Checklist

- [ ] Follows brAInwav Constitution principles
- [ ] Adheres to CODESTYLE.md standards
- [ ] RULES_OF_AI.md ethical guidelines respected
- [ ] No mock production claims
- [ ] brAInwav branding included throughout
- [ ] Test-driven development approach documented

---

**Version**: 1.0  
**Last Updated**: 2025-10-09  
**Maintained by**: brAInwav Development Team
