# AGENTS.md

> **Authority:** This file is the single source of truth for agent roles and workflow for Cortex-OS.
> All implementation must match specifications in this file.  
> CI must validate consistency between this spec and `packages/agents/*`.

---

## 0) Overview

- **Kernel:** Simplified state machine (`CortexKernel`) without LangGraph; LangGraph support provided via dedicated agents and orchestration layer
- **Workflow:** PRP Loop — `plan → generate → review → refactor`
- **Agents:** Role-based agents that interface with kernel nodes
- **Local-First:** Prefers on-device execution (MLX inference, local vector DB) with optional remote model gateway
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
