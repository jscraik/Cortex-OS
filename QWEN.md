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
