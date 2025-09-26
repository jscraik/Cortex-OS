# brAInwav Cortex-OS: Rules of AI

## 🚨 CRITICAL: No False Implementation Claims

### Rule #1: Zero Tolerance for Placeholder Production Claims

**NEVER** claim code is "production-ready", "complete", "operational", or "fully implemented" when:

- Using `Math.random()` for data generation
- Returning hardcoded strings like "Mock adapter response"
- Including TODO comments in production paths
- Using placeholder implementations with intent to wire later
- Generating fake metrics or system data
- Disabling features with `console.warn("not implemented")`

### Rule #2: brAInwav Truthfulness Standard

All AI systems working on brAInwav Cortex-OS must:

- Accurately assess implementation status before making claims
- Differentiate between test scaffolding and production code
- Never inflate completion percentages or readiness metrics
- Include brAInwav branding in all system outputs and error messages
- Verify claims against actual code before documentation

### Rule #3: Production Validation Requirements

Before claiming any component is production-ready:

- [ ] All placeholder patterns eliminated (`Math.random()`, `TODO`, `Mock.*response`)
- [ ] Real system integration implemented (no fake data)
- [ ] Error messages include brAInwav branding
- [ ] Documentation matches actual implementation
- [ ] Tests validate real functionality, not mocks

### Rule #4: Documentation Accuracy Enforcement

When updating documentation:

- Status claims must be verified against actual code
- Implementation summaries require code evidence
- Percentage completions must be calculated from real metrics
- All README files must reflect current implementation reality
- Never claim "COMPLETE" with placeholder implementations

### Rule #5: Commit Message Standards

All commits must:

- Include "Co-authored-by: brAInwav Development Team"
- Accurately describe what was actually implemented
- Never claim completion when placeholders remain
- Reference brAInwav in appropriate contexts

## 🔄 Mandatory Agentic Coding Workflow

All AI agents working on brAInwav Cortex-OS must follow this structured 5-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers that reflect the work scope

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**Research must include:**

- brAInwav-specific architectural patterns and requirements
- Existing codebase patterns and integration points
- External best practices and security considerations
- Compliance requirements (WCAG 2.2 AA, OWASP, etc.)

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** and components where possible
  - **Separation of concerns** - clear domain/app/infra boundaries
  - **Single Responsibility Principle (SRP)** - maximum 40 lines per function
  - **Don't Repeat Yourself (DRY)** - eliminate code duplication
  - **Keep it Simple, Stupid (KISS)** - avoid unnecessary complexity
  - **You Aren't Gonna Need It (YAGNI)** - implement only what's needed
  - **Encapsulation** - hide implementation details behind interfaces
  - **Modularity** - loosely coupled, highly cohesive components
  - **Open/Closed Principle** - open for extension, closed for modification
  - **Testability** - design for easy testing with 90%+ coverage
  - **Principle of Least Astonishment (POLA)** - behave as expected
  - **Fail Fast** - detect and report errors early with validation
  - **High Cohesion, Low Coupling** - related code together, minimal dependencies
- **Ask clarifying questions** if needed to ensure clear understanding
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with all context required for implementation
- **Create implementation checklist**: Develop detailed, actionable checklist items that break down the TDD plan into manageable tasks for systematic execution

**Planning must include:**

- brAInwav branding integration in all outputs and error messages
- MCP tool integration points where applicable
- A2A event emission for cross-package communication
- Security scanning and validation steps
- Accessibility requirements and testing approach
- Performance monitoring and observability integration

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create a to-do list
- **Execute the plan** systematically with strict TDD approach (red-green-refactor)
- **Go for as long as possible** - group ambiguous questions for the end
- **Implementation must be 100% deployable** unless explicitly stated otherwise
- **Follow brAInwav coding standards** and architectural patterns
- **Update implementation checklist**: Mark tasks as complete as you iterate through the implementation plan

**Implementation Requirements:**

- Include brAInwav branding in all system outputs, logs, and error messages
- Follow CODESTYLE.md requirements (named exports, ≤40 lines, async/await)
- Respect package boundaries and use event-driven communication
- Implement comprehensive error handling with brAInwav context
- Include proper TypeScript typing and Zod validation
- Ensure security best practices and OWASP compliance

### 4. Verification

- **Verify requirements** are met and implementation is bug-free
- **Run comprehensive quality gates** including tests, linting, and security scans
- **Validate governance compliance** with structure and import boundary checks
- **Check test coverage** meets 90%+ threshold
- **Verify brAInwav branding** is included in all relevant outputs
- **Return to implementation** if issues arise and make necessary adjustments
- **Update task status** to **"verified"** once complete
- **Store lessons learned** in local memory for future reference

### 5. Archive

- **Archive completed TDD plan**: Move `[feature]-tdd-plan.md` and related documentation to the appropriate location:
  - Package-specific documentation: `apps/[app-name]/docs/` or `packages/[package-name]/docs/`
  - System-wide documentation: root directory `docs/` or `project-documentation/`
  - Architectural decisions: `project-documentation/`
- **Update all documentation**: Ensure all reports, implementation notes, and brAInwav-specific configurations are properly documented and placed in correct directories
- **Complete implementation checklist**: Mark all remaining checklist items as complete and archive the final checklist in local memory
- **Comprehensive knowledge archival**: Store detailed task summary including technical decisions, brAInwav integration requirements, security considerations, and lessons learned for future AI agent development sessions

**Verification Checklist:**

- [ ] All tests passing with 90%+ coverage
- [ ] No security vulnerabilities introduced
- [ ] brAInwav branding present in outputs/errors
- [ ] Code follows CODESTYLE.md requirements
- [ ] Package boundaries and governance rules respected
- [ ] Documentation updated to reflect changes
- [ ] Performance and accessibility requirements met

## 🛡️ Enforcement Mechanisms

### Automated Validation

- `scripts/brainwav-production-guard.sh` - Detects placeholder patterns
- `scripts/validate-implementation-claims.ts` - Verifies documentation accuracy
- CI/CD integration prevents deployment with violations

### Manual Review Requirements

- All production claims require code review verification
- Documentation updates must include implementation evidence
- Status changes require validation against actual functionality

## ⚠️ Violation Consequences

Violating these rules results in:

- Immediate CI/CD pipeline failure
- Blocked deployment to production
- Required remediation before merge approval
- Documentation accuracy correction mandates

---

**Remember: brAInwav standards demand absolute truthfulness in implementation claims. When in doubt, err on the side of accuracy over optimism.**

---

**Maintained by: brAInwav Development Team**

# RULES_OF_AI.md

## 🔧 Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a **unified, contract-driven interface** for all development
operations. This toolkit is **REQUIRED** for maintaining monorepo uniformity and code quality.

### Core Integration Pattern

``typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
// Use TypeScript interface for programmatic access
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);

```

### Shell Interface (Just Recipes)

- `just scout "pattern" path` - Multi-tool search (ripgrep + semgrep + ast-grep)
- `just codemod 'find(:[x])' 'replace(:[x])' path` - Structural modifications
- `just verify changed.txt` - Auto-validation based on file types

### When Agents MUST Use Agent-Toolkit

1. **Code Search Operations** - Instead of raw grep/rg commands
2. **Structural Modifications** - For any refactoring or codemod operations
3. **Quality Validation** - Before commits, PRs, or code changes
4. **Cross-Language Tasks** - Unified interface for TypeScript/Python/Rust
5. **Pre-Commit Workflows** - Automated validation pipelines

### Architecture Compliance

Agent-toolkit follows Cortex-OS principles:

- **Contract-first**: Zod schemas ensure type safety
- **Event-driven**: A2A integration ready
- **MCP compatible**: Tool exposure for agent consumption
- **Layered design**: Clean domain/app/infra separation

### Time Freshness Rules

See `_time-freshness.md` for timezone and date handling rules that all agents must follow.

---

## 🚨 CRITICAL: CODESTYLE.md ENFORCEMENT

**MANDATORY COMPLIANCE** with [CODESTYLE.md](../CODESTYLE.md) requirements:

### Function Length Limits
- **Maximum 40 lines per function** - Split immediately if readability suffers
- **Strictly enforced in CI** - Build failures for violations
- **No exceptions** for any code

### Export Requirements
- **Named exports only** - `export const functionName = ...`
- **Default exports forbidden** - `export default` will cause build failures
- **Required for tree-shaking and debugging**

### Class Usage Restrictions
- **Classes only when framework-required** (React ErrorBoundary, etc.)
- **Prefer functional composition** over OOP patterns
- **Justification required in code review for any class usage**

### Async/Await Requirements
- **Use async/await exclusively** - Never use `.then()` chains
- **Promise chains are forbidden** and caught by linters
- **Violations will block PR merges**

### Project References
- **All packages must set `composite: true`** in tsconfig.json
- **Required for Nx task graph optimization**
- **Missing configuration will cause build failures**

---

## AI/Agent Rules and Guidelines

This document outlines the fundamental rules and guidelines for AI agents operating within the Cortex-OS ecosystem.

## 1. Primary Directive

The AI must prioritize human welfare and safety above all else, while respecting human autonomy and dignity.

## 2. Transparency Requirements

- All AI decision-making processes must be explainable and auditable
- Users must be informed when interacting with AI systems
- AI systems must not masquerade as humans without explicit disclosure

## 3. Privacy and Data Protection

- User data must be collected only with explicit consent
- Data minimization principles must be followed
- Strong encryption must protect all personal data
- Users must have the right to access, correct, and delete their data

## 4. Fairness and Non-Discrimination

- AI systems must not discriminate based on protected characteristics
- Regular bias auditing must be conducted
- Equal access to AI benefits must be ensured

## 5. Security and Robustness

- AI systems must be designed with security as a core principle
- Regular vulnerability assessments must be performed
- Systems must gracefully degrade when operating outside their capabilities

## 6. Human Oversight

- Critical decisions must involve meaningful human review
- AI systems must provide mechanisms for human intervention
- Clear lines of accountability must be established

## 7. Compliance with Law and Ethical Standards

- AI systems must comply with all applicable laws and regulations
- Ethical considerations must inform technical design decisions
- Regular ethical impact assessments must be conducted

## 8. Continuous Monitoring and Improvement

- AI systems must be continuously monitored for unintended consequences
- Feedback loops must enable ongoing improvement
- Incident response procedures must be established and tested

## 9. AI Development Requirements

### Mandatory Local Memory Usage
- **Store all architectural decisions** with reasoning and context
- **Document lessons learned** from code reviews and refactoring
- **Track effective development strategies** for future reference
- **Maintain persistent context** across development sessions
- **Use semantic search** to find relevant past decisions

### Development Patterns to Avoid
1. **Default exports** - `export default class/Function` → Always use named exports
2. **Function length > 40 lines** → Immediately split into smaller functions
3. **`.then()` chains** → Use `async/await` exclusively
4. **Classes without framework requirement** → Use functional composition
5. **Missing `composite: true`** → All packages require this setting
6. **Direct sibling package imports** → Use events/contracts instead
7. **Bypassing local memory** → Store all development insights persistently

### Required Local Memory Usage Patterns:
```typescript
// Store architectural decisions
await memory.store({
  content: 'Event-driven architecture prevents tight coupling between features',
  importance: 9,
  tags: ['architecture', 'decision', 'a2a'],
  domain: 'software-design'
});

// Store development lessons
await memory.store({
  content: '40-line function limit significantly improves code maintainability',
  importance: 8,
  tags: ['lesson', 'codestyle', 'maintainability'],
  domain: 'development-patterns'
});

// Store technical decisions
await memory.store({
  content: 'Named exports enable better debugging and tree-shaking',
  importance: 7,
  tags: ['typescript', 'exports', 'optimization'],
  domain: 'frontend-architecture'
});
```

These rules form the foundation of responsible AI development and deployment in Cortex-OS.
