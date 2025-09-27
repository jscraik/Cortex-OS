# QWEN.md - Cortex-OS Context for Qwen Code

# QWEN.md - brAInwav Cortex-OS Development Guide

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response - adapters not yet implemented"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or thermal data

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

## Project Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations. This is a governed monorepo with strict architectural boundaries and comprehensive quality gates.

### Key Technologies

- **Languages**: TypeScript/JavaScript, Python, Rust
- **Package Manager**: pnpm v10.3.0
- **Build System**: Nx monorepo with smart affected-only execution
- **Testing**: Vitest with 90%+ coverage requirement
- **Linting**: Biome, ESLint, Ruff (Python)
- **Code Quality**: Strict governance with CODESTYLE.md enforcement

### Architecture

- **Event-Driven**: Agent-to-agent communication via A2A events
- **Microservices**: Feature packages communicate through contracts
- **MCP Integration**: Standardized tool integration via Model Context Protocol
- **Governed Structure**: Import boundaries and architectural constraints

## Development Environment

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10.3.0
- Python ≥ 3.11 with uv
- Rust (for CLI/TUI components)

### Setup

```bash
# Clone and setup
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

# Automated setup (installs deps, sets up hooks, validates structure)
./scripts/dev-setup.sh

# Verify installation
pnpm readiness:check
```

### Core Development Commands

```bash
# Build affected projects only (preferred)
pnpm build:smart

# Run tests with smart affected detection
pnpm test:smart

# Lint with smart affected detection
pnpm lint:smart

# Type checking with smart affected detection
pnpm typecheck:smart

# Run security scans
pnpm security:scan

# Validate structure and governance
pnpm structure:validate
```

## 🔄 Agentic Coding Workflow

All Qwen Code agents working on brAInwav Cortex-OS must follow this structured 5-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `orchestration-workflow-enhancement` or `batch-processing-optimization`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**brAInwav Research Focus Areas:**

- Event-driven architecture patterns (A2A communication)
- MCP integration opportunities
- Existing quality gates and governance patterns
- TypeScript/Python/Rust integration points
- Security and accessibility requirements

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** - leverage monorepo shared components
  - **Separation of concerns** - follow Cortex-OS layered architecture
  - **Single Responsibility Principle (SRP)** - maximum 40 lines per function
  - **Don't Repeat Yourself (DRY)** - use utilities from `libs/typescript/utils`
  - **Keep it Simple, Stupid (KISS)** - prefer functional composition
  - **You Aren't Gonna Need It (YAGNI)** - implement only specified requirements
  - **Encapsulation** - proper module boundaries with contracts
  - **Modularity** - event-driven communication between packages
  - **Open/Closed Principle** - extend via interfaces and contracts
  - **Testability** - design for Vitest with comprehensive test coverage
  - **Principle of Least Astonishment (POLA)** - follow established patterns
  - **Fail Fast** - early validation with Zod schemas
  - **High Cohesion, Low Coupling** - respect package import boundaries
- **Ask clarifying questions** to ensure complete understanding of scope
- **Write comprehensive plan** to `[feature]-tdd-plan.md` including all implementation context
- **Create implementation checklist**: Break down the TDD plan into specific, actionable checklist items for systematic execution in Phase 3

**brAInwav Planning Checklist:**

- [ ] Include brAInwav branding in all outputs and error messages
- [ ] Plan MCP tool integration points
- [ ] Design A2A event emission for cross-package communication
- [ ] Include WCAG 2.2 AA accessibility considerations
- [ ] Plan security scanning integration (Semgrep OWASP)
- [ ] Design for 90%+ test coverage
- [ ] Consider performance monitoring and telemetry

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create a to-do list
- **Execute the plan** systematically with strict TDD (red-green-refactor cycle)
- **Go for as long as possible** - batch questions and clarifications
- **Implementation must be 100% deployable** unless explicitly noted
- **Follow brAInwav standards** and monorepo governance rules
- **Update implementation checklist**: Mark completed tasks as you progress through the checklist items

**Implementation Requirements:**

- **Named exports only** - `export const functionName = ...` (no default exports)
- **Function length limit** - maximum 40 lines, split immediately if longer
- **Async/await only** - no `.then()` chains (linter enforced)
- **TypeScript strict mode** - explicit type annotations at API boundaries
- **Project references** - ensure `composite: true` in tsconfig.json
- **brAInwav branding** - include in all system outputs, logs, and error messages

### 4. Verification

- **Verify all requirements** are implemented and bug-free
- **Run comprehensive quality gates**:

  ```bash
  pnpm lint:smart && pnpm test:smart && pnpm typecheck:smart
  pnpm security:scan:diff  # For security-sensitive changes
  pnpm structure:validate  # Governance compliance
  ```

- **Validate test coverage** - ensure 90%+ threshold maintained
- **Check accessibility** - run a11y tests where applicable
- **Performance validation** - verify no memory leaks or performance regressions
- **Return to implementation** if any issues are discovered
- **Update task status** to **"verified"** once all validations pass
- **Store insights** in local memory for future development sessions

### 5. Archive

- **Archive completed TDD plan**: Move `[feature]-tdd-plan.md` and related documentation to appropriate location:
  - Package-specific: `apps/[app-name]/docs/` or `packages/[package-name]/docs/`
  - System-wide: root directory `docs/` or `project-documentation/`
- **Update documentation**: Ensure all reports, architectural decisions, and implementation notes are properly placed
- **MANDATORY: Update change documentation**:
  - **CHANGELOG.md**: Add entry documenting what was completed, files changed, and impact
  - **README.md**: Update relevant sections if new features or significant changes were made
  - **Website documentation**: Update `/Users/jamiecraik/.Cortex-OS/website/README.md` for user-facing changes
- **Complete final checklist**: Mark all remaining checklist items as complete and archive in local memory
- **Knowledge preservation**: Store comprehensive task summary with technical insights and brAInwav context for future development sessions

**Verification Checklist:**

- [ ] All tests passing with 90%+ coverage
- [ ] Security scan shows no new vulnerabilities
- [ ] Structure validation passes (import boundaries respected)
- [ ] brAInwav branding included in all relevant outputs
- [ ] MCP integration functional (if applicable)
- [ ] A2A events properly emitted (if applicable)
- [ ] Accessibility requirements met (if UI changes)
- [ ] Documentation updated to reflect changes

### Task Context Persistence

```typescript
// Store comprehensive task context in local memory
await memory.store({
  content: `Completed ${taskId}: ${description}. Key learnings: ${insights}`,
  importance: 9,
  tags: ['task-complete', 'qwen-implementation', 'brainwav', ...specificTags],
  domain: 'cortex-os-development',
  metadata: {
    taskId,
    phase: 'verified',
    technicalStack: ['typescript', 'python', 'rust'],
    qualityMetrics: {
      testCoverage: '95%',
      securityScore: 'passed',
      performanceImpact: 'minimal'
    },
    architecturalPatterns: ['event-driven', 'mcp-integration', 'layered-design']
  }
});
```

## Code Quality Standards

### CODESTYLE.md Requirements

All code must strictly follow [CODESTYLE.md](./CODESTYLE.md):

1. **Functional First**: Pure, composable functions preferred
2. **Function Length**: ≤ 40 lines maximum
3. **Exports**: Named exports only (no default exports)
4. **Async/Await**: Use exclusively (no .then() chains)
5. **Type Safety**: Explicit annotations at public API boundaries
6. **Project References**: All packages must set `composite: true`

### Naming Conventions

- **Directories & Files**: `kebab-case`
- **Variables & Functions**: `camelCase`
- **Types & Components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Python**: `snake_case` for functions/variables, `PascalCase` for classes

### Testing

- **TDD Required**: Start with failing tests
- **Coverage**: 90%+ minimum threshold
- **Framework**: Vitest for TypeScript, pytest for Python
- **Structure**: Every async component must handle Loading, Error, Empty, Success states

## Agent-Specific Guidelines

### Agent Toolkit (Mandatory)

All agents MUST use the `@cortex-os/agent-toolkit` for development operations:

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

Shell interface:

- `just scout "pattern" path` - Multi-tool search
- `just codemod 'find(:[x])' 'replace(:[x])' path` - Structural modifications
- `just verify changed.txt` - Auto-validation

### Time Freshness Rules

Agents must be aware of current timezone and date information. See `.cortex/rules/_time-freshness.md`:

```
Very important: The user's timezone is {{USER_TIMEZONE}}. Today's date is {{TODAY}}.

Treat dates before this as past and after this as future. When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current; verify freshness or ask the user.
```

### Local Memory Usage

Agents should persist context using Local Memory:

```typescript
// Store architectural decisions
await memory.store({
  content: 'Decision description',
  importance: 8,
  tags: ['architecture', 'decision'],
  domain: 'software-design'
});
```

## Package Structure

The monorepo contains numerous packages organized by function:

### AI & Automation

- `@cortex-os/agents` - Core AI agent behaviors
- `@cortex-os/rag` - Retrieval-Augmented Generation pipeline
- `@cortex-os/orchestration` - Multi-agent workflows

### Communication & Integration

- `@cortex-os/a2a` - Agent-to-agent communication
- `@cortex-os/mcp` - Model Context Protocol integration
- `@cortex-os/mcp-bridge` - MCP transport bridge

### Data & Memory

- `@cortex-os/memories` - State management
- `@cortex-os/registry` - Service registry and discovery

## Quality Gates

### Pre-Commit Hooks

- Biome formatting and linting
- Type checking
- Test execution (affected only)
- Structure validation

### CI Enforcement

- 90%+ test coverage
- Security scanning (Semgrep OWASP profiles)
- Structure governance validation
- License compliance checks

### Mutation Testing

- Minimum mutation score threshold enforced
- Generated badges for branch coverage and mutation score

## Security Practices

- OWASP compliance
- Semgrep security scanning
- SBOM generation
- Secret detection and prevention
- Dependency vulnerability scanning

## Accessibility Requirements

- WCAG 2.2 AA compliance
- ARIA roles and labels
- Keyboard navigation support
- CLI/TUI `--plain` mode for assistive technology

## Important Anti-Patterns to Avoid

1. **Default exports** - Always use named exports
2. **Functions > 40 lines** - Split into smaller functions
3. **`.then()` chains** - Use async/await exclusively
4. **Classes without framework requirement** - Prefer functional composition
5. **Missing `composite: true`** - Required in all tsconfig.json files
6. **Direct sibling package imports** - Use events/contracts instead
7. **Bypassing local memory** - Store development insights persistently

## Memory Management

The repository implements memory management mitigations:

- Limited pnpm child concurrency
- Serialized Nx tasks
- Memory sampling scripts available

## Contributing Workflow

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run quality checks: `pnpm lint && pnpm test`
5. Commit with Conventional Commits format
6. Open a pull request

## Key Documentation

- [README.md](./README.md) - Main project documentation
- [CODESTYLE.md](./CODESTYLE.md) - Coding standards
- [AGENTS.md](./AGENTS.md) - Agent policies and workflows
- [RULES_OF_AI.md](./.cortex/rules/RULES_OF_AI.md) - AI/agent rules and guidelines
- [Architecture Guide](./docs/architecture.md) - System design and patterns

## Environment Variables

Key environment variables for development:

- `LOCAL_MEMORY_BASE_URL` - Local memory service URL
- `CORTEX_SMART_FOCUS` - Focus specific projects in smart builds
- `NX_BASE`, `NX_HEAD` - Git refs for affected detection
- `CORTEX_NX_INTERACTIVE` - Enable interactive mode for Nx

## Performance Considerations

- Use smart affected-only commands (`pnpm build:smart`, etc.)
- Memory usage is monitored and constrained
- Parallelism is limited to prevent resource exhaustion
- Use `pnpm memory:clean` to free up resources when needed

## Phase 6: Reality Filter

Ensure you update the instructional documentation and README.md

**NEW**

# Reality Filter –

- [ ] Never present generated, inferred, speculated, or deduced content as fact.

- [ ] If you cannot verify something directly, say:  
  - "I cannot verify this."
  - "I do not have access to that information."
  - "My knowledge base does not contain that."

- [ ] Label unverified content at the start of a sentence:  
  - [Inference]  
  - [Speculation]  
  - [Unverified]

- [ ] Ask for clarification if information is missing. Do not guess or fill gaps.

- [ ] If any part is unverified, label the entire response.

- [ ] Do not paraphrase or reinterpret input unless requested.

- [ ] Label claims with these words unless sourced:  
  - Prevent, Guarantee, Will never, Fixes, Eliminates, Ensures that

- [ ] For LLM-behavior claims (including yourself), include:  
  - [Inference] or [Unverified], with a note that it's based on observed patterns

- [ ] If directive is broken, say:  
  > Correction: I previously made an unverified claim. That was incorrect and should have been labeled.

- [ ] Never override or alter input unless asked.
