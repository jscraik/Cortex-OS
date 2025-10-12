# AGENTS — brAInwav Cortex-OS

**Status:** Authoritative  
**Maintainer:** brAInwav Development Team  
**Scope:** Rules and runbook for all human and AI agents working in this monorepo.

---

## 0) Purpose

- Define how agents (humans + AI) build, test, review, secure, and ship changes here.
- Centralize the "how we work" contract; CI validates key parts.
- Subprojects may ship their own `AGENTS.md`. The *nearest* file to a path is authoritative for that path. Root remains ground truth for repo-wide rules.

---

## 1) Governance & Hierarchy of Authority

When documents overlap, follow this order (highest first):

1. **Governance Pack (`/.cortex/rules/`)** — binding project rules:
   - [Time Freshness Guard](/.cortex/rules/_time-freshness.md) — anchor every agent interaction to the user's timezone/date and enforce recency checks.
   - [Vision](/.cortex/rules/vision.md) — end-state, scope, non-goals, interfaces.
   - [Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md) — task lifecycle, gates, handoffs.
   - [Task Folder Structure](/.cortex/rules/TASK_FOLDER_STRUCTURE.md) — mandatory organization for `~/tasks/[feature-name]/`.
   - [Code Review Checklist](/.cortex/rules/code-review-checklist.md) — evidence-backed review, ship criteria.
   - [CI Review Checklist](/.cortex/rules/CHECKLIST.cortex-os.md) — execution checklist for agents and reviewers.
   - [RULES_OF_AI](/.cortex/rules/RULES_OF_AI.md) — ethical guardrails, branding, production bars.
   - [Constitution](/.cortex/rules/constitution.md) — binding charter for decision authority.
2. **CODESTYLE.md (root)** — coding, testing, accessibility, logging, and platform conventions enforced by CI.
3. **This AGENTS.md (root)** — operational rules for agents; defaults for the repo.
4. **Package-level `AGENTS.md`** — may tighten rules for that subtree but cannot weaken repo standards.
5. **Model guides (root)** (`GPT-5-Codex.md`, `GEMINI.md`, `CLAUDE.md`, `QWEN.md`) — adapter specifics only.

> CI checks: presence of the Governance Pack, link validity, and that package `AGENTS.md` files don't contradict the root.

---

## 2) Mandatory Templates & Specs

All workstreams must embed and adhere to the official templates; deviations fail review:

- [Feature Spec Template](/.cortex/templates/feature-spec-template.md) — required for every net-new capability (link spec IDs in PRs).
- [Research Template](/.cortex/templates/research-template.md) — required for investigations/benchmarks; archive in `project-documentation/`.
- [TDD Plan Template](/.cortex/templates/tdd-plan-template.md) — required **before** implementation; attach red/green/refactor evidence to the PR.
- [Constitution Template](/.cortex/templates/constitution-template.md) — for new or amended governance artifacts.

### 🌐 Wikidata Semantic Integration (PRODUCTION READY ✅)

**Critical Production Capability**: Complete semantic search and knowledge enrichment for all agents:

- **Usage Documentation**: `packages/rag/docs/wikidata-integration-usage.md` - Comprehensive integration guide
- **Core Functions**: `executeWikidataWorkflow()`, `routeFactQuery()`, `generateContextualSparqlQuery()`
- **MCP Tools**: Vector search, claims retrieval, SPARQL queries with provenance tracking
- **Testing Infrastructure**: AgentMCPClientStub for development and comprehensive testing
- **Quality Status**: 17/17 tests passing, zero prohibited patterns, full brAInwav compliance

**Agent Requirements**:
- Reference usage guide for all semantic search implementations
- Use established patterns from AgentMCPClientStub for testing
- Include brAInwav branding in all semantic responses
- Follow documented error handling and configuration patterns

Agents must reference relevant section IDs from these templates in PR notes to prove compliance.

### 2.1) Workflow Checklist (mandatory)

- Follow the [Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md) step-by-step; deviations require documented approvals per the Constitution.
- Use the [CI Review Checklist](/.cortex/rules/CHECKLIST.cortex-os.md) for execution and reviewer sign-off.
- **Enforce Code Review Checklist:** Every PR **must** include a completed copy of `/.cortex/rules/code-review-checklist.md` (see §26 for enforcement). Link it in the PR description and pin the filled checklist as a top-level PR comment.
- Before merge, attach the filled checklists (or link to the PR comments containing them) with evidence for every gate.
- CI validates checklist presence and key toggles; reviewers confirm each item is satisfied or explicitly waived per Constitution process.

---

## 3) Project Overview

Cortex-OS is a local-first, vendor-neutral **Agentic Second Brain Runtime (ASBR)** that orchestrates multi-agent workflows, persists knowledge, and exposes controlled surfaces: **MCP (HTTP/SSE/STDIO)**, **A2A**, and **REST**. The Ops Dashboard provides health/logs/metrics/traces and manual controls.

**Allowed interfaces**
- MCP hub: `/mcp` (protocol), `/sse` (stream), `/health`, `/metrics`
- A2A hub: agent-to-agent messaging (topics, intents)
- REST: programmatic control & integrations
- Frontier adapters: model/tool connectors behind policy gates

**Non-goals**
- Multiple MCP servers per package; hidden side-channels; unaudited actions.

---

## 4) Roles

- **MCP Agents** — Model Context Protocol handlers for external tool integration.
- **A2A Agents** — Agent-to-Agent communication coordinators.
- **RAG Agents** — Retrieval-Augmented Generation processors for knowledge queries.
- **Simlab Agents** — Simulation environment controllers.

Role drift triggers incident review (see Agentic Coding Workflow).

---

## 5) Boundaries & Interfaces

- Strict domain separation; **no cross-domain imports** from sibling domains. Use published packages or documented contracts.
- Communicate via declared message schemas (A2A topics, MCP tools/resources/prompts).
- Shared utilities must live behind common interfaces; no internal helper leakage.
- Frontier adapters run behind policy gates; every new surface must be evidenced in the feature spec.

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

**Pre-PR verification**
```bash
pnpm structure:validate
pnpm security:scan
pnpm test:safe
pnpm models:health   # live model healthcheck (MLX/Ollama/Frontier)
```

Smart targets honor the Nx/Turbo affected graph. Keep runs fast; keep diffs small; attach output evidence to the PR (screenshots, logs, trace IDs).

---

## 7) Code Style (must-follow summary)

- Functional-first; minimal hidden state.
- Named exports only (no default).
- ≤ 40 lines per function; prefer guard clauses.
- ESM everywhere; strict types at boundaries.
- async/await; provide AbortSignal for cancelable I/O.
- Never swallow errors; attach context via cause.
- UI: Next.js App Router, Suspense + Error Boundaries; WCAG 2.2 AA.

**Production-path hard checks**
- No any in TypeScript (tests and justified type-compat shims only).
- No ambient randomness/time in core logic (inject seeds/clocks).
- No eval/dynamic Function; validate/sanitize all external inputs.

See CODESTYLE.md for exhaustive rules; CI enforces rule IDs.

---

## 8) Tests & Quality Gates

- TDD by default. Co-locate tests (`__tests__` or `*.test.*`).
- Coverage gates: ≥ 90% global, ≥ 95% changed lines (ratchet-only upward).
- Mutation testing target: ≥ 90% where enabled.
- E2E + accessibility checks for user-facing surfaces.
- If risk to coverage/mutation exists, propose one minimal incremental test in the PR.

**Common scripts:**
```bash
pnpm test
pnpm test:coverage
# per-pkg mutation gates: see package.json / stryker.conf
```

Attach TDD evidence + results links in the PR.

---

## 9) Security, Supply Chain, Compliance

- Secrets: use env/secret managers. No hard-coded secrets.
- Scanners: Semgrep (block on ERROR), gitleaks (block on ANY), OSV/audit per lockfile.
- SBOM: CycloneDX per artifact; provenance via SLSA/in-toto; sign images with Cosign.
- Containers: minimal base, pinned digests, non-root user, read-only FS, drop caps.
- No fake telemetry; no "mock/fake metric/data" in prod paths.

**Absolute prohibitions (prod paths)**
- Math.random() used to fabricate data; placeholder adapters; TODO/FIXME/HACK; console.warn("not implemented").
- Any fake/stub/simulated MLX or Ollama usage (embeddings, rerankers, models) or any simulated component of the hybrid-model pipeline. Runtime must call live engines only; no placeholder vectors, no recorded/"golden" inference outputs, no echo rerankers, no "dry_run" model modes.

---

## 10) Accessibility (WCAG 2.2 AA)

- Semantic HTML, correct ARIA roles, consistent focus order, target size ≥ 44×44 CSS px.
- Keyboard complete; no color-only signaling.
- CLI/TUI paths expose --plain and screen-reader-friendly output.

---

## 11) Vibe Check MCP (brAInwav Oversight)

- All agents must call the Vibe Check MCP tool `vibe_check` after planning and before file writes, network calls, or long executions.
- Config: VIBE_CHECK_HTTP_URL (default http://127.0.0.1:2091). Logs/errors must include [brAInwav] branding.
- Constitution helpers: update_constitution, reset_constitution, check_constitution.
- Evidence: PRs must attach logs containing "brAInwav-vibe-check" at plan→act gates; CI blocks otherwise.
- Automation: pnpm enforce:agents:local-memory rewrites sections via scripts/vibe-check/enforce-local-memory.sh and records outputs for audit.

---

## 12) Observability & Telemetry

- OpenTelemetry traces/logs/metrics; Prometheus /metrics; structured logs with brand:"brAInwav", request/run IDs.
- Performance budgets (bundle/time/memory) enforced in CI; exceptions must be documented and Constitution-approved.

---

## 13) Runtime Surfaces & Auth

- MCP requires API key by default (dev may set NO_AUTH=true explicitly).
- Headers: X-API-Key: <key> or Authorization: Bearer <key>; Basic auth supported if password == key.
- OAuth2 mode (e.g., Auth0): set AUTH_MODE=oauth2 (or optional) and configure AUTH0_DOMAIN, AUTH0_AUDIENCE, MCP_RESOURCE_URL, REQUIRED_SCOPES=search.read docs.write memory.read memory.write memory.delete.
- SSE uses same guard; default port 3024.
- Remote dev via Cloudflare tunnel config/cloudflared/mcp-tunnel.yml.
- 403 triage: path/host/CORS/auth header/tunnel policy/dev no-auth flag. See PLAYBOOK.403-mcp.md.

---

## 14) Inputs & Outputs

**Inputs**
- Validate with Zod; deterministic positive integer seeds; explicit resource caps (tokens/time/memory).
- Reject unsanitized external data; log rejections with reason codes.

**Outputs**
- Human-readable by default; --json emits structured output.
- ISO-8601 timestamps everywhere.
- Structured error responses with codes + evidence pointers (file:line, run IDs, URLs).

---

## 15) Memory Management

- Interface-based stores (no direct persistence access).
- Configurable memory limits per agent type; deterministic cleanup/GC.
- Serialize state across runs; follow RULES_OF_AI branding needs.
- On each decision/refactor/rectification:
  - Append rationale + evidence to .github/instructions/memories.instructions.md.
  - Persist the same entry via Local Memory MCP/REST dual-mode (see docs/local-memory-fix-summary.md).
  - Reviewers must confirm memory entries exist; MCP and REST parity is mandatory unless Governance approves divergence.

---

## 16) Agent Toolkit (shared utilities)

Use packages/agent-toolkit for multi-repo search, structural codemods, cross-language checks.

```bash
just scout "<pattern>" .
just codemod 'find(:[x])' 'replace(:[x])' .
just verify changed.txt
```

Deterministic output is mandatory; attach tool logs as PR evidence. Prefer agent-toolkit/just recipes over raw rg/grep/sed/awk.

---

## 17) Commits, PRs, Branching

- Conventional Commits; signed commits/tags required.
- Keep diffs small; pair tests + implementation.
- PRs must pass: lint, types, tests, security, structure guard, coverage/mutation gates.
- Use .github/pull_request_template.md; link specs/plans; cite Governance sections touched.
- Enforced: Reviewers must complete /.cortex/rules/code-review-checklist.md (see §26) and link the filled checklist in review notes.

---

## 18) Monorepo Layout & Nested AGENTS.md

- Apps in apps/, feature packages in packages/, shared libs in libs/.
- Nx + ESLint enforce dependency boundaries (pnpm lint:graph to validate).
- You may add packages/<name>/AGENTS.md to document local targets, contracts, or extra checks.
- These may tighten requirements (e.g., higher coverage) but cannot weaken root rules.

**Starter template for package AGENTS.md:**
```md
# AGENTS — <package>

- Inherits root AGENTS.md + Governance Pack.
- Local targets: `pnpm --filter <pkg> test:e2e`
- Contracts: publishes `<domain>` events over A2A (`topic:<name>`).
- Local gates: coverage ≥ 92% global; mutation ≥ 90%.
```

---

## 19) Environments & Ports

**Environment loading**
- Use the shared loader (scripts/utils/dotenv-loader.mjs or @cortex-os/utils) for every runtime.
- Do not call dotenv.config() directly.
- Secrets are distributed via 1Password export. See docs/development/1password-env.md (op run --env-file=... -- pnpm <task>). Optionally set BRAINWAV_ENV_FILE to the exported path.

**Port registry**
- config/ports.env is authoritative; mirror in config/dev/ports.env and docker/env/ports.env after changes.
- Respect Cloudflare assignments (3024, 3026, 3028, 39300).

**Key assignments**
- CORTEX_MCP_PORT=3024
- LOCAL_MEMORY_MCP_PORT=3026
- MEMORY_API_PORT=3028
- PIECES_OS_PORT=39300
- OLLAMA_PORT=11434, REDIS_PORT=6379, VSCODE_LSP_PORT=3008

**MCP config**
- Verify .well-known/mcp.json and port congruence (3024/3026/3028/39300) in PRs.

---

## 20) Anti-Patterns (will fail CI)

- Default exports; >40-line functions; promise chains without await.
- TypeScript any in production code (outside tests/justified shims).
- Missing brand in logs/errors; fake metrics/telemetry; placeholder adapters.
- Cross-domain imports; skipping memory/context persistence.
- Unpinned dependency bumps; bypassing lockfiles; ignoring Governance mandates.
- Raising pnpm childConcurrency or Nx parallelism beyond documented mitigations without approved evidence.
- "Will be wired later", "follow-up", "implemented later" in prod paths.
- Simulated/recorded inference for MLX/Ollama/hybrid models in any runtime path (including embeddings/rerankers). CI and tests must use live models (tiny/quantized allowed), never mocks/fixtures.

---

## 21) Quick Command Index

```bash
# Affected workflows
pnpm build:smart && pnpm test:smart && pnpm lint:smart && pnpm typecheck:smart

# Security & structure
pnpm security:scan && pnpm structure:validate

# Coverage & mutation
pnpm test:coverage

# Models (live only)
pnpm models:health && pnpm models:smoke

# MCP lifecycle
pnpm mcp:start && pnpm mcp:smoke && pnpm mcp:test

# Toolkit helpers
just scout "<pattern>" .
just codemod 'find(:[x])' 'replace(:[x])' .
```

---

## 22) Where to Look Next

- Governance Pack (authoritative):
  - /.cortex/rules/vision.md
  - /.cortex/rules/agentic-coding-workflow.md
  - /.cortex/rules/code-review-checklist.md
  - /.cortex/rules/RULES_OF_AI.md
  - /.cortex/rules/constitution.md
- Templates (mandatory):
  - /.cortex/templates/feature-spec-template.md
  - /.cortex/templates/research-template.md
  - /.cortex/templates/tdd-plan-template.md
  - /.cortex/templates/constitution-template.md
- CODESTYLE.md — exact coding rules enforced by CI.
- Model guides — adapter specifics without weakening rules.
- PLAYBOOK.403-mcp.md — quick response guide for auth failures.

Agents must cite relevant section IDs from these documents in every PR review and handoff.

---

## 23) Time Freshness & Date Handling

- Anchor all reasoning to the harness-provided timezone and "today".
- Treat "latest/current" queries as freshness checks; verify sources or clarify.
- Convert relative language to explicit ISO-8601 dates.
- Clearly separate past vs future using the harness date to prevent timeline drift.

---

## 24) Local Memory (operational default)

Proactively use Local Memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Persist key insights (lessons learned, architectural decisions, strategies, outcomes). Use semantic search and relationship mapping across projects/sessions. Agents must store decisions/rationales as described in §15 and maintain MCP/REST parity.

---

## 25) Hybrid Model Solution — Live Only (MLX / Ollama / Frontier)

**Hard rules**
- No fakes, no stubs, no recorded outputs, no "dry_run" modes for embeddings, rerankers, or generation. All inference must run against live engines (MLX on-device, Ollama local server, or approved Frontier APIs).
- Embeddings must be real: no zero/identity vectors, no constant hashes, no cached "golden" vectors used as runtime results.
- Reranking must be real: no echo/sort-by-length proxies; must call a live reranker model.
- Fallback chain: MLX → Ollama → Frontier, but only if each hop is live. If none are available, mark the task blocked and follow Constitution escalation. Do not swap in a fake engine.

**Health & evidence**
- Pre-merge, run: pnpm models:health && pnpm models:smoke
- Verifies MLX device availability, Ollama /api/tags, minimal live inference, and sample embedding dimensionality.
- Attach logs (model IDs, vector norms, latency) to the PR.
- Logs must include brand:"brAInwav" and engine:{mlx|ollama|frontier} fields.

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

**Source of truth:** /.cortex/rules/code-review-checklist.md

**Who completes it**
- At least one human reviewer who is not the PR author must complete and sign the checklist.
- Agent self-review is not sufficient; agents may propose answers, but a human must confirm.

**Format & placement**
- Include a PR description link to the checklist path:
```
CODE-REVIEW-CHECKLIST: /.cortex/rules/code-review-checklist.md
```
- Paste a filled copy of the checklist as a top-level PR comment, with:
  - Commit: <HEAD_SHA>
  - Scope: list of changed packages/paths
  - Evidence pointers for each item: file://path:line-range, log/trace IDs, screenshots, URLs.

**Gating rules**
- Items marked BLOCKER in the checklist must be ☑ PASS.
- Any attempt to merge with an unchecked BLOCKER fails CI.
- MAJOR findings require either:
  - fix before merge or
  - a Constitution waiver link with approver and expiry.
- MINOR findings may defer only with a linked follow-up task (tasks/<slug>).

**CI enforcement**
- The structure guard checks for:
  - Presence of the literal token CODE-REVIEW-CHECKLIST: pointing to the canonical path.
  - A top-level PR comment by a non-author with all BLOCKER items ticked.
  - At least one evidence pointer per checklist section.
  - If any check fails, the job blocks merge and posts guidance.

**Records**
- On merge, the filled checklist is mirrored into `.cortex/audit/reviews/<PR_NUMBER>-<SHORT_SHA>.md` by CI for audit trail.

**Related requirements**
- The checklist must reference live model evidence when changes touch the hybrid model solution (see §25), including model IDs and sample inference logs.
- Reviewers must confirm branding in logs/errors ([brAInwav]) and compliance with WCAG checks for UI diffs.

---