# AGENTS.md

> **Authority:** This file is the single source of truth for agent roles and workflow for Cortex-OS.
> All implementation must match specifications in this file.  
> CI must validate consistency between this spec and `packages/agents/*`.

---

## 🔄 Mandatory Agentic Coding Workflow

All agents working on brAInwav Cortex-OS must follow this structured 4-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `langgraph-workflow-integration` or `security-agent-enhancement`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**Agent-Specific Research Focus:**

- Existing agent role implementations in `packages/agents/src/agents/`
- LangGraph integration patterns and workflow definitions
- MCP tool contracts and validation schemas
- A2A communication patterns between agents
- Security and compliance requirements (OWASP ASVS baseline)

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** - leverage agent interfaces and contracts
  - **Separation of concerns** - maintain clear agent role boundaries
  - **Single Responsibility Principle (SRP)** - one capability per agent function
  - **Don't Repeat Yourself (DRY)** - share common agent utilities
  - **Keep it Simple, Stupid (KISS)** - avoid complex agent interactions
  - **You Aren't Gonna Need It (YAGNI)** - implement only required capabilities
  - **Encapsulation** - hide agent implementation details
  - **Modularity** - loose coupling between agent roles
  - **Open/Closed Principle** - extend agents via configuration
  - **Testability** - design for deterministic agent testing
  - **Principle of Least Astonishment (POLA)** - predictable agent behavior
  - **Fail Fast** - validate agent inputs and outputs early
  - **High Cohesion, Low Coupling** - related agent functions together
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with agent workflow context

**Agent Planning Requirements:**

- Define clear input/output contracts using TypeScript interfaces
- Plan for MCP tool integration with proper schema validation
- Design A2A event emission for agent coordination
- Include brAInwav branding in agent outputs and error messages
- Plan for agent capability registration and discovery

### 3. Implementation

- **Read the TDD plan** and execute with strict TDD methodology
- **Follow PRP Loop** - `plan → generate → review → refactor`
- **Implementation must be 100% deployable** with no placeholder code
- **Follow agent role patterns** as defined in this specification

**Agent Implementation Standards:**

- Implement agent interfaces as specified (CodeAnalysisAgent, SecurityAgent, etc.)
- Use proper output schemas (CodeAnalysisOutput, SecurityOutput, etc.)
- Include comprehensive error handling with brAInwav context
- Integrate with MCP tools using standardized contracts
- Emit A2A events for agent coordination
- Maintain deterministic behavior for testing

### 4. Verification

- **Verify agent capabilities** match specification requirements
- **Run agent-specific tests** including determinism validation
- **Validate MCP integration** with proper tool contracts
- **Test A2A event emission** for agent coordination
- **Check compliance** with security and accessibility requirements
- **Update task status** to **"verified"** once complete
- **Store agent insights** in local memory for future development

---

## 0) Overview

- **Kernel:** Simplified state machine (`CortexKernel`) without LangGraph; LangGraph support provided via dedicated agents and orchestration layer
- **Workflow:** PRP Loop — `plan → generate → review → refactor`
- **Agents:** Role-based agents that interface with kernel nodes
- **Local-First:** Prefers on-device execution (MLX inference, local vector DB) with optional remote model gateway
- **Teaching:** Review steps include educational feedback
- **Time Freshness:** See `_time-freshness.md` for timezone and date handling rules

---

## 1) Development Setup

### Prerequisites

- Python ≥ 3.11 with **uv**
- Node.js ≥ 20 with pnpm ≥ 9
- Optional: pre-commit hooks

### Bootstrap

```bash
# Python environment
uv venv
uv sync

# Node workspace
pnpm install
pnpm build
```

### Validation

```bash
# Python
uv run ruff check .
uv run pytest

# TypeScript
pnpm lint
pnpm test
```

---

## 2) Agent Roles

Agents live under `packages/agents/src/agents/`:

### CodeAnalysisAgent

- Performs static analysis of source code
- Output: `CodeAnalysisOutput`

### DocumentationAgent

- Generates project documentation from source code
- Validates links and versions
- Output: `DocumentationOutput`

### LangGraphAgent

- Executes workflows using LangGraph
- Output: `LangGraphOutput`

### SecurityAgent

- Scans for security vulnerabilities
- Output: `SecurityOutput`

### TestGenerationAgent

- Generates tests and coverage metrics
- Output: `TestGenerationOutput`

---

## 3) Workflow Contracts

```typescript
interface Brief {
  [key: string]: unknown;
}

interface Plan {
  goals: string[];
  tasks: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
}

interface Review {
  approved: boolean;
  explanation: string;
  evidence: string[]; // file://path:line-range
}
```

---

## 4) Quality Gates

### Phase Gates

- **Design:** Architecture documented, security baseline met
- **Build:** Tests pass, API validated, docs updated
- **Evaluation:** Coverage ≥ 85%, no blockers

### Thresholds

- Blockers: 0 (pipeline fails)
- Major issues: ≤ 3 per phase
- Test coverage: ≥ 85%

---

## 5) MCP Integration

Tools under `packages/mcp/`:

- `kb.ingest({ path, mime })`
- `kb.search({ q })`
- `tasks.create({ title, meta })`
- `context.attach({ runId, evidence })`

---

## 6) Compliance

### Security

- OWASP ASVS baseline
- Zod schema validation
- Tool sandboxing

### Accessibility

- WCAG 2.2 AA compliance
- Keyboard navigation
- ARIA labels

---

## 7) Implementation Notes

- `packages/kernel/src/graph-simple.ts` provides a non-LangGraph kernel implementation
- LangGraph integration is available through `packages/agents` and `packages/orchestration`
- Determinism tests exist (e.g., `packages/kernel/tests/determinism.test.ts`) but are not yet comprehensive

## Agent Toolkit

Use scripts in `agent-toolkit/tools` for search, codemods, diff review and validation as part of the PRP loop.
