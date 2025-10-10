# brAInwav Cortex-OS Constitution

**Version**: 1.0.0  
**Ratified**: 2025-10-08  
**Last Amended**: 2025-10-08  
**Maintainer**: brAInwav Development Team

---

## Purpose

This constitution defines the **foundational principles** that govern all development within the brAInwav Cortex-OS ecosystem. It complements and extends `RULES_OF_AI.md` and `CODESTYLE.md` with project-specific governance for feature development, agent behavior, and quality standards.

---

## I. Core Principles

### 1. brAInwav Production Standards (NON-NEGOTIABLE)

**No Mock Production Claims**: Never describe any implementation as "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses (e.g., "Mock adapter response - adapters not yet implemented")
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or thermal data

**brAInwav Branding**: All system outputs, error messages, health checks, and status logs MUST include "brAInwav" branding.

**Evidence-Based Status**: All status claims must be verified against actual code implementation and passing quality gates.

### 2. Test-Driven Development (MANDATORY)

**Red-Green-Refactor Cycle**:

1. Write failing tests FIRST
2. Get user/stakeholder approval on test scenarios
3. Implement minimal code to pass tests
4. Refactor for quality while maintaining green tests

**Coverage Requirements**:

- 90%+ minimum test coverage threshold
- All new features require comprehensive test suites
- TDD approach documented in `[feature]-tdd-plan.md`

### 3. Accessibility First (WCAG 2.2 AA)

All UI components MUST meet WCAG 2.2 AA compliance:

- Semantic HTML with appropriate ARIA attributes
- Keyboard navigation for all interactive elements
- Minimum 44x44 CSS pixel target sizes
- Screen reader compatibility with `jest-axe` test coverage
- brAInwav branding in accessibility announcements

### 4. Monorepo Integrity

**Nx Smart Execution**: Use smart wrappers for affected-only execution:

- `pnpm build:smart`, `pnpm test:smart`, `pnpm lint:smart`, `pnpm typecheck:smart`
- Respect project boundaries and dependency graphs
- No circular dependencies

**Named Exports Only**: No `export default` statements

- Improves tree-shaking and refactoring
- Explicit imports enhance code clarity

**Function Size Limit**: Maximum 40 lines per function

- Split immediately if exceeding limit
- Prefer composition and guard clauses

### 5. Agent-First Architecture

**MCP Integration**: All external tool integrations via Model Context Protocol

- Contract-based tool definitions with Zod schemas
- Audit events emitted via MCP audit publisher
- Local memory integration for persistent context

**A2A Communication**: Cross-feature communication via Agent-to-Agent events

- Use `createEnvelope(...)` from `@cortex-os/a2a-contracts`
- No direct cross-domain imports
- Event-driven architecture for loose coupling

### 6. Security by Default

**Quality Gates**: All changes must pass:

- `pnpm security:scan` - Semgrep OWASP rules
- `pnpm security:scan:gitleaks` - Secret detection
- `pnpm test:security` - Security-focused test scenarios
- Dependency vulnerability scanning

**No Secrets in Code**: Never commit credentials, API keys, or sensitive data

- Use environment variables via `.env` files
- 1Password CLI integration for local development
- Secrets management via secure vaults

---

## II. Development Workflow

### Phase 0: Task Initialization

- Create semantic task ID slug (e.g., `feature-name` or `bugfix-description`)
- Store context in `tasks/[task-id].research.md`
- Document in local memory MCP for persistence

### Phase 1: Research

- Utilize semantic search for existing patterns
- Use web search for up-to-date information
- Document findings in `tasks/[task-id].research.md`
- Include brAInwav-specific architectural patterns

### Phase 2: Planning

- Read research file and develop TDD plan
- Create `tasks/[task-id]-tdd-plan.md` with:
  - Scope and goals
  - Testing strategy (write tests first)
  - Implementation checklist with priorities
  - Dependencies and architectural decisions

### Phase 3: Implementation

- Follow TDD plan systematically
- Use named exports, async/await exclusively
- Keep functions ≤ 40 lines
- Include brAInwav branding in all outputs
- Update implementation checklist as work progresses

### Phase 4: Verification

- Run quality gates: `pnpm lint && pnpm test && pnpm security:scan`
- Validate structure: `pnpm structure:validate`
- Check coverage: Ensure 90%+ maintained
- Test accessibility where applicable
- Store lessons learned in local memory

### Phase 5: Archive

- Move completed TDD plan to appropriate documentation location
- **MANDATORY**: Update CHANGELOG.md with entry
- **MANDATORY**: Update README.md if features/changes are user-facing
- Update website documentation for user-facing changes
- Store comprehensive task summary with brAInwav context

### Phase 6: Reality Filter

- Never present generated/inferred content as fact
- Label unverified content: `[Inference]`, `[Speculation]`, `[Unverified]`
- Ask for clarification if information is missing
- Verify all claims before stating as complete

---

## III. Quality Standards

### Code Quality

- ESLint, Biome, and ast-grep enforcement
- Python: Ruff linting with strict mode
- Rust: Clippy with deny warnings
- No `console.log` in production code paths

### Testing Requirements

- Vitest for TypeScript packages
- pytest for Python modules
- Property-based testing for critical algorithms
- Mutation testing with Stryker for high-risk code

### Documentation

- All packages require README.md with:
  - Purpose and scope
  - Installation/setup instructions
  - API documentation
  - Usage examples
  - brAInwav branding
- Keep documentation current with code changes

### Observability

- OpenTelemetry instrumentation for all services
- Structured logging with Pino (TypeScript) or Python logging
- Metrics emission to Prometheus-compatible endpoints
- Include brAInwav context in all telemetry

---

## IV. Feature Development Standards

### Priority-Based User Stories

All features MUST define prioritized user stories:

- **P0 (Critical)**: Blocking issues, security vulnerabilities
- **P1 (High)**: Core functionality, primary user journeys
- **P2 (Medium)**: Important enhancements, secondary features
- **P3 (Low)**: Nice-to-haves, future improvements

Each story must be **independently testable** - implementing just one story should deliver viable value.

### Acceptance Criteria

Use Given-When-Then format:

```markdown
**Given** [initial state]
**When** [user action]
**Then** [expected outcome]
```

### Technical Debt Management

- Document all technical debt in ADRs (Architecture Decision Records)
- Track in GitHub Issues with `technical-debt` label
- Include payoff plan and timeline
- No accumulation without justification

---

## V. Compliance & Governance

### Open Source Licensing

- Apache 2.0 for all brAInwav Cortex-OS code
- License scanning via `pnpm license:validate`
- SBOM generation for compliance: `pnpm sbom:generate`

### Privacy & Data Protection

- GDPR Article 17 compliance (right to erasure)
- Local-first architecture (no data exfiltration)
- Privacy-preserving telemetry
- Transparent data handling policies

### brAInwav Branding Requirements

- All system outputs include "brAInwav" reference
- Error messages branded consistently
- Documentation headers include brAInwav attribution
- Co-authored commits: `Co-authored-by: brAInwav Development Team`

---

## VI. Amendment Process

### Proposing Changes

1. Create ADR in `project-documentation/adrs/`
2. Document rationale and impact analysis
3. Get approval from maintainers
4. Update constitution version (semantic versioning)
5. Announce changes to team

### Conflict Resolution

Hierarchy of authority (highest to lowest):

1. `/.cortex/rules/RULES_OF_AI.md` (immutable ethics)
2. This Constitution
3. `CODESTYLE.md` (coding standards)
4. `AGENTS.md` (agent behaviors)
5. Model-specific guidelines (CLAUDE.md, QWEN.md, GEMINI.md)

---

## VII. Enforcement

**Automated Checks**:

- CI/CD pipeline enforces all quality gates
- Pre-commit hooks validate formatting and linting
- Structure guard validates repository organization
- Pattern guards detect anti-patterns and violations

**Manual Review**:

- All PRs require approval from code owners
- Constitution compliance verified in code review
- Architectural decisions reviewed against principles

**Continuous Improvement**:

- Retrospectives identify process improvements
- Metrics tracked for quality trends
- Regular audits of compliance adherence

---

**This constitution is living documentation. It evolves as brAInwav Cortex-OS matures, but foundational principles remain constant.**

Co-authored-by: brAInwav Development Team
