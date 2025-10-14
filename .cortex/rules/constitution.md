---
trigger: always_on
alwaysApply: true
---
# brAInwav Cortex-OS Constitution

**Version**: 1.2.0  
**Ratified**: 2025-10-08  
**Last Amended**: 2025-10-12  
**Maintainer**: brAInwav Development Team

---

## Purpose

This constitution defines the **foundational principles** that govern all development within the brAInwav Cortex-OS ecosystem. It complements and extends `RULES_OF_AI.md` and `CODESTYLE.md` with project-specific governance for feature development, agent behavior, and quality standards. It is part of the **Governance Pack** (`/.cortex/rules/*`).

---

## I. Core Principles

### 1. brAInwav Production Standards (NON-NEGOTIABLE)

**No Mock Production Claims**: Never describe any implementation as "production-ready", "complete", "operational", or "fully implemented" if it contains any of the following in production paths:
- `Math.random()` or fabricated data
- Hardcoded mocks or placeholder adapters ("will be wired later")
- `TODO`/`FIXME`/`HACK`, or `console.warn("not implemented")`
- Fake metrics/telemetry

**brAInwav Branding**: All system outputs, error messages, health checks, and status logs **must** include brAInwav branding (`"[brAInwav]"` and `brand:"brAInwav"` in structured logs).

**Evidence-Based Status**: Status claims must be verified against passing gates and attached evidence.

**Type Safety & Style (prod paths)**: No `any` in TS, **named exports only**, max **40 lines per function**, guard clauses, strict boundary types, `async/await` with `AbortSignal`.

**Domain Boundaries**: No cross-domain imports; interact via declared contracts (A2A topics, MCP tools/resources/prompts).

### 2. Test-Driven Development (MANDATORY)

**Red–Green–Refactor**:
1) Write failing tests first  
2) Implement minimal pass  
3) Refactor while staying green

**Coverage Requirements**: ≥ **90% global**, ≥ **95% changed lines**; mutation ≥ **90%** where enabled. TDD plan stored per task.

### 3. Accessibility First (WCAG 2.2 AA)

Semantic HTML/ARIA, keyboard complete, target ≥ 44×44 CSS px, screen-reader coverage via `jest-axe`/axe. Include branding in a11y announcements where appropriate.

### 4. Monorepo Integrity

Use affected-only **smart** targets (`pnpm *:smart`), respect Nx dependency graph, forbid circular deps. Follow repo structure rules and structure guard.

### 5. Agent-First Architecture

**MCP** for external tools (contracts with Zod; audited via MCP audit events).
**A2A** for inter-agent comms (event envelopes; no direct cross-domain imports).
**Local Memory** for persistent context with **MCP/REST parity** (see §II.3 & §III Documentation).
**Wikidata Semantic Surface**: The Wikidata connector defined in `config/connectors.manifest.json` is the canonical
semantic-knowledge interface. Agents must route fact-finding and entity enrichment through this surface unless the
Constitution grants an explicit waiver.

### 6. Security by Default

Semgrep (**block ERROR**), gitleaks (**block ANY**), OSV clean, SBOM (CycloneDX), provenance (SLSA/in-toto), minimal/pinned containers (non-root, read-only FS, drop caps). **No secrets in code**. Use shared env loader (`scripts/utils/dotenv-loader.mjs` or `@cortex-os/utils`) — **never call `dotenv.config()` directly**. Retrieve API keys, SSH keys, and tokens via the 1Password CLI (`op`) at call time; do not persist them in shell profiles, repo artifacts, or long-lived environment variables.

### 7. Time Freshness Guard

All reasoning anchored to harness "today"; convert relative dates to **ISO-8601**; treat "latest/current" as freshness checks. (See `/_time-freshness.md`.)

### 8. Hybrid Model Solution — **Live Only**

Embeddings, rerankers, generations must use **live** engines (MLX, Ollama, or approved Frontier). **No stubs, recorded outputs, or "dry_run" modes.** Pre-merge evidence requires `pnpm models:health && pnpm models:smoke` logs (engine, model IDs, vector dims/norms, latency).

### 9. Governance Hooks (AGENTS.md + Vibe-Check)

Agents must load the nearest `AGENTS.md` and record its SHA (`AGENTS_MD_SHA:<sha>`) in run state and logs. Agents must call **Vibe Check MCP** `vibe_check` after planning and **before** file writes/network calls/long runs; logs must include `"brAInwav-vibe-check"`.

---

## II. Development Workflow (Phases & HITL)

### Phase Machine (R → G → F → REVIEW) — HITL Only at REVIEW

- **R (Red)**: Write failing tests; plan minimal pass. No `human_input`.  
  Auto-advance to **G** once new failing tests then pass on next commit.

- **G (Green)**: Implement to pass; run security scans and live model smoke. No `human_input`.  
  Auto-advance to **F** when tests pass and coverage gates met.

- **F (Finished)**: Refactor, docs, a11y, SBOM/provenance, structure guard. No `human_input`.  
  Auto-advance to **REVIEW** when a11y + scans + live-model evidence attached.

- **REVIEW**: **HITL permitted**; complete Code Review Checklist; approvals/waivers per Constitution.

**Forbidden**: Any `human_input` before REVIEW is a policy violation.

### Evidence Tokens (CI-Scanned)

- `AGENTS_MD_SHA:<sha>`  
- `PHASE_TRANSITION:<from>-><to>`  
- `brAInwav-vibe-check`  
- `MODELS:LIVE:OK engine=<mlx|ollama|frontier>`

### Phase 0–7 (Task Spine)

Keep the existing task spine (Initialization → Research → Planning → Implementation → Review/Testing/Validation/Monitoring → Verification → Monitoring/Iteration/Scaling → Archive), with these **constitutional inserts**:
- At **Planning**: prepare checklist, vibe-check plan, time-freshness normalization, and live-model probes.  
- At **Implementation**: enforce style, domain boundaries, env loader, and memory parity.  
- At **Verification**: enforce coverage/mutation, structure guard, a11y reports, branding checks, hybrid live-only evidence.  
- At **Archive**: mirror filled checklist to `.cortex/audit/reviews/<PR_NUMBER>-<SHORT_SHA>.md`.

---

## III. Quality Standards

### Code Quality

ESLint/Biome/ast-grep; Python Ruff; Rust Clippy; no `console.log` in prod paths; deterministic outputs; structured logs with brand + request/run IDs; OTel traces/metrics.

### Testing Requirements

Vitest (TS), pytest (Py), property-based for critical code, Stryker mutation where enabled. a11y tests via axe/jest-axe.

### Documentation

Each package requires README with purpose, setup, API, examples, branding.  
Per-task artifacts stored under `~/tasks/[feature]/`.  
**Local Memory parity**: decisions/rationales appended to `.github/instructions/memories.instructions.md` **and** persisted via Local Memory MCP/REST.

### Observability

OpenTelemetry for services, Prometheus endpoints, structured logging (Pino/Python), include `brand:"brAInwav"`, request/run IDs.

### Runtime Surfaces & Auth

MCP requires API key by default (dev may set `NO_AUTH=true`). OAuth2 mode (Auth0) allowed with scopes: `search.read`, `docs.write`, `memory.read`, `memory.write`, `memory.delete`; RBAC + Add-Permissions-in-Token enabled. MCP config must match port registry (`3024`, `3026`, `3028`, `39300`) and `.well-known/mcp.json`.

---

## IV. Feature Development Standards

Prioritized stories (P0–P3) that are **independently testable**; Given–When–Then acceptance criteria.  
Technical debt tracked via ADRs + Issues with payoff plan.

---

## V. Compliance & Governance

**Licensing**: Apache-2.0; `pnpm license:validate`; SBOM via `pnpm sbom:generate`.  
**Privacy**: Local-first; GDPR erasure; privacy-preserving telemetry.

**Review & Checklists (ENFORCED)**:
- A **human (non-author)** completes and posts `/.cortex/rules/code-review-checklist.md`.  
- BLOCKER items must be PASS; MAJORs need fixes or a waiver; MINORs need a follow-up task.

---

## VI. Amendment Process

**Proposing Changes**: Create ADR; include rationale/impact; maintainer approval; bump version; announce.  
**Conflict Resolution (highest → lowest)**:
1. **Governance Pack** (`/.cortex/rules/*`) with precedence:
   - `RULES_OF_AI.md` (immutable ethics)
   - **This Constitution**
   - `vision.md`, `agentic-coding-workflow.md`, `code-review-checklist.md`, `_time-freshness.md`, `CHECKLIST.cortex-os.md`
2. `CODESTYLE.md`  
3. Root `AGENTS.md`  
4. Package-level `AGENTS.md`  
5. Model guides (adapters)

---

## VII. Enforcement

**Automated**: CI gates (coverage/mutation, structure, security, a11y), evidence-token scan, checklist presence, live-model probes, env-loader rule, domain boundary checks.

**Manual**: Code owners approve; checklist verified; architecture decisions reviewed.

**Continuous Improvement**: Retros, metrics, periodic audits.

---

Co-authored-by: brAInwav Development Team