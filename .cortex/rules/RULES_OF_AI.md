# brAInwav Cortex-OS: Rules of AI

**Version**: 1.1.0  
**Last Updated**: 2025-10-11  
**Maintainer**: brAInwav Development Team

---

## 🏛️ Hierarchy of Authority

When documents overlap or conflict, follow this order (highest to lowest):

1. **Governance Pack (`/.cortex/rules/`)** — binding project rules (this document is part of it)
2. **CODESTYLE.md** (root) — coding & testing conventions enforced by CI
3. **AGENTS.md** (root) — operational rules for agents; defaults for the repo
4. **Package-level `AGENTS.md`** — may tighten rules but cannot weaken repo standards
5. **Model guides** (`CLAUDE.md`, `QWEN.md`, `GEMINI.md`) — adapter specifics only

### Governance Pack Files (Mandatory Reading)

- **[Time Freshness Guard](/_time-freshness.md)** — timezone/date handling rules
- **[Vision](/vision.md)** — end-state, scope, non-goals, allowed interfaces
- **[Agentic Coding Workflow](/agentic-coding-workflow.md)** — task lifecycle, gates, handoffs
- **[Task Folder Structure](/TASK_FOLDER_STRUCTURE.md)** — mandatory `~/tasks/[feature]/` organization
- **[Code Review Checklist](/code-review-checklist.md)** — evidence-backed review criteria
- **[CI Review Checklist](/CHECKLIST.cortex-os.md)** — step-by-step execution checklist
- **This document (RULES_OF_AI.md)** — ethical guardrails, branding, production bars
- **[Constitution](/constitution.md)** — binding charter for decision authority

---

## 🏛️ GOVERNANCE: brAInwav Project Structure Standards

**CRITICAL**: This repository follows strict governance standards for file placement and structural integrity. Only approved files belong at the root level to maintain architectural clarity and brAInwav standards.

### Root-Level Files Policy

- **Model Documentation**: Only comprehensive, authoritative instruction files (AGENTS.md, CLAUDE.md, QWEN.md, GEMINI.md) belong at root
- **Foundation Documents**: Core standards like CODESTYLE.md, README.md, CHANGELOG.md at root level
- **Governance Enforcement**: Structure Guard validates root entries against `allowedRootEntries` list
- **brAInwav Compliance**: All root files must include brAInwav branding and company context

**AI Agent Responsibility**: When creating or moving files, verify they belong at root level according to governance standards. Specialized rules and configuration belong in appropriate subdirectories (`.cortex/rules/`, `config/`, etc.).

**Reference**: See Structure Guard policy and governance documentation for complete file placement standards.

---

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

All AI agents working on brAInwav Cortex-OS must follow this structured **7-phase workflow**. For complete details, see **[agentic-coding-workflow.md](agentic-coding-workflow.md)**.

### Task Folder Structure (MANDATORY)

All task artifacts must be stored in `~/tasks/[feature-name]/` following the **[TASK_FOLDER_STRUCTURE.md](TASK_FOLDER_STRUCTURE.md)** specification:

```
~/tasks/[feature-name]/
├── research.md              # Phase 1: Research findings, RAID analysis
├── implementation-plan.md   # Phase 2: High-level strategy, SRS
├── tdd-plan.md             # Phase 2: BDD scenarios, TDD test outlines
├── implementation-checklist.md  # Phase 2: Actionable tasks with checkboxes
├── implementation-log.md    # Phase 3: Real-time progress notes
├── code-review.md          # Phase 4: Review findings and resolutions
├── HITL-feedback.md        # Phase 4: Human-in-the-loop decisions
├── lessons-learned.md      # Phase 5: Key insights and takeaways
├── SUMMARY.md              # Phase 7: Comprehensive final summary
├── design/                 # Architecture diagrams, wireframes
├── test-logs/              # Test execution results
├── verification/           # Quality gate results, coverage reports
├── validation/             # CI/CD deployment validation
├── refactoring/            # Refactoring plans and summaries
└── monitoring/             # Production monitoring logs
```

**Reference**: See [TASK_FOLDER_STRUCTURE.md](TASK_FOLDER_STRUCTURE.md) for complete requirements and examples.

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

### 5. Verification

- **Run quality gates**: Execute `pnpm lint && pnpm test && pnpm security:scan`
- **Validate structure**: Run `pnpm structure:validate` to ensure repo organization compliance
- **Check coverage**: Ensure ≥90% coverage maintained (PR merge gates: branch ≥65%, mutation ≥75%)
- **Test accessibility**: Validate WCAG 2.2 AA compliance where applicable
- **Reality Filter validation**: Verify all generated/inferred content is labeled with `[Inference]`, `[Speculation]`, or `[Unverified]` tags
- **brAInwav branding verification**: Confirm all outputs, error messages, and logs include brAInwav references
- **Mock production claims audit**: Validate no code claims production-readiness while containing:
  - `Math.random()` fake data
  - Hardcoded mocks or TODOs in production paths
  - Placeholder implementations
  - Fake metrics or telemetry
- **Close feedback loops**: Address all issues from code review, testing, HITL, and refactoring
- **Store lessons learned**: Document resolutions and insights in `~/tasks/[feature]/lessons-learned.md` and local memory

**Verification Checklist**:

- [ ] All tests passing with ≥90% coverage (branch ≥65% for PR merge)
- [ ] No security vulnerabilities introduced
- [ ] brAInwav branding present in outputs/errors
- [ ] Code follows CODESTYLE.md requirements (≤40 lines/function, named exports, async/await)
- [ ] Package boundaries and governance rules respected
- [ ] Documentation updated to reflect changes
- [ ] Performance and accessibility requirements met
- [ ] Reality Filter applied - no unverified claims presented as fact

### 6. Monitoring, Iteration & Scaling

- **Active monitoring**: Maintain deployment dashboards and log analysis
- **Track metrics**: Monitor performance, cost, and user metrics
- **Iterate rapidly**: Respond to feedback, incidents, and drift
- **Update tests**: Adjust monitoring hooks and documentation as needed
- **Model updates**: For AI components, record model performance, drift detection, and retraining activities in `~/tasks/[feature]/monitoring/`
- **Scale & optimize**: Consider scalability and efficiency improvements; document in task folder

### 7. Archive

- **Archive artifacts**: Move all task artifacts to long-term storage (remains under `~/tasks/[feature]/` but flagged as archived):
  - Final SRS, design diagrams, plans
  - Test logs, HITL feedback, refactoring summaries
  - Verification reports, monitoring logs
  - Comprehensive task summary
- **MANDATORY: Update change documentation**:
  - **CHANGELOG.md**: Add entry documenting what was completed, files changed, and impact
  - **README.md**: Update relevant sections if new features or significant changes were made
  - **Website documentation**: Update for user-facing changes
- **Update package documentation**: Refresh package READMEs, runbooks, and monitoring guides
- **Record outcomes**: Mark all checklist items complete in `implementation-checklist.md`
- **Write comprehensive SUMMARY.md**: Capture:
  - Research findings and decisions
  - Implementation details and challenges
  - Review comments and resolutions
  - Test outcomes and coverage
  - HITL decisions and rationales
  - Refactoring notes
  - Verification results
  - Monitoring/iteration lessons
- **Ensure traceability**: The archived `~/tasks/[feature]/` folder contains full context for reproducibility and auditability



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

## 🔗 Integration Points & System Boundaries

Per **[vision.md](vision.md)** section 2, Cortex-OS exposes **only** these controlled interfaces:

### Allowed Integration Surfaces

1. **MCP (Model Context Protocol)** over HTTP/SSE (and optional STDIO)
   - FastMCP v3 server: `/mcp`, `/sse`, `/health`, `/metrics`
   - API-key auth required by default (dev may allow `NO_AUTH=true`)
   - Tools/Resources/Prompts registered, not embedded
   - Single MCP hub — no duplicate MCPs per package

2. **A2A (Agent-to-Agent Hub)** for intra-runtime messaging
   - Central bus for topics, intents, envelopes
   - Policies for routing, retries, backoff, auditing
   - No direct cross-domain imports

3. **REST API** for programmatic control and integrations
   - Authenticated endpoints
   - Rate-limited
   - Policy-guarded

4. **Frontier Model Adapters**
   - OpenAI/Anthropic/Google adapters
   - ChatGPT Connectors/Apps SDK
   - Perplexity SSE

### Non-Goals (Prohibited)

- Multiple MCP servers per package (duplication)
- Unbounded interfaces beyond MCP/A2A/REST/frontier
- Opaque AI actions without evidence/logs
- Side channels or undocumented ports

### Package Vision Alignment

When implementing features, verify alignment with package vision per **[vision.md](vision.md)** section 4:

- **packages/mcp-server**: Zero business logic; registry loader only
- **packages/mcp-core**: Protocol utilities, schemas, error taxonomy
- **packages/a2a**: Central hub only (no per-package A2A)
- **packages/memory-core**: Single source of truth for memories
- **packages/rag**: Deterministic pipelines with versioned configs
- **packages/agents**: Role-scoped with policy gates
- **packages/orchestration**: LangGraph graphs for core flows

**"Done Means"**: Every package has explicit completion criteria in vision.md. Verify implementation meets these before claiming completion.

---

**Maintained by: brAInwav Development Team**

---

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

### Function Length Limits (CODESTYLE.md Enforcement)
- **Maximum 40 lines per function** - Split immediately if readability suffers
- **Strictly enforced in CI** - Build failures for violations
- **No exceptions** for any code
- Use composition and guard clauses to reduce complexity

### Export Requirements
- **Named exports only** - `export const functionName = ...`
- **Default exports forbidden** - `export default` will cause build failures
- **Required for tree-shaking and debugging**

### Class Usage Restrictions (CODESTYLE.md §3)
- **Classes only when framework-required** (React ErrorBoundary, etc.)
- **Prefer functional composition** over OOP patterns
- **Justification required in code review** for any class usage
- Minimize hidden state and side effects

### Async/Await Requirements
- **Use async/await exclusively** - Never use `.then()` chains
- **Promise chains are forbidden** and caught by linters
- **Violations will block PR merges**

### TypeScript Project Configuration (CODESTYLE.md §3.1)

**All buildable TypeScript packages MUST have**:

```json
{
  "compilerOptions": {
    "composite": true,      // REQUIRED - enables incremental builds
    "outDir": "dist",       // REQUIRED - standard output directory
    "noEmit": false,        // REQUIRED when composite: true
    "module": "NodeNext",   // REQUIRED - ESM support
    "moduleResolution": "NodeNext"  // REQUIRED - ESM resolution
  },
  "include": ["src/**/*"],  // REQUIRED - source files only
  "exclude": ["dist", "node_modules", "**/*.test.ts", "tests/**/*"]
}
```

**Templates**: Available in `.cortex/templates/tsconfig/`
- Use `tsconfig.lib.json` for libraries
- Use `tsconfig.spec.json` for test configurations
- See templates for complete setup instructions

**Migration**: Run `pnpm tsx scripts/migrate-tsconfig.ts` for existing packages

**Validation**: `pnpm structure:validate` checks compliance

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

Per **[AGENTS.md](../../AGENTS.md)** section 14:

- **Store all architectural decisions** with reasoning and context
- **Document lessons learned** from code reviews and refactoring
- **Track effective development strategies** for future reference
- **Maintain persistent context** across development sessions
- **Use semantic search** to find relevant past decisions
- **Dual-mode operation**: Follow `docs/local-memory-fix-summary.md` for MCP/REST parity
- **Memory entry verification**: PR reviewers must confirm memory entries exist
- **Operate per `.github/instructions/memories.instructions.md`**: Document evidence in TDD plan

**At every decision, refactor, or rectification**:
1. Append rationale and evidence to `.github/instructions/memories.instructions.md`
2. Persist same entry via Local Memory MCP/REST dual mode
3. Tag with task name for retrieval
4. Reference `LocalMemoryEntryId` in task files

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

## 🕐 Time Freshness & Date Handling (MANDATORY)

Per **[_time-freshness.md](_time-freshness.md)**, all agents must:

- **Anchor to current date**: The user's timezone is provided at session start. Today's date is the reference point.
- **Treat dates correctly**: Dates before today are past; dates after are future.
- **Verify freshness**: When asked for "latest", "most recent", "today's", etc., do not assume knowledge is current—verify or ask.
- **Use ISO-8601**: Convert relative language ("yesterday", "next week") to explicit ISO-8601 dates (e.g., `2025-10-11`).
- **Separate past/future**: Clearly distinguish historical context from future dates to prevent timeline drift.

**Example**:
```markdown
❌ "The latest version was released recently"
✅ "The latest version (v2.1.0) was released on 2025-10-08"
```

---

## 🎯 Reality Filter & Truthfulness (MANDATORY)

Per **[constitution.md](constitution.md)** Phase 5 verification requirements:

### Core Principles

- [ ] **Never present generated, inferred, speculated, or deduced content as fact**
- [ ] **Label all unverified content** at the start of sentences with:
  - `[Inference]` — logical deduction from available data
  - `[Speculation]` — educated guess without confirmation
  - `[Unverified]` — claim that cannot be verified against code/docs

### When Uncertain

If you cannot verify something directly, explicitly state:
- "I cannot verify this."
- "I do not have access to that information."
- "My knowledge base does not contain that."

### Dangerous Claims (Require Evidence)

Label these words unless you have source code proof:
- Prevent, Guarantee, Will never, Fixes, Eliminates, Ensures that

### LLM Behavior Claims

For claims about LLM behavior (including your own):
- Include `[Inference]` or `[Unverified]` tag
- Add note: "based on observed patterns" or "according to documentation"

### Self-Correction Protocol

If you violate this directive, immediately say:
> Correction: I previously made an unverified claim. That was incorrect and should have been labeled `[Inference/Speculation/Unverified]`.

### Additional Rules

- [ ] Ask for clarification if information is missing—do not guess or fill gaps
- [ ] If any part is unverified, label the entire response
- [ ] Do not paraphrase or reinterpret input unless requested
- [ ] Never override or alter user input unless explicitly asked

**Integration with Verification Phase**: During Phase 5 verification, validate that all documentation and code comments comply with Reality Filter requirements.

---

## 10. Quality Gates: Coverage, Mutation, TDD (CODESTYLE.md §10)

**PR Merge Gate (must pass)** — Updated thresholds per CODESTYLE.md:

- Branch coverage ≥ **65%** (`BRANCH_MIN` env override)
- Mutation score ≥ **75%** (`MUTATION_MIN` env override)

**Aspirational baselines (Vitest config)** — Maintain where possible:

- Statements 90% • Branches 90% • Functions 90% • Lines 95%

**Readiness workflows**

- Package-level release readiness may enforce **≥95%** coverage (per workflow policy)
- Changed-lines coverage must be **≥95%** per PR

**Mutation testing**

- Use **Stryker** for JS/TS packages
- Enforce `MUTATION_MIN` in CI
- Produce badges/metrics in `reports/badges/`

**TDD enforcement** — Use `packages/tdd-coach`:

- Dev watch mode for real-time feedback
- Pre-commit validation for staged files
- CI status check blocks non-compliant PRs
- Required for Phase 2 (Planning) TDD plan creation

---

## 11. Automation & Agent-Toolkit (MANDATORY for agents)

Per **CODESTYLE.md §11** and **RULES_OF_AI.md §9**:
