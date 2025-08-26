# AGENTS.md

> **Authority:** This file is the single source of truth for agent roles in Cortex-OS.  
> All other guides (Claude, Copilot, etc.) must defer to it.  
> CI must fail if this file is inconsistent with `packages/agents/*`.

---

## 0) Overview

- **Kernel:** Single deterministic orchestrator (`CortexKernel`) wrapping LangGraph.
- **Workflow:** PRP Loop — `plan → generate → review → refactor`.
- **Neurons:** Thin, role-based wrappers around kernel nodes.
- **Local-First:** Runs entirely on-device (MLX inference, local vector DB, no cloud).
- **Teaching Overlay:** Every review step doubles as a teaching step.

---

## 0.1) Dev Setup (uv + pnpm)

> Use deterministic, local-only tooling. No network calls at runtime unless explicitly allowed by rules.

### Prerequisites
- Python ≥ 3.11, **uv** installed
- Node ≥ 20, pnpm ≥ 9
- pre-commit (optional but recommended)

### Bootstrap
```bash
# Python env + deps
uv venv
uv sync  # or: uv pip install -r requirements.txt
uv run pre-commit install || true

# Node workspaces
pnpm install
pnpm build
```

### Quick checks
```bash
# Lint & style
uv run ruff check . && uv run black --check . && uv run mypy || true
pnpm lint && pnpm typecheck

# Unit & integration tests
uv run pytest -q
uv run coverage run -m pytest && uv run coverage report --fail-under=85
pnpm test
```

---

## 0.2) Code Style & Versioning

- **Python**: ruff, black, mypy (strict). Config checked into repo.
- **JS/TS**: eslint, prettier, `tsc --noEmit`.
- **Commits**: Conventional Commits. Example: `feat(scope): add TDD gate`.
- **Versioning**: SemVer. Breaking changes bump MAJOR.
- **Enforcement**: pre-commit hooks locally; CI runs the same linters and type checks.

---

## 1) Core Neurons (Roles)

> All neurons run under Cerebrum orchestration. Every neuron MUST log the AGENTS.md hash from withDocs() into run metadata.

### Cerebrum (Orchestrator)

- **Responsibilities:** Route phases, enforce gates, collect evidence, persist provenance.
- **Invokes:** plan, generate, review, refactor, evaluate
- **Output:** `{ state, gateResults, next }`

### ProductManagerNeuron

- **Responsibilities:** Derive goals, tasks, acceptance criteria from `Brief`.
- **Invokes:** plan
- **Output:** `Plan`

### ProjectManagerNeuron

- **Responsibilities:** Translate plan into timeline, owners, checkpoints.
- **Invokes:** plan
- **Output:** Roadmap (Markdown) + MCP tasks sync

### ArchitectNeuron

- **Responsibilities:** Propose architecture, boundaries, contracts, data flow.
- **Invokes:** review (design), evaluate (constraints)
- **Output:** `Architecture.md` + ADR entries

### ImplementerNeuron

- **Responsibilities:** Turn plan + architecture into code changes.
- **Invokes:** generate
- **Output:** `{ code }`

### ReviewerNeuron

- **Responsibilities:** Evidence-based code review mapped to `Review`.
- **Invokes:** review
- **Output:** `Review`

### SecurityNeuron

- **Responsibilities:** Enforce OWASP ASVS baseline; flag secrets/crypto/auth/input issues.
- **Invokes:** review
- **Output:** `Review` items with severity + references

### A11yNeuron

- **Responsibilities:** Enforce WCAG 2.2 AA across UI, Storybook, and docs examples.
- **Invokes:** review
- **Output:** `Review` items with labels/roles/focus-order evidence

### PerformanceNeuron

- **Responsibilities:** Perf budgets, Lighthouse/TTI checks, bundle budgets.
- **Invokes:** review
- **Output:** `Review` items with metrics and thresholds

### QANeuron

- **Responsibilities:** Test generation, coverage deltas, failing spec isolation.
- **Invokes:** evaluate
- **Output:** `{ failing, coverage, fixes }`

### DocsNeuron

- **Responsibilities:** Keep PRP/blueprints/API docs current; validate links/TTL/version.
- **Invokes:** review, evaluate
- **Output:** `{ docsChanges, linkcheck }`

### ResearcherNeuron

- **Responsibilities:** Collect standards/external references; map to rules.* IDs.
- **Invokes:** evaluate
- **Output:** `{ sources[], mappings[] }`

### TeacherNeuron

- **Responsibilities:** Explain concepts, decisions, and alternatives. Adapt to learning style.
- **Invokes:** review
- **Output:** `{ explanation, reasoning, learningObjectives, nextSteps }`

---

## 2) Node Contracts

```ts
plan(input: Brief) → Plan
generate(input: { plan, brief }) → { code }
review(input: { code, plan, brief }) → Review
refactor(input: { code, review }) → { code }

Types

type Brief = Record<string, unknown>;

type Plan = {
  goals: string[];
  tasks: { id: string; title: string; done: boolean }[];
};

type Review = {
  approved: boolean;
  explanation: string;
  reasoning: string;
  evidence: string[];            // file://path:line-range
  learningObjectives: string[];
  nextSteps: string[];
};
```

## 2.1) Phases, Gates, and Owners

### Phase 1 — Strategy & Design

- **Gates:** Blueprint linked (DocsNeuron), ASVS L1 baseline (SecurityNeuron), UX sketches meet WCAG 2.2 AA (A11yNeuron), Architecture diagram consistent (ArchitectNeuron)

### Phase 2 — Build

- **Gates:** Backend compiles + tests pass (QANeuron), API schema validated (ImplementerNeuron + QANeuron), Security scanners ≤ majors threshold (SecurityNeuron), Frontend Lighthouse/Axe ≥ budget (PerformanceNeuron + A11yNeuron), Docs complete (DocsNeuron)

### Phase 3 — Evals

- **Gates:** All neurons pass TDD (QANeuron), ReviewerNeuron ≤ 0 blockers and ≤ 3 majors, A11y/Perf/Sec budgets ≥ thresholds, **Cerebrum consensus**: ship or recycle

**Budgets**

- Blockers: fail pipeline
- Majors: allowed up to 3 per phase
- Minors: allowed; filed as tech debt

---

## 3) Determinism & Policy

•Run IDs: Every execution pinned.
•Pinned Params: Model/temperature/top-p must be fixed in config.
•Snapshots: Inputs/outputs logged for replay.
•Policy: local_only = true, evidence_required = true.
•Test: determinism.test.ts must deep-equal same inputs.

---

## 3.1) Testing & TDD (uv)

**TDD cycle:** Red → Green → Refactor.

- **Red**: write a failing test first.
- **Green**: write minimal code to pass.
- **Refactor**: improve structure while tests stay green.

**Commands**
```bash
# Python
uv run pytest --maxfail=1 --disable-warnings -q
uv run coverage run -m pytest && uv run coverage report --fail-under=85

# JavaScript/TypeScript
pnpm test
```

**Budgets & gates**
- Coverage ≥ 85% on changed Python packages; TS projects must typecheck clean.
- ReviewerNeuron must report **0 blockers**, **≤ 3 majors**.
- A11y: Axe/Lighthouse budgets must meet thresholds.

---

## 4) MCP Integration

All MCP tools live under apps/cortex-os/packages/mcp/:
•kb.ingest({ path, mime }) → ok
•kb.search({ q }) → { items[] }
•tasks.create({ title, meta }) → { id }
•tasks.list() → { tasks[] }
•context.attach({ runId, evidence }) → ok

## 5) Accessibility & Security

•Accessibility: WCAG 2.2 AA, keyboard navigation, ARIA labels, no color-only cues.
•Security:
•OWASP ASVS (baseline)
•MITRE ATLAS (AI/ML threat modeling)
•Zod schema-first validation
•Tool sandboxing, deny network unless explicitly allowed

## 6) Acceptance Criteria

• Determinism tests pass
• review.evidence.length > 0 (file:// or url + line-range)
• ReviewerNeuron: blockers = 0, majors ≤ 3
• A11y budgets met (WCAG 2.2 AA on UI + Storybook/docs)
• Performance budgets met (Lighthouse ≥ thresholds)
• Security: ASVS baseline met; secrets/crypto/auth/input validated
• Docs updated (AGENTS.md, PRP, API) with valid links and TTL
• MCP tools only under consolidated path

## 7) Dependency Graph

Brief → plan → generate → review → refactor
              ↘────── teacher overlay ─────↗

---

## 8) Versions, TTL, and Localization

- Every doc that neurons cite must include frontmatter `version: vX.Y` and `ttl: 90d`.
- CI fails on expired TTL.
- Localization hook: optional `lang: en-GB` frontmatter; Cerebrum selects preferred locale when available.

---

## 9) Developer Tips

- Prefer `uv run <tool>` to guarantee environment determinism.
- Run `pnpm lint:fix` and `uv run ruff --fix` before committing.
- Use `pnpm test:watch` and `uv run pytest -q` during active development.
- PRs that add features must include or link a PRP in `.cortex/library/blueprints/`.
- When changing UI or docs, cite `.cortex/library/rules/a11y.md` in the PR body.
- When touching auth/secrets/crypto/input, cite `.cortex/library/rules/security.md`.

---

📍 **Location**: Put `AGENTS.md` at repo root. Delete scattered role specs (`docs/agents.md`, `.cortex/neuron-specifications.md`) once merged.  
📍 **Next Step**: Wire CI to check that `packages/agents/*` exports match this spec.

---