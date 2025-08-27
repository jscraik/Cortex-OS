# Memory Instructions

Repository-wide process and workflow updates.

## Memory Recording Process

Format: `MEMORY: [CATEGORY] description`

Categories:

- [CLAUDE]: Coding patterns and constraints
- [AGENT]: Agent behavior and planning
- [INSTR]: Process and workflow updates

Example:

```
MEMORY: [CLAUDE] Always use package exports instead of deep imports
MEMORY: [AGENT] Router must validate all inputs before processing
MEMORY: [INSTR] Run tests before committing changes
```

## Process Memory

- 2025-08-16: Updated process to include automated memory collection from PRs

- 2025-01-16: PR template updated to capture memories in structured format
- 2025-01-16: GitHub Action implemented to append memories automatically on merge
- 2025-01-16: Memory collector script validates and formats memory entries
- 2025-01-16: Repository reorganization requires updating Docker contexts and CI paths
- 2025-01-16: Package exports must be validated before merging any restructuring changes
- 2025-01-16: TDD refactoring plan integrated with memory recording mechanism

## Critical Bug Prevention Memories (2025-08-20)

### TDD Process Integrity

```
MEMORY: [CLAUDE] Tests must import from actual implementation files, not fantasized module paths
MEMORY: [CLAUDE] Test coverage percentage is meaningless if tests don't validate real integration points
MEMORY: [CLAUDE] If tests pass but actual functionality is broken, the TDD process is corrupted
MEMORY: [AGENT] QA agents must validate import paths exist before writing test logic
MEMORY: [AGENT] Backend agents must never use 'as any' type assertions to bypass compilation errors
MEMORY: [INSTR] Run actual CLI commands and file operations to validate integration, don't just check unit tests
```

### Multi-Agent Coordination

```
MEMORY: [AGENT] When multiple agents build interdependent components, each must validate their integration points
MEMORY: [AGENT] Agent specialization creates blind spots - require cross-validation between agents
MEMORY: [INSTR] After each agent completes work, run end-to-end validation of actual functionality
MEMORY: [INSTR] Beautiful documentation and comprehensive tests can mask fundamental implementation flaws
```

### Resource Management

```
MEMORY: [CLAUDE] EventEmitter-based classes must implement removeAllListeners() in shutdown methods
MEMORY: [CLAUDE] AbortController instances in Maps must be cleaned up to prevent memory leaks
MEMORY: [CLAUDE] Semaphore implementations need atomic operations to prevent race conditions
MEMORY: [CLAUDE] Timeout and interval handles must be cleared in cleanup methods
```

### Type System Safety

```
MEMORY: [CLAUDE] Priority enum mismatches between modules will cause runtime failures in strategy selection
MEMORY: [CLAUDE] Type aliases that create confusion (ResourceBudgetExceededError vs NeuronResourceBudgetExceededError) must be eliminated
MEMORY: [CLAUDE] Bridge API integration requires runtime validation, not just compile-time type casting
```

### CLI and Binary Integration

```
MEMORY: [CLAUDE] CLI binary paths in tests must match actual dist/ output structure
MEMORY: [CLAUDE] Shebang lines in CLI files must point to correct executable locations
MEMORY: [INSTR] Test CLI commands by actually executing them, not just checking import paths
```
