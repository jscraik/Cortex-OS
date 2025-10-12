# Agentic Phase Policy (R→G→F→REVIEW)

**Goal:** Agents auto-progress through phases without stopping for HITL, and request HITL **only** at **REVIEW**.

---

## Phases & Gates

- **R (Red)** — write failing tests; plan minimal pass.
  - **Allowed:** planning, write tests, minimal code-gen, `vibe_check`, Local Memory ops, **time-freshness check**.
  - **Forbidden:** `human_input`, production deploy, merge.
  - **Auto-advance → G when:** CI shows new tests **fail first**, then **pass** on the next commit, and **TIME_FRESHNESS:OK** is present.

- **G (Green)** — implement to pass.
  - **Allowed:** code, fix tests, `pnpm models:health/smoke` (**live only**), security scans.
  - **Forbidden:** `human_input`.
  - **Auto-advance → F when:**  
    - `pnpm test` **passes**,  
    - Coverage ≥ **90% global** & **95% changed lines**,  
    - **Mutation ≥ 90%** (where enabled).

- **F (Finished)** — refactor, docs, a11y, observability.
  - **Allowed:** refactor (no behavior change), docs, a11y, SBOM/provenance, structure guard.
  - **Forbidden:** `human_input`.
  - **Auto-advance → REVIEW when:**  
    - axe/jest-axe **a11y reports attached**,  
    - SBOM + scanners **pass** (Semgrep ERROR=block, gitleaks ANY=block, OSV clean),  
    - `pnpm structure:validate` **passes**,  
    - `pnpm models:health && pnpm models:smoke` logs attached (**live** MLX/Ollama/Frontier; model IDs, dims/norms, latency),  
    - **Local Memory parity** entry recorded for decisions/refactors (MCP & REST).

- **REVIEW**
  - **Allowed:** `human_input` (HITL), Code Review Checklist completion, approvals/waivers per Constitution.
  - **Merge only if:** **all BLOCKERs** in `/.cortex/rules/code-review-checklist.md` are **PASS** and all evidence tokens are present.

---

## Hard Rules

- **HITL only at REVIEW.** Any `human_input` before REVIEW is a policy violation.
- **Governance required.** Load the nearest `AGENTS.md` and record its SHA in `.cortex/run.yaml`; include it in the first `vibe_check` log.
- **Hybrid model = Live only.** No stubs/recordings/"dry_run" for embeddings/rerankers/generation. Engines must be **live** (MLX, Ollama, Frontier).
- **Time Freshness Guard.** Anchor dates to harness "today"; surface **ISO-8601** in specs/PRs/logs; treat "latest/current" as freshness checks.

---

## Evidence Tokens (CI scans logs for these)

- `AGENTS_MD_SHA:<sha>`
- `PHASE_TRANSITION:<from>-><to>`
- `brAInwav-vibe-check`
- `TIME_FRESHNESS:OK tz=<iana_tz> today=<yyyy-mm-dd>`
- `MODELS:LIVE:OK engine=<mlx|ollama|frontier> model=<id> dims=<n> norm≈<v> latency_ms=<n>`
- `A11Y_REPORT:OK`
- `STRUCTURE_GUARD:OK`
- `COVERAGE:OK CHANGED_LINES:OK MUTATION:OK`
- `MEMORY_PARITY:OK`
- `CODE-REVIEW-CHECKLIST: /.cortex/rules/code-review-checklist.md`

> **Overrides:** Rolling a phase **back** requires a Constitution waiver and must emit  
> `PHASE_OVERRIDE:<from>-><to> link=<waiver-url>`; otherwise CI blocks.