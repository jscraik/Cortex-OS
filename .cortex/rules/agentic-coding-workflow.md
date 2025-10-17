# Agentic Coding Workflow — v2025.11+ArcTDD (Tiered, Accessibility Edition)

**Status:** Authoritative  
**Scope:** All human and AI agent activity across Cortex-OS  
**Inheritance:** Governance Pack (`/.cortex/rules/*`) · `CODESTYLE.md` · Constitution  
**Enforcement:** CI blocks merges if required evidence, guards, branding logs, or arc limits are missing.  
**Accessibility Note:** This document avoids emoji in headings and list markers for screen-reader clarity.

---

## 0) Task Spine and Ground Rules

- **Discrete tasks:** Each feature or fix lives in `~/tasks/<slug>/`.
- **Artifacts at every gate:** specs, plans, tests, evidence, run manifests.
- **Tiny, verifiable steps:** TDD (red → green → refactor), frequent Conventional Commits, atomic PRs.
- **Truthfulness:** No stubs, mocks, or recorded outputs in production paths.
- **A11y and Security:** WCAG 2.2 AA baseline; Semgrep, OSV, gitleaks scans gate merges.
- **Branding:** All logs/errors must include `[brAInwav]` and `brand:"brAInwav"`.

---

## 0.1 Preflight Guards and Governance Hooks (mandatory)

1. **Time Freshness Guard** — Anchor to harness timezone/date; convert relative dates to ISO-8601 in specs and PRs.  
2. **Vibe Check MCP (Oversight)** — After planning and before any file writes/network calls/long runs:
   ```bash
   pnpm oversight:vibe-check --goal "<task>" --plan "<steps>" --session <id>
   # or JSON-RPC to ${VIBE_CHECK_HTTP_URL:-http://127.0.0.1:2091}
   ```
   Save raw response to `logs/vibe-check/<task>.json`; missing logs block merge. See `/.cortex/rules/vibe-check.md`.
3. **Local Memory Parity** — Append key decisions to `.github/instructions/memories.instructions.md` and persist via Local Memory MCP/REST.
4. **Knowledge Connectors Live-Check** — Verify `${WIKIDATA_MCP_URL}/healthz` and `${ARXIV_MCP_URL}/healthz`. Store timestamps/responses in `research/connectors-health.log`. Planning is blocked if down, except where tier-based cached health fallback is permitted (see "Toolchain Resilience", lines 281–283).
5. **Secrets via 1Password CLI** — Fetch with `op`; never persist secrets in repo or long-lived env vars.
6. **Hybrid Model Live-Only Rule** — Embeddings, rerankers, generations must use live engines (MLX, Ollama, Frontier). No stubs, dry-runs, or recorded outputs.
   ```bash
   pnpm models:health && pnpm models:smoke   # attach model IDs, vector shapes, latency
   ```
7. **Plan Step Limit** — Any plan shown to a model must be ≤ 7 concrete steps; split excess into new arcs.
8. **State Recap Rule** — After every 400–700 generated tokens, append a one-line recap to `evidence/recaps.log`: green tests, pending tests, next step.

⸻

### 0.2 Session Hygiene (mandatory)

- **Cadence:** 50 minutes build / 10 minutes reset. At reset, snapshot `run-manifest.json` and start a fresh session.
- **Context Diet:** Last 2 plan bullets + current failing test + current file + manifest summary only.
- **Hard Reset Triggers:** (a) 2 off-spec suggestions in a row; (b) ≥3 speculative edits without tests; (c) proposes renaming core interfaces mid-arc.

⸻

### 0.3 Workflow Tiers (choose one per task)

Use the smallest tier that fits. CI enforces tier contracts.

| Tier | When to use | Required Gates | Required Artifacts (minimum) |
| --- | --- | --- | --- |
| Tier 1: fix | Small bug fixes, no contract change | G0, G0.1, G0.2, G1 (North-Star only), G2 (≤7 steps), G3, G4, G5–G7, G10 | `tests/acceptance/<slug>.spec.*`, `implementation-plan.md` (≤7 steps), Evidence Triplet for changed area |
| Tier 2: feature | New capability or contract addition | Full G0–G10 | All artifacts in this workflow |
| Tier 3: refactor | Internal change without public contract change | G0, G0.1, G0.2, G1 (no external research), G2 (≤7 steps), G3, G4, G5–G7, G9, G10 | Contract snapshots (before/after), perf/coverage deltas, Evidence Triplet |

Select tier at task creation; it is recorded in `run-manifest.json`.

⸻

### G0 Initialize

- Create `~/tasks/<slug>/{notes.md, implementation-plan.md, risks.md, decisions.md, evidence/}`.
- Define scope and “done”; write `json/baton.v1.json` including the selected tier.
- Evidence: `notes.md`, `json/baton.v1.json`.

⸻

### G1 Research (Evidence Discovery and North-Star)

- North-Star first: one-sentence goal plus one acceptance test that proves the feature is real.  
  - Path: `tests/acceptance/<slug>.spec.[ts|js|py|http]` (Gherkin or HTTP contract acceptable).
- Semantic code search and reuse analysis.
- For Tier 2 only: fetch authoritative knowledge via `executeWikidataWorkflow`, `arxiv_search`; store full JSON (QIDs/ArXiv IDs) in `research/`.
- RAID analysis; time-boxed feasibility spikes with results.
- Evidence: `research/*.json` (Tier 2), `raid.md`, `findings.md`, acceptance test path.

⸻

### G2 Planning (PRP and Arc Protocol)

- Arc Protocol (episodes):
  - Vertical slice (API → logic → store → tests), 2–5 commits, 45–120 minutes end-to-end.
  - Plan ≤ 7 steps per arc; overflow becomes a new arc.
  - Contract Freeze per arc (types/schema/route) plus contract test oracle.
- Produce `implementation-plan.md` (≤ 7 steps per arc), `srs.md`, and design diagrams (Tier 2).
- Define quality gates (coverage, mutation, a11y, security, performance).
- Plan PR attachments: vibe-check logs, coverage/mutation reports, code-review checklist, models health/smoke logs, a11y/security reports.
- Evidence: `implementation-plan.md`, `srs.md`, and `design/*` (Tier 2).

⸻

### G3 Scaffolding (TDD/BDD Setup)

- Write failing unit and integration tests for each contract; scaffold the Milestone Test for the current arc (must fail first).
- Add feature flags (off by default).
- Wire CI stubs: build, test, lint, typecheck.
- Commands:
  ```bash
  pnpm test:smart
  pnpm lint:smart
  pnpm typecheck:smart
  ```
- Evidence: green CI for scaffolds; failing tests show gaps; contract snapshot in `design/contracts/`.

⸻

### G4 Implementation (Execution)

- Micro-loop budget: ≤ 20 minutes or ≤ 3 commits per red → green → refactor loop.
- Tracer-bullet switch: if sequencing unclear after 2 minutes, ship a minimal end-to-end path, then scale with follow-on arcs without changing the public contract.
- Hard rules: named exports only; ≤ 40 lines per function; strict types at boundaries; no `any` in production; async/await with `AbortSignal`; never swallow errors; inject seeds/clocks; no cross-domain imports (use declared interfaces); prohibited: `Math.random()` in prod, placeholder adapters, `TODO`/`FIXME`/`HACK` in prod, console stubs, fake telemetry.
- Security and supply chain: Semgrep (block ERROR), gitleaks (block ANY), OSV clean, CycloneDX SBOM, SLSA/in-toto attestations.
- Env and config: shared loader (`@cortex-os/utils`); never call `dotenv.config()`.
- Observability: structured logs with `brand:"brAInwav"`, request/run IDs, OTel traces.
- Evidence: incremental passing tests; commit history mapped to arc steps.

⸻

### G5 Verification (Local Gates)

- Thresholds: coverage ≥ 90% global; ≥ 95% changed lines; mutation ≥ 90% (where enabled).
- Security scans: `pnpm security:scan`, Semgrep, OSV, gitleaks.
- Structure and A11y: `pnpm structure:validate`; attach axe/jest-axe reports.
- Hybrid Model Health: `pnpm models:health && pnpm models:smoke` with model IDs, vector norms/shapes, latency.
- Property and mutation tests for invariants once an arc stabilizes.
- Evidence Triplet (per stage):
  1. Milestone Test (red → green proof)
  2. Contract Snapshot (schema/types/route)
  3. Reviewer JSON pointer
  Missing any item fails the stage.
- Vibe-check evidence: `logs/vibe-check/<task>.json` present.
- Evidence: `verification/` reports, triplets, model health logs.

⸻

### G6 Review (Human-in-the-Loop and Automated)

- Human review: complete `/.cortex/rules/code-review-checklist.md`; paste filled copy as a top-level PR comment with evidence pointers (file:line, URLs).
- Automated review: run Reviewer Neuron (read-only) to emit machine-checkable JSON findings.
- Policy: BLOCKER must pass; MAJOR requires fix or waiver; MINOR yields a follow-up task.
- Checks: plan step count ≤ 7; session resets logged in `run-manifest.json`; recaps in `evidence/recaps.log`.
- Evidence: `review.md` (merged results), reviewer JSON, `decisions.md`.

⸻

### G7 CI Gates and Artifact Signing

- CI must pass: build, test, lint, typecheck, a11y, security.
- Generate SBOM (CycloneDX) and provenance (SLSA/in-toto).
- Sign artifacts via cosign; store attestation refs in `run-manifest.json`.
- Evidence: CI URLs, signatures, SBOM files.

⸻

### G8 Ship (Release)

- SemVer; Changesets/Nx release; signed tags.
- Progressive rollout behind feature flags; monitoring enabled.
- Update READMEs, API docs, user docs.
- Evidence: changelog, release URL, rollout notes.

⸻

### G9 Monitor and Iterate

- Observe OTLP traces/logs/metrics; maintain error budgets and rollback criteria.
- Record model drift/retraining logs in `monitoring/`.
- Post-ship review captured in `postship.md`.
- Evidence: dashboards, metrics snapshots.

⸻

### G10 Archive and Index

- Compress `~/tasks/<slug>/` artifacts, reports, ADRs, evidence.
- Mirror filled review checklist to `.cortex/audit/reviews/<PR_NUMBER>-<SHORT_SHA>.md`.
- Index specs/tests/contracts to the Memory API for RAG.
- Evidence: `archive.json` and storage path.

⸻

## Arc Records and Templates

Each arc is stored under `~/tasks/<slug>/arcs/<n>/` and contains:

- North-Star acceptance test path
- Plan (≤ 7 steps)
- Contract snapshot (`design/contracts/...`)
- Evidence Triplet (milestone test proof, contract snapshot, reviewer JSON)
- Session reset markers and recap excerpts

Template: `templates/tdd-arc.template.md`.

⸻

## Run Manifest Schema (v2 excerpt)

```
{
  "$id": "schemas/run-manifest.v2.json",
  "type": "object",
  "required": ["task", "tier", "north_star", "arcs", "session_resets", "evidence"],
  "properties": {
    "task": { "type": "string" },
    "tier": { "type": "string", "enum": ["fix", "feature", "refactor"] },
    "north_star": {
      "type": "object",
      "required": ["goal", "acceptance_test_path"],
      "properties": {
        "goal": { "type": "string", "maxLength": 140 },
        "acceptance_test_path": { "type": "string" }
      }
    },
    "arcs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["index", "plan_steps", "contract_snapshot", "evidence_triplet"],
        "properties": {
          "index": { "type": "integer", "minimum": 1 },
          "plan_steps": { "type": "array", "maxItems": 7, "items": { "type": "string" } },
          "contract_snapshot": { "type": "string" },
          "evidence_triplet": {
            "type": "object",
            "required": ["milestone_test", "contract_snapshot", "review_json"],
            "properties": {
              "milestone_test": { "type": "string" },
              "contract_snapshot": { "type": "string" },
              "review_json": { "type": "string" }
            }
          }
        }
      }
    },
    "session_resets": { "type": "array", "items": { "type": "string", "format": "date-time" } },
    "evidence": {
      "type": "object",
      "properties": {
        "vibe_check_log": { "type": "string" },
        "recaps_log": { "type": "string" }
      }
    }
  }
}
```

⸻

## Scaffolding CLI (reduces cognitive load)

```bash
# Create task with tier and boilerplate (notes, plan, templates, CI stubs, manifest)
pnpm task:new --slug "new-feature-slug" --tier "feature"

# Start a new arc with a prefilled template
pnpm arc:new --slug "new-feature-slug" --title "Arc 1: save+fetch by id"
# -> creates ~/tasks/new-feature-slug/arcs/001/ with README from templates/tdd-arc.template.md

# Record session reset (called by the 10-minute reset hook)
pnpm session:reset --slug "new-feature-slug"
```

CLI behavior (expected):

- Generates `run-manifest.json` with tier, north_star, and empty `arcs[]`.
- Pre-creates `tests/acceptance/<slug>.spec.ts` scaffold with a pending test.
- Adds `design/contracts/` and `research/` folders conditionally (Tier 2 only).
- Registers CI jobs (`models:health`, `models:smoke`, `structure:validate`) for the task.

⸻

## Toolchain Resilience (brittleness mitigations)

- Graceful Degradation: If `models:health` or `models:smoke` fail due to transient infra, mark the task blocked; do not bypass. The PR label `blocked:runtime` is required.
- Fallback Modes:
  - Vibe-check: JSON-RPC fallback if the CLI shim fails; identical payload.
  - Connector health checks: accept cached health within 15 minutes for Tier 1 and Tier 3; Tier 2 requires live success.
- Version Pinning: Lock CI tool versions in `/.cortex/lock/ci-tools.json`; bump via a dedicated “Tooling Update” PR template.

⸻

## Onboarding Quickstart (new contributors and agents)

1. Run `pnpm task:new --slug "<slug>" --tier "<fix|feature|refactor>"`.
2. Write the North-Star acceptance test in `tests/acceptance/<slug>.spec.[ts|js|py|http]`.
3. Draft a ≤ 7-step plan in `implementation-plan.md`.
4. Run `pnpm oversight:vibe-check` and commit the JSON log.
5. Scaffold failing tests (G3) and begin short red → green loops (G4).
6. Attach the Evidence Triplet and run local gates (G5).
7. Request review (G6); ensure the checklist and reviewer JSON are present.
8. Merge only after G7 passes and artifacts are signed.

⸻
