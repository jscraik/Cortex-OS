<!--
file_path: "AGENTS.md"
description: "Agent Operational Instructions for Cortex‑OS — Repository Root Reference (merged + tightened)"
maintainer: "@jamiescottcraik"
last_updated: "2025-10-14"
version: "1.2.0"
status: "authoritative"
license: "MIT"
audit: { provenance: "ChatGPT (draft)", reviewers: ["@jamiescottcraik"], signoff: [] }
-->

# AGENTS — Cortex‑OS (authoritative)

**Maintainer:** brAInwav Development Team
**Scope:** Rules and runbook for all human and AI agents working in this monorepo.

> **Normative keywords** — **MUST**, **SHOULD**, **MAY** use RFC‑2119 meaning.

---

## 0) Purpose

* Define how agents (humans + AI) build, test, review, secure, and ship here.
* Centralize the “how we work” contract; CI validates key parts.
* Subprojects MAY ship their own `AGENTS.md`. The **nearest** file to a path is authoritative for that path; root remains ground truth for repo‑wide rules.

---

## 1) Hierarchy of Authority

When documents overlap, follow this order (highest first):

1. **Governance Pack (`/.cortex/rules/`)** — binding project rules:

   * Time Freshness Guard — anchor every agent interaction to the user’s timezone/date; enforce recency checks.
   * Vision — end‑state, scope, non‑goals, interfaces.
   * Agentic Coding Workflow — task lifecycle, gates, handoffs.
   * Task Folder Structure — mandatory organization for `~/tasks/[feature-name]/`.
   * Code Review Checklist — evidence‑backed review, ship criteria.
   * CI Review Checklist — execution checklist for agents and reviewers.
   * RULES_OF_AI — ethical guardrails, branding, production bars.
   * Constitution — binding charter for decision authority and waivers.
2. **`/CODESTYLE.md`** — coding, testing, accessibility, logging, and platform conventions enforced by CI.
3. **This `AGENTS.md` (root)** — operational rules for all agents; defaults for the repo.
4. **Package‑level `AGENTS.md`** — MAY tighten rules for that subtree but MUST NOT weaken repo standards.
5. **Model guides** (`/docs/models/*.md`) — adapter specifics only.

> **CI checks:** presence of Governance Pack, link validity, and that package `AGENTS.md` files don’t contradict the root.

---

## 2) Mandatory Templates & Specs

All workstreams MUST embed and adhere to the official templates; deviations FAIL review:

* `/.cortex/templates/feature-spec-template.md` — required for net‑new capability (link spec IDs in PRs).
* `/.cortex/templates/research-template.md` — required for investigations/benchmarks; archive in `project-documentation/`.
* `/.cortex/templates/tdd-plan-template.md` — required **before** implementation; attach red/green/refactor evidence to the PR.
* `/.cortex/templates/constitution-template.md` — for new or amended governance artifacts.

> **Note:** Product‑specific integrations (e.g., Wikidata) BELONG in their package docs or package‑level `AGENTS.md`, not the root file.

### 2.1) Workflow Checklist (mandatory)

* Follow **Agentic Coding Workflow** step‑by‑step; deviations require documented waivers (see §27).
* Use the **CI Review Checklist** for execution and reviewer sign‑off.
* **Enforce Code Review Checklist:** Every PR MUST include a completed copy of `/.cortex/rules/code-review-checklist.md`. Link it in the PR description and pin the filled checklist as a top‑level PR comment.
* Before merge, attach the filled checklists (or link to the PR comments) with evidence for every gate.
* CI validates checklist presence and key toggles; reviewers confirm each item is satisfied or explicitly waived (§27).

---

## 3) Project Overview

Cortex‑OS is a local‑first, vendor‑neutral **Agentic Second Brain Runtime (ASBR)** that orchestrates multi‑agent workflows, persists knowledge, and exposes controlled surfaces: **MCP (HTTP/SSE/STDIO)**, **A2A**, and **REST**. The Ops Dashboard provides health/logs/metrics/traces and manual controls.

**Allowed interfaces**
• MCP hub: `/mcp` (protocol), `/sse` (stream), `/health`, `/metrics`
• A2A hub: agent‑to‑agent messaging (topics, intents)
• REST: programmatic control & integrations
• Frontier adapters: model/tool connectors behind policy gates

**Non‑goals**
• Multiple MCP servers per package; hidden side‑channels; unaudited actions.

---

## 4) Personas & Authority

| Persona        | Permitted Actions                                                                                            | Hard Limits                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Assistant**  | Explain, summarise, answer.                                                                                  | Read‑only on repo; MUST NOT modify source. Examples/snippets only.                                     |
| **Analyst**    | Scan repo, parse metrics, write insights, convert `INITIAL.md` → `prp.md`.                                   | Cannot change code; MUST NOT set new goals or make strategic decisions.                                |
| **Generator**  | Scaffold code, boilerplate, unit tests, docs; refactors.                                                     | MUST obey TDD loop; output is draft; user MUST review & commit; MUST NOT self‑execute tests or deploy. |
| **Guardian**   | Threat‑model scans, SBOM, OWASP LLM Top‑10 linting; security/a11y/license audits; prompt‑injection red‑team. | MUST NOT modify code; reports and PR comments only.                                                    |
| **Refactorer** | Identify debt; generate `prp.md` for refactors.                                                              | MUST NOT modify code directly; MUST justify with data (complexity, perf).                              |

> **Conflict rule:** If anything here clashes with `RULES_OF_AI.md`, the constitution wins.

---

## 5) Boundaries & Interfaces

* Strict domain separation; **no cross‑domain imports** from sibling domains. Use published packages or documented contracts.
* Communicate via declared message schemas (A2A topics, MCP tools/resources/prompts).
* Shared utilities MUST live behind common interfaces; no internal helper leakage.
* Frontier adapters run behind policy gates; every new surface MUST be evidenced in the feature spec.

---

## 6) Build, Run, Verify

**Bootstrap**

```bash
./scripts/dev-setup.sh
pnpm readiness:check
```

**Dev loop**

```bash
pnpm dev
pnpm build:smart
pnpm test:smart
pnpm lint:smart
pnpm typecheck:smart
```

**Pre‑PR verification**

```bash
pnpm structure:validate
pnpm security:scan
pnpm test:safe
pnpm models:health   # live model healthcheck (MLX/Ollama/Frontier)
```

Smart targets honor the Nx/Turbo affected graph. Keep runs fast; diffs small; attach output evidence to the PR (screenshots, logs, trace IDs).

---

## 7) Code Style (summary; see `/CODESTYLE.md` for full rules)

* Functional‑first; minimal hidden state.
* Named exports only (no default).
* ≤ 40 lines per function; prefer guard clauses.
* ESM everywhere; strict types at boundaries.
* async/await; provide `AbortSignal` for cancelable I/O.
* Never swallow errors; attach context via `cause`.
* UI: Next.js App Router, Suspense + Error Boundaries; WCAG 2.2 AA.

**Production‑path hard checks** (enforced in `/CODESTYLE.md`)
• No `any` in TypeScript (tests or justified shims only).
• No ambient randomness/time in core logic (inject seeds/clocks).
• No `eval`/`Function`; validate/sanitize all external inputs.

> **DRY:** The canonical list of prohibitions lives in `/CODESTYLE.md`. This file references, it does not repeat.

---

## 8) Tests & Quality Gates

* TDD by default. Co‑locate tests (`__tests__` or `*.test.*`).
* Coverage gates: ≥ 90% global, ≥ 95% changed lines (ratchet upward only).
* Mutation testing target: ≥ 90% where enabled.
* E2E + accessibility checks for user‑facing surfaces.
* If risk to coverage/mutation exists, propose one minimal incremental test in the PR.

**Common scripts**

```bash
pnpm test
pnpm test:coverage
# per‑pkg mutation gates: see package.json / stryker.conf
```

Attach TDD evidence + result links in the PR.

---

## 9) Security, Supply Chain, Compliance

* **Secrets:** fetch on‑demand with 1Password CLI (`op`). No hard‑coded secrets or long‑lived copies.
* **Scanners:** Semgrep (block on ERROR), gitleaks (block on ANY), OSV/audit per lockfile.
* **SBOM:** CycloneDX per artifact; provenance via SLSA/in‑toto; sign images with Cosign.
* **Containers:** minimal base, pinned digests, non‑root, read‑only FS, drop caps.
* **Telemetry:** never fake metrics.

---

## 10) Accessibility (WCAG 2.2 AA)

* Semantic HTML, correct ARIA roles, consistent focus order, target size ≥ 44×44 CSS px.
* Keyboard complete; no color‑only signaling.
* CLI/TUI surfaces expose `--plain` and screen‑reader friendly output.
* **Quick audit:** tab through, verify focus ring; run `axe` checks; ensure labels/roles.

---

## 11) Oversight Gate (formerly “Vibe Check MCP”)

* All agents MUST call the Oversight tool **`vibe_check`** after planning and **before** file writes, network calls, or long executions.
* Config: `VIBE_CHECK_HTTP_URL` (default `http://127.0.0.1:2091`). Logs/errors MUST include `brand:"brAInwav"`.
* Constitution helpers: `update_constitution`, `reset_constitution`, `check_constitution`.
* Evidence: PRs MUST attach logs containing `brAInwav-vibe-check` at plan→act gates; CI blocks otherwise.

---

## 12) Observability & Telemetry

* OpenTelemetry traces/logs/metrics; Prometheus `/metrics`; structured logs with `brand:"brAInwav"`, request/run IDs.
* Performance budgets (bundle/time/memory) enforced in CI; exceptions documented with waivers (§27).
* **AI provenance:** maintain `AI_CONTRIB_LOG.yaml` — commit hash, model, params, token usage, timestamp.

---

## 13) Runtime Surfaces & Auth

* MCP requires API key by default (dev MAY set `NO_AUTH=true`).
* Headers: `X-API-Key: <key>` or `Authorization: Bearer <key>`; Basic auth supported if password == key.
* OAuth2 mode (e.g., Auth0): set `AUTH_MODE=oauth2` and configure `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `MCP_RESOURCE_URL`, `REQUIRED_SCOPES`.
* SSE uses same guard; default port **3024**.
* Remote dev via Cloudflare Tunnel `config/cloudflared/mcp-tunnel.yml`.
* 403 triage: path/host/CORS/auth header/tunnel policy/dev no‑auth flag. See `PLAYBOOK.403-mcp.md`.

---

## 14) Inputs & Outputs

**Inputs** — Validate with Zod; deterministic positive integer seeds; explicit resource caps (tokens/time/memory). Reject unsanitized external data; log rejections with reason codes.

**Outputs** — Human‑readable by default; `--json` emits structured output. ISO‑8601 timestamps everywhere. Structured error responses with codes + evidence pointers (file:line, run IDs, URLs).

---

## 15) Memory Management

* Interface‑based stores (no direct persistence access).
* Configurable memory limits per agent type; deterministic cleanup/GC.
* Serialize state across runs; follow branding needs.
* On decision/refactor/rectification: append rationale + evidence to `.github/instructions/memories.instructions.md` **and** persist the same entry via Local Memory MCP/REST (parity required).

---

## 16) Agent Toolkit (shared utilities)

Use `packages/agent-toolkit` for multi‑repo search, structural codemods, and cross‑language checks.

```bash
just scout "<pattern>" .
just codemod 'find(:[x])' 'replace(:[x])' .
just verify changed.txt
```

Deterministic output is mandatory; attach tool logs as PR evidence.

---

## 17) Commits, PRs, Branching

* Conventional Commits; signed commits/tags required.
* Keep diffs small; pair tests + implementation.
* PRs MUST pass: lint, types, tests, security, structure guard, coverage/mutation gates.
* Use `.github/pull_request_template.md`; link specs/plans; cite Governance sections touched.
* Reviewers MUST complete `/\.cortex/rules/code-review-checklist.md` and link the filled checklist in review notes (see §26).

---

## 18) Monorepo Layout & Nested `AGENTS.md`

* Apps in `apps/`, feature packages in `packages/`, shared libs in `libs/`.
* Nx + ESLint enforce dependency boundaries (`pnpm lint:graph`).
* You MAY add `packages/<name>/AGENTS.md` to document local targets, contracts, or extra checks. These MAY tighten requirements but MUST NOT weaken root rules.

> **Angular note:** Angular‑specific guidance belongs in the Angular package’s `AGENTS.md` or `/docs/frontend/angular.md` — not here.

---

## 19) Environments & Ports

**Environment loading** — Use the shared loader (`scripts/utils/dotenv-loader.mjs` or `@cortex-os/utils`) for every runtime. Do **not** call `dotenv.config()` directly.

**Secrets** — Source via 1Password CLI (`op`). For automation, follow `docs/development/1password-env.md` and use `op run --env-file=... -- pnpm <task>` so credentials remain ephemeral.

**Port registry** — `config/ports.env` is authoritative; mirror in `config/dev/ports.env` and `docker/env/ports.env` after changes.

**Key assignments**

```
CORTEX_MCP_PORT=3024
LOCAL_MEMORY_MCP_PORT=3026
MEMORY_API_PORT=3028
PIECES_OS_PORT=39300
OLLAMA_PORT=11434
REDIS_PORT=6379
VSCODE_LSP_PORT=3008
```

Verify `.well-known/mcp.json` and port congruence (3024/3026/3028/39300) in PRs.

---

## 20) Anti‑Patterns (will fail CI)

* Default exports; > 40‑line functions; promise chains without `await`.
* TypeScript `any` in production code (outside tests/justified shims).
* Missing brand in logs/errors; fake metrics/telemetry; placeholder adapters.
* Cross‑domain imports; skipping memory/context persistence.
* Unpinned dependency bumps; bypassing lockfiles; ignoring Governance mandates.
* Raising `pnpm` `childConcurrency` or Nx parallelism beyond documented mitigations without evidence.
* “Will be wired later”, “follow‑up” in prod paths.

> **Production model rule lives in §25.**

---

## 21) Frontend Development — Scope of this File

* This root file only defines **repo‑wide** frontend expectations (Next.js App Router, Suspense, Error Boundaries, WCAG 2.2 AA).
* Framework‑specific instructions (e.g., Angular CLI) MUST live in a package‑level `AGENTS.md` or `/docs/frontend/<framework>.md`.

---

## 22) Where to Look Next

* Governance Pack (authoritative):

  * `/.cortex/rules/vision.md`
  * `/.cortex/rules/agentic-coding-workflow.md`
  * `/.cortex/rules/code-review-checklist.md`
  * `/.cortex/rules/RULES_OF_AI.md`
  * `/.cortex/rules/constitution.md`
* Templates (mandatory):

  * `/.cortex/templates/feature-spec-template.md`
  * `/.cortex/templates/research-template.md`
  * `/.cortex/templates/tdd-plan-template.md`
  * `/.cortex/templates/constitution-template.md`
* `/CODESTYLE.md` — exact coding rules enforced by CI.
* Model guides — adapter specifics without weakening rules.
* `PLAYBOOK.403-mcp.md` — quick response guide for auth failures.

---

## 23) Time Freshness & Date Handling

* Anchor all reasoning to the harness‑provided timezone and “today”.
* Treat “latest/current” queries as freshness checks; verify sources or clarify.
* Convert relative language to explicit ISO‑8601 dates.
* Clearly separate past vs future using the harness date to prevent timeline drift.

---

## 24) Local Memory (operational default)

Proactively use Local Memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Persist key insights (lessons learned, architectural decisions, strategies, outcomes). Agents MUST store decisions/rationales as described in §15 and maintain MCP/REST parity.

---

## 25) Hybrid Model Solution — **Live Only** (MLX / Ollama / Frontier)

**Hard rules**

* No fakes, no stubs, no recorded outputs, no “dry_run” modes for embeddings, rerankers, or generation. All inference MUST run against live engines (MLX on‑device, Ollama local server, or approved Frontier APIs).
* Embeddings MUST be real: no zero/identity vectors, no constant hashes, no cached “golden” vectors used as runtime results.
* Reranking MUST be real: no echo/sort‑by‑length proxies; call a live reranker model.
* Fallback chain: MLX → Ollama → Frontier, but only if each hop is live. If none are available, mark the task blocked and follow Constitution escalation. Do not swap in a fake engine.

**Health & evidence**

* Pre‑merge, run: `pnpm models:health && pnpm models:smoke`
* Verifies MLX device availability, Ollama `/api/tags`, minimal live inference, and sample embedding dimensionality.
* Attach logs (model IDs, vector norms, latency) to the PR.
* Logs MUST include `brand:"brAInwav"` and `engine:{mlx|ollama|frontier}` fields.

**Example env**

```
MLX_DEVICE=apple-metal
OLLAMA_HOST=http://127.0.0.1:11434
EMBED_MODEL=mlx:nomic-embed-text-v1
RERANK_MODEL=ollama:bge-reranker-v2
GEN_MODEL=frontier:gpt-5
```

---

## 26) Code Review Checklist — Enforcement

**Source of truth:** `/.cortex/rules/code-review-checklist.md`

**Who completes it** — At least one human reviewer not the PR author. Agent self‑review is not sufficient.

**Format & placement**
Include a PR description link to the checklist path:

```
CODE-REVIEW-CHECKLIST: /.cortex/rules/code-review-checklist.md
```

Paste a filled copy as a top‑level PR comment, with:

* Commit: `<HEAD_SHA>`
* Scope: changed packages/paths
* Evidence per section: `file://path:line-range`, log/trace IDs, screenshots, URLs.

**Gating rules**

* BLOCKER items MUST be ☑ PASS.
* Attempting to merge with any unchecked BLOCKER fails CI.
* MAJOR findings require either a pre‑merge fix or a waiver (§27).
* MINOR findings MAY defer only with a linked follow‑up task (`tasks/<slug>`).

**CI enforcement**
Structure guard checks for:

* Presence of the literal token `CODE-REVIEW-CHECKLIST:` pointing to the canonical path.
* A top‑level PR comment by a non‑author with all BLOCKER items ticked.
* At least one evidence pointer per checklist section.

On merge, CI mirrors the filled checklist into `.cortex/audit/reviews/<PR_NUMBER>-<SHORT_SHA>.md`.

---

## 27) Waivers, Versioning & Change Control

* **Waiver policy:** Only the Maintainer or a Constitution‑designated delegate MAY approve a waiver. Waivers MUST record `waiver_id`, `rule_id(s)`, `approver`, `expiry`, and `reason`, and live under `/.cortex/waivers/<waiver_id>.md`.
* **Rule IDs:** Each enforceable rule in this file is tagged for CI with `AGENTS-*` IDs.
* **Semantic Versioning:** This document uses SemVer. Bump MINOR for new rules; PATCH for clarifications. Record changes below.
* **Run Manifest (advisory):** Stages emit signed artifacts; CI MAY evaluate older manifests against newer gates for regression checks.

### 27.1) CI Enforcement Matrix (excerpt)

| Rule ID        | Description                            | CI Job               | Script/Check                                     |
| -------------- | -------------------------------------- | -------------------- | ------------------------------------------------ |
| AGENTS‑CHK‑001 | Checklist token present                | `agents-guard`       | `grep -q "CODE-REVIEW-CHECKLIST:"`               |
| AGENTS‑PRV‑002 | Oversight logs attached                | `agents-guard`       | search for `brAInwav-vibe-check` in PR artifacts |
| AGENTS‑HMS‑003 | Live model evidence present            | `models-smoke`       | verify model IDs/vector norms in logs            |
| AGENTS‑ACL‑004 | Package `AGENTS.md` not weakening root | `structure-validate` | compare rule sets                                |

> The full matrix lives in `/docs/governance/ci-enforcement-matrix.md`.

---

## 28) Human vs Agent Responsibilities (quick)

| Area               | Human                  | Agent                    |
| ------------------ | ---------------------- | ------------------------ |
| Scope & Priorities | Owns                   | Proposes                 |
| Code Changes       | Reviews & merges       | Generates (under TDD)    |
| Security/A11y Gate | Signs blockers/waivers | Lints & reports          |
| Memory Entries     | Reviews/audits         | Writes/parities MCP+REST |

---

## 29) Package `AGENTS.md` — Starter Template

```md
# AGENTS — [PACKAGE_NAME]

<!-- Frontmatter -->
- Inherits root AGENTS.md + Governance Pack.
- Maintainer: [OWNER_HANDLE]
- Last updated: [YYYY‑MM‑DD]
- Version: [MAJOR.MINOR.PATCH]

## Local Targets
- Test: `pnpm --filter [PACKAGE_NAME] test`
- Lint: `pnpm --filter [PACKAGE_NAME] lint`
- Typecheck: `pnpm --filter [PACKAGE_NAME] typecheck`

## Contracts
- Publishes events: `[topic:<NAME>]`
- MCP tools/resources: `[TOOL_1, TOOL_2]` (link to docs)

## Local Gates (tighten only)
- Coverage ≥ [92]% global; Mutation ≥ [90]%.
- A11y checks: `axe`/`jest-axe` as applicable.

## Notes
- Framework‑specific guidance belongs here (e.g., Angular CLI usage) — **not** in the root file.
```

---

## 30) Maintainers & Contact

* GitHub: `@jamiescottcraik`
* Issues: open under the relevant package and label `governance`
* Emergencies: see `/.cortex/rules/constitution.md` escalation tree

---

## 31) Changelog

* **1.2.0 — 2025‑10‑14**

  * Merged duplicate AGENTS docs into one authoritative file.
  * Added RFC‑2119 normative keywords and Waivers/Versioning section.
  * Introduced CI Enforcement Matrix (excerpt) and rule IDs.
  * Moved product‑specific (Wikidata) + Angular guidance out of root file.
  * Clarified Oversight Gate (formerly Vibe Check).
  * DRY’d prohibitions into `/CODESTYLE.md`.
* **1.1.x — 2025‑08** — Prior iterations.
