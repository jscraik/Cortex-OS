# AGENTS — brAInwav Cortex-OS

**Status:** Authoritative  
**Maintainer:** brAInwav Development Team  
**Scope:** Rules and runbook for all human and AI agents working in this monorepo.

---

## 0) Purpose  

- Define how agents (humans + AI) build, test, review, secure, and ship changes here.
- Centralize the “how we work” contract; CI validates key parts.
- Subprojects may ship their own `AGENTS.md`. The *nearest* file to a path is authoritative for that path. Root remains ground truth for repo-wide rules.

---

## 1) Governance & Hierarchy of Authority

When documents overlap, follow this order (highest first):

1. **Governance Pack (`/.cortex/rules/`)** — binding project rules:
   - [Time Freshness Guard](/.cortex/rules/_time-freshness.md) — anchors every agent interaction to the user's declared timezone/date and enforces recency checks.
   - [Vision](/.cortex/rules/vision.md) — end-state, scope, non-goals, and interfaces.
   - [Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md) — task lifecycle, gates, handoffs.
   - [Task Folder Structure](/.cortex/rules/TASK_FOLDER_STRUCTURE.md) — mandatory organization for `~/tasks/[feature-name]/`.
   - [Code Review Checklist](/.cortex/rules/code-review-checklist.md) — evidence-backed review, ship criteria.
   - [CI Review Checklist](/.cortex/rules/CHECKLIST.cortex-os.md) — step-by-step execution checklist for agents and reviewers.
   - [RULES_OF_AI](/.cortex/rules/RULES_OF_AI.md) — ethical guardrails, branding, production bars.
   - [Constitution](/.cortex/rules/constitution.md) — binding charter for decision authority.
2. **CODESTYLE.md (root)** — coding & testing conventions that CI enforces.
3. **This AGENTS.md (root)** — operational rules for agents; defaults for the repo.
4. **Package-level `AGENTS.md`** — may tighten rules for that subtree but cannot weaken repo standards.
5. **Model guides (root)** (`GPT-5-Codex.md`, `CLAUDE.md`, `GEMINI.md`, `QWEN.md`) — adapter specifics only.

> CI checks: presence of the Governance Pack, link validity, and that package `AGENTS.md` files don’t contradict the root.

---

## 2) Mandatory Templates & Specs

All workstreams must embed and adhere to the official templates; deviations fail review:

- [Feature Spec Template](/.cortex/templates/feature-spec-template.md) — required for every net-new capability. Link spec IDs in PR descriptions.
- [Research Template](/.cortex/templates/research-template.md) — required for investigations, benchmarks, or external analysis. Archive completed research under `project-documentation/`.
- [TDD Plan Template](/.cortex/templates/tdd-plan-template.md) — required before writing implementation code; keep red/green/refactor evidence attached to the PR.
- [Constitution Template](/.cortex/templates/constitution-template.md) — required when establishing new governance artifacts or amending decision authority.

These templates inherit the Governance Pack, `RULES_OF_AI`, and `CODESTYLE.md`. Agents must reference the relevant section IDs from each template in commit or PR notes to prove compliance.

---

### 2.1) Workflow Checklist (mandatory)

- The [Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md) defines the end-to-end lifecycle, handoffs, and stop conditions. Follow it step-by-step; deviations require documented approvals per the Constitution.
- The [CI Review Checklist](/.cortex/rules/CHECKLIST.cortex-os.md) is the canonical execution checklist for agents and reviewers.
- Before merge, attach the filled checklist (or link to the PR comment that records it) showing evidence for every gate.
- CI validates the checklist presence and key toggles; reviewers must confirm each item is satisfied or explicitly waived per the Constitution process.

Failure to follow the workflow or checklist blocks approval, and agents must halt work until gaps are resolved.

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

Each role has explicit responsibilities, interface contracts, and limits defined in its module. Role drift triggers incident review per the Agentic Coding Workflow.

---

## 5) Boundaries & Interfaces

Strict domain separation with controlled interfaces:

- No direct cross-domain imports from sibling domains (`src/` or `dist/`). Use published packages or documented contracts.
- Communicate through declared message schemas (A2A topics, MCP tool/resource/prompt definitions).
- Shared utilities must live behind common interfaces; no sneaking internal helpers across domains.
- Frontier adapters run behind policy gates; evidence any new surface in the feature spec.

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
```

> Smart targets honor the Nx/Turbo affected graph. Keep runs fast; keep diffs small; attach output evidence to the PR (screenshots, logs, trace IDs).

---

## 7) Code Style (must-follow summary)

- Functional-first; minimal hidden state.
- **Named exports only** (no `default`).
- **≤ 40 lines per function**; prefer early returns & guard clauses.
- ESM everywhere; strict types at boundaries.
- `async/await`; include `AbortSignal` for cancelable I/O.
- Never swallow errors; add context via `cause`.
- UI: React App Router, Suspense + Error Boundaries; A11y first.

See `CODESTYLE.md` for the exhaustive list. CI enforces; reviewers must cite `CODESTYLE.md` section IDs in approvals.

---

## 8) Tests & Quality Gates

- TDD by default. Co-locate tests (`__tests__` or `*.test.*`).
- Coverage gates: **≥ 90% global**, **≥ 95% changed lines** (ratchet upward only).
- Mutation testing target: **≥ 90%** where enabled.
- E2E and accessibility checks for user-facing surfaces.

Common scripts:
```bash
pnpm test
pnpm test:coverage
# per-pkg mutation gates: see package.json / stryker.conf
```

Document test evidence in the TDD plan and link results in the PR description.

---

## 9) Security, Supply Chain, Compliance

- Secrets: use env/secret managers. **No hard-coded secrets**.
- Scanners: Semgrep (block on ERROR), gitleaks (block on any finding), OSV/audit per lockfile.
- SBOM: CycloneDX per artifact; provenance via SLSA / in-toto; sign images with Cosign.
- Containers: minimal base, pinned digests, non-root user, read-only FS, drop caps.

**Absolute prohibitions (prod paths)**
- Fake data/randomness for logic; placeholder adapters; “TODO/FIXME/HACK”; fake telemetry; “not implemented” stubs; violations of `RULES_OF_AI`.

---

## 10) Accessibility (WCAG 2.2 AA)

- Semantic HTML, correct ARIA roles, consistent focus order, target size ≥ 44×44 CSS px.
- Keyboard complete; no color-only signaling.
- CLI/TUI paths expose `--plain` and screen-reader friendly output.

## 11.1) Vibe Check MCP Enforcement (brAInwav)

- Oversight: All agents must call the Vibe Check MCP tool `vibe_check` after planning and before any file writes, network calls, or long-running executions.
- Configuration: set VIBE_CHECK_HTTP_URL (default http://127.0.0.1:2091). Logs and errors must include brAInwav branding.
- Constitution: use `update_constitution/reset_constitution/check_constitution` to enforce per-session rules.
- Evidence: PRs must attach logs containing the string "brAInwav-vibe-check" around plan→act gates or CI will block.
- Automation: run `pnpm enforce:agents:local-memory` before modifying `AGENTS.md` documents; the script calls the `vibe_check` MCP, rewrites sections via `scripts/vibe-check/enforce-local-memory.sh`, and records oversight output for audit logs.

- Test with axe/jest-axe where applicable; attach reports to the TDD plan.

---

## 11) Observability & Telemetry

- OpenTelemetry traces/logs/metrics; Prometheus `/metrics`; structured logs.
- Include `brand:"brAInwav"`, request IDs, run IDs.
- Performance budgets on bundle size, runtime latency, and memory are enforced in CI; document any exceptions in the feature spec and secure approval per Constitution change process.

---

## 12) Runtime Surfaces & Auth

- **MCP requires API key** by default (dev may set `NO_AUTH=true` explicitly).
  - `X-API-Key: <key>` or `Authorization: Bearer <key>` supported.
  - `Authorization: Basic <user>:<key>` accepted; password segment must match configured key.
- SSE reuses the same guard; default port **3024**.
- Remote dev via Cloudflare tunnel in `config/cloudflared/mcp-tunnel.yml`.
- 403 triage: verify endpoint path, host/CORS, auth header, tunnel policy, dev no-auth flag. Use the [MCP 403 Playbook](PLAYBOOK.403-mcp.md) for runbook steps.

---

## 13) Inputs & Outputs

**Inputs**
- Validate with Zod schemas; deterministic positive integer seeds; explicit resource caps (tokens, time, memory).
- Reject unsanitized external data; log rejections with reason codes.

**Outputs**
- Human-readable text with context by default; `--json` flag emits machine-readable structured output.
- ISO-8601 timestamps for all temporal data.
- Structured error responses with codes; include evidence pointers (`file:line`, run IDs, URLs).

---

## 14) Memory Management

- Interface-based stores (no direct persistence access).
- Configurable memory limits per agent type; deterministic cleanup/GC.
- Serialize state for persistence across runs; follow `RULES_OF_AI` branding requirements.
- At every decision, refactor, or rectification, append the rationale and evidence to `.github/instructions/memories.instructions.md` and persist the same entry via the Local Memory MCP/REST dual mode workflow (see `docs/local-memory-fix-summary.md`). PR reviewers must confirm the memory entry exists.
- Operate in accordance with `.github/instructions/memories.instructions.md`; document evidence of adherence in the TDD plan.
- Keep MCP and REST parity by following the dual-mode guidance in `docs/local-memory-fix-summary.md`; any divergence requires Governance Pack approval.

---

## 15) Agent Toolkit (shared utilities)

Use `packages/agent-toolkit` for multi-repo search, structural codemods, cross-language checks.

```bash
just scout "<pattern>" .
just codemod 'find(:[x])' 'replace(:[x])' .
just verify changed.txt
```

Deterministic output is mandatory; attach tool logs as PR evidence.

---

## 16) Commits, PRs, Branching

- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `test:`, …). Signed commits/tags required.
- Keep diffs small; pair tests + implementation.
- PRs must pass: lint, types, tests, security, structure guard, coverage/mutation gates.
- PR descriptions must use `.github/pull_request_template.md`, link to relevant specs/plans, and cite Governance Pack sections touched.
- Reviewers must complete `.cortex/rules/code-review-checklist.md` for every PR and link to the filled checklist in review notes.
- Root governance files live at root; other docs belong in `docs/`, `.cortex/`, or package `docs/`.

---

## 17) Monorepo Layout & Nested `AGENTS.md`

- Apps in `apps/`, feature packages in `packages/`, shared libs in `libs/`.
- Nx + ESLint enforce dependency boundaries; use `pnpm lint:graph` to validate.
- You **may** add `packages/<name>/AGENTS.md` to document local targets, contracts, or extra checks.
  - These may **tighten** requirements (e.g., higher coverage) but **cannot** weaken repo rules.

**Starter template for package `AGENTS.md`:**
```md
# AGENTS — <package>

- Inherits root AGENTS.md and Governance Pack.
- Extra targets: `pnpm --filter <pkg> test:e2e`
- Contracts: publishes `<domain>` events over A2A (`topic:<name>`).
- Local gates: coverage ≥ 92% global; mutation ≥ 90%.
```

---

## 18) Environments & Ports

**Environment sources**
- Use the shared loader (`scripts/utils/dotenv-loader.mjs` via `@cortex-os/utils`) for every runtime; do **not** call `dotenv.config()` directly.
- Secrets are distributed through the 1Password-managed `.env`. Follow `docs/development/1password-env.md` and run commands with `op run --env-file=<vault export> -- pnpm <task>` or set `BRAINWAV_ENV_FILE` to the exported file path before running scripts.
- Local overrides fall back to `.env.local` then `.env` in the repo root. Keep these files out of version control and reference them in your TDD plan.

**Port registry**
- `config/ports.env` is the canonical source; update it (and commit the change) before adjusting individual services.
- `config/dev/ports.env` may override ports for developers but must respect the Cloudflare assignments (`3024`, `3026`, `3028`, `39300`).
- Container stacks source `docker/env/ports.env`; mirror updates after changing `config/ports.env`.

**Key assignments (config/ports.env)**
- `CORTEX_MCP_PORT=3024`
- `LOCAL_MEMORY_MCP_PORT=3026`
- `MEMORY_API_PORT=3028`
- `PIECES_OS_PORT=39300`
- `OLLAMA_PORT=11434`
- `REDIS_PORT=6379`
- `VSCODE_LSP_PORT=3008`

**Common env variables**
```
MCP_API_KEY=<key>
NX_BASE=<git-ref>
NX_HEAD=<git-ref>
LOCAL_MEMORY_BASE_URL=<url>
MEMORIES_SHORT_STORE=<impl>
MEMORIES_EMBEDDER=<impl>
CORTEX_SMART_FOCUS=<project-scope>
BRAINWAV_ENV_FILE=<abs-path-to-1password-export>
```

Document port or environment deviations in the feature spec and TDD plan, including evidence that the 1Password loader path was used.

---

## 19) Anti-Patterns (will fail CI)

- Default exports; functions > 40 lines; promise chains without `await`.
- Missing `brand` field in logs; fake metrics/telemetry; placeholder adapters.
- Cross-domain imports; skipping memory/context persistence.
- Unpinned dependency bumps; bypassing lockfiles; ignoring Governance Pack mandates.
- Specs, research, or TDD plans missing template IDs or evidence links.

---

## 20) Quick Command Index

```bash
# Affected workflows
pnpm build:smart && pnpm test:smart && pnpm lint:smart && pnpm typecheck:smart

# Security & structure
pnpm security:scan && pnpm structure:validate

# Coverage & mutation
pnpm test:coverage

# MCP lifecycle
pnpm mcp:start && pnpm mcp:smoke && pnpm mcp:test

# Toolkit helpers
just scout "<pattern>" .
just codemod 'find(:[x])' 'replace(:[x])' .
```

---

## 21) Where to Look Next

- Governance Pack (authoritative):
  - `/.cortex/rules/vision.md`
  - `/.cortex/rules/agentic-coding-workflow.md`
  - `/.cortex/rules/code-review-checklist.md`
  - `/.cortex/rules/RULES_OF_AI.md`
  - `/.cortex/rules/constitution.md`
- Templates (mandatory):
  - `/.cortex/templates/feature-spec-template.md`
  - `/.cortex/templates/research-template.md`
  - `/.cortex/templates/tdd-plan-template.md`
  - `/.cortex/templates/constitution-template.md`
- `CODESTYLE.md` — exact coding rules enforced by CI.
- Model guides — adapter specifics without weakening rules.
- `PLAYBOOK.403-mcp.md` — quick response guide for auth failures.

Agents must cite the relevant section IDs from these documents in every PR review and handoff. Non-compliance blocks merges automatically.

---

## 22) Time Freshness & Date Handling

- Anchor all reasoning to the user's timezone and "today" value declared by the harness; do not infer or reuse cached timestamps.
- Treat any request for the "latest", "current", or similar data as a freshness check: verify sources or ask for clarification before answering.
- Convert relative language in responses to explicit ISO-8601 dates (e.g., `2025-10-11`) to avoid ambiguity and to comply with [Time Freshness Guard](/.cortex/rules/_time-freshness.md).
- When referencing historical context, clearly separate past vs. future dates using the harness-provided current date to prevent timeline drift in downstream agents.

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions.
This prompts your AI agents to automatically use Local Memory for persistent context across conversations.
