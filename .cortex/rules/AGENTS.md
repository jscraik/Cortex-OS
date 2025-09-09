# AGENTS.md

> **Authority:** This file is the single source of truth for agent roles and workflow for Cortex-OS.
> All implementation must match specifications in this file.  
> CI must validate consistency between this spec and `packages/agents/*`.

---

## 0) Overview

- **Kernel:** Single deterministic orchestrator (`CortexKernel`) using LangGraph
- **Workflow:** PRP Loop — `plan → generate → review → refactor`
- **Agents:** Role-based agents that interface with kernel nodes
- **Local-First:** On-device execution (MLX inference, local vector DB, no cloud dependencies)
- **Teaching:** Review steps include educational feedback

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

### Cerebrum (Orchestrator)

- Routes workflow phases
- Enforces quality gates
- Manages provenance

### CodeAnalysisAgent

- Performs static analysis of code
- Can be used for architecture and review-related tasks
- Output: `AnalysisReport`

### DocumentationAgent

- Maintains documentation
- Validates links and versions
- Output: `{ docsChanges, linkcheck }`

### LangGraphAgent

- Integrates with LangGraph for stateful workflows
- Output: `GraphState`

### SecurityAgent

- Scans for security vulnerabilities
- Output: `SecurityReport`

### TestGenerationAgent

- Generates tests and measures coverage
- Output: `{ failing, coverage, fixes }`

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

⚠️ **Implementation Status & Notes:**

- **Agent Mismatch**: The implemented agents (`CodeAnalysisAgent`, `DocumentationAgent`, `LangGraphAgent`, `SecurityAgent`, `TestGenerationAgent`) do not directly map to the legacy agent roles originally specified. Roles like `ProductManager`, `Implementer`, and `Reviewer` are not explicitly implemented as separate agents.
- **Inadequate Determinism Tests**: While test files for determinism exist (e.g., `packages/kernel/tests/determinism.test.ts`), they are known to be flawed and do not provide true determinism guarantees.
- **Inconsistent LangGraph Integration**: LangGraph is used in the `orchestration` and `agents` packages, but the core kernel (`packages/kernel/src/graph-simple.ts`) is explicitly a non-LangGraph implementation, creating an architectural inconsistency.

📍 **Action Required:** Align this spec with actual implementation in `packages/agents/`
