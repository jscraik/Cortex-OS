# Agentic Phase Policy (R→G→F→Review)

**Goal:** Agents must auto-progress through phases without stopping for HITL, and request HITL **only** at Review.

## Phases & Gates
- **R (Red)** — write failing tests; plan minimal pass.
  - Allowed: plan, write tests, code gen in "minimal", `vibe_check`, local memory ops.
  - Forbidden: `human_input`, production deploy, merge.
  - Auto-advance → **G** when `pnpm test` shows new tests fail then pass on next commit.

- **G (Green)** — implement to pass.
  - Allowed: code, fix tests, `models:health/smoke` (live only), security scans.
  - Forbidden: `human_input`.
  - Auto-advance → **F** when `pnpm test` passes + coverage ≥ 90% global & 95% changed lines.

- **F (Finished)** — refactor, docs, a11y, observability.
  - Allowed: refactor w/o behavior change, docs, a11y, SBOM/provenance.
  - Forbidden: `human_input`.
  - Auto-advance → **Review** when:
    - a11y reports attached, SBOM + scans pass,
    - `pnpm structure:validate` passes,
    - `pnpm models:health && pnpm models:smoke` logs attached (live engines only: MLX/Ollama/Frontier).

- **Review**
  - Allowed: `human_input` (HITL), code-review checklist completion, approvals/waivers per Constitution.
  - Merge only if **all BLOCKERs** in `/.cortex/rules/code-review-checklist.md` are PASS.

## Hard Rules
- **HITL only at Review.** Any `human_input` before Review is a policy violation.
- **Governance required:** Load the nearest `AGENTS.md` and record `agents_sha` in `.cortex/run.yaml` and in the first `vibe_check` log.
- **Hybrid model = Live only:** No stubs/recordings/dry-runs for embeddings/rerankers/generation.

## Evidence Tokens (CI scans logs for these)
- `AGENTS_MD_SHA:<sha>`
- `PHASE_TRANSITION:<from>-><to>`
- `brAInwav-vibe-check`
- `MODELS:LIVE:OK engine=<mlx|ollama|frontier>`