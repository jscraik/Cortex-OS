# AGENTS.md

> **Authority:** This file is the single source of truth for agent roles and workflow for Cortex-OS.
> All implementation must match specifications in this file.  
> CI must validate consistency between this spec and `packages/agents/*`.

---

## 0) Overview

- **Kernel:** Single deterministic orchestrator (`CortexKernel`) using LangGraph
- **Workflow:** PRP Loop — `plan → generate → review → refactor`
- **Neurons:** Role-based agents that interface with kernel nodes
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

### ProductManagerNeuron

- Derives goals from briefs
- Creates acceptance criteria
- Output: `Plan`

### ArchitectNeuron

- Designs system architecture
- Documents decisions (ADRs)
- Output: `Architecture.md`

### ImplementerNeuron

- Generates code from plans
- Output: `{ code }`

### ReviewerNeuron

- Evidence-based code review
- Output: `Review` with evidence links

### QANeuron

- Test generation and coverage
- Output: `{ failing, coverage, fixes }`

### DocsNeuron

- Maintains documentation
- Validates links and versions
- Output: `{ docsChanges, linkcheck }`

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

⚠️ **Inconsistencies to resolve:**

- Missing SecurityNeuron, A11yNeuron, PerformanceNeuron implementations
- TeacherNeuron, ResearcherNeuron not in current codebase
- ProjectManagerNeuron referenced but not implemented
- MCP path should be `packages/mcp/` not `apps/cortex-os/packages/mcp/`
- Missing determinism tests referenced in spec
- No evidence of LangGraph integration in kernel

📍 **Action Required:** Align this spec with actual implementation in `packages/agents/`
