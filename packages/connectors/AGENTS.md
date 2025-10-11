# AGENTS — Connectors

**Status:** Inherits root; local overrides may tighten but never weaken.  
**Type:** package  
**Runtime:** python  
**Owner(s):** @brAInwav-devs  
**Primary Contacts:** #cortex-ops  
**Last Updated:** 2025-10-10

---

## 0) Front-Matter (machine-readable)

```yaml
id: agents-connectors-v1
package: Connectors
type: package
runtime: python
owners: ['@brAInwav-devs']
version: 0.1.0
coverage:
  global_min: 92
  changed_min: 95
mutation_min: 90
performance_budgets:
  cold_start_ms: 800
  p95_latency_ms: 250
  memory_mb: 256
a11y_flags: [true]
risk_flags: []
slo:
  availability: 99.9
  latency_p95_ms: 250
```

---

## 1) Inheritance & Governance

- **Nearest file wins**: this file governs only this subtree.  
- **Time freshness guard:** follow `/.cortex/rules/_time-freshness.md` to anchor timezone/date context before executing tasks.

- Cannot contradict root rules. When in doubt, follow this order:
  1) `/.cortex/rules/vision.md`  
  2) `/.cortex/rules/agentic-coding-workflow.md`  
  3) `/.cortex/rules/code-review-checklist.md`  
  4) `/CODESTYLE.md`  
  5) `/AGENTS.md` (root)  
  6) `packages/connectors/AGENTS.md` (this file)

---

## 2) Purpose & Scope

- **What this unit is for:** Adapters for ChatGPT Apps/Connectors and Perplexity SSE to operate Cortex-OS safely.
- **Responsibilities:**
- Implement the Connectors domain logic and exported APIs.
- Maintain compatibility with dependent Cortex-OS modules and contracts.
- Provide observability, security, and documentation updates alongside code changes.
- Use the official OpenAI Agents SDK (Python) for all MCP server integrations; do not vendor alternative clients.
- **Non-goals:**
  - Acting as a staging ground for unrelated experiments.
  - Owning cross-domain deployment workflows.
  - Bypassing governance, memory logging, or security gates documented at root.
- **Domain boundaries:** Interacts only with documented Cortex-OS domains through public exports and A2A contracts.

---

## 3) Public Surfaces (APIs, CLIs, Events)

### 3.1 HTTP/GRPC/WS
- HTTP/WS surfaces are documented in README.md for this module; add entries there when endpoints are introduced.

### 3.2 MCP (Tools/Resources/Prompts)
- Document any MCP tools/resources/prompts in contracts/ and README.md when they are added.

### 3.3 A2A Topics (Contracts)
- Document publishes/subscribes contracts under contracts/ when this module emits or consumes A2A topics.

### 3.4 CLI
- This package does not ship a standalone CLI.

---

## 4) Build, Run, Test

### 4.1 Python
```bash
# Environment sync (uv)
uv sync --package packages/connectors

# Run connectors server locally
uv run --package packages/connectors python -m cortex_connectors.server

# Tests (unit + integration)
uv run --package packages/connectors pytest -q

# Lint (ruff/mypy once configured)
uv run --package packages/connectors ruff check
uv run --package packages/connectors mypy src
```

> **Keep runs fast.** Use focused pytest markers (`-m "not slow"`) where appropriate.

---

## 5) Environment & Config

```env
# Required
CONNECTORS_SIGNATURE_KEY=<hmac-secret>
CONNECTORS_MANIFEST_PATH=./config/connectors.manifest.json
CONNECTORS_API_KEY=<api-key-used-by-callers>
MCP_API_KEY=<api-key-shared-with-mcp-server>

# Optional
NO_AUTH=false
LOG_LEVEL=info
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
APPS_BUNDLE_DIR=dist/apps/chatgpt-dashboard
```

- **Secrets** via 1Password/secret manager only — never commit to the repo.  
- Document overrides and defaults in `README.md` and `docs/env.md`.

---

## 6) Quality Gates (local tightening)

- Coverage: **≥ 92% global**, **≥ 95% changed lines** via `pytest --cov`.  
- Mutation: **≥ 90%** where enabled (use `mutmut` or `pytest-mutagen` when configured).  
- Performance budgets enforced in CI (see front-matter).  
- A11y: WCAG 2.2 AA for any UI surfaces (see §9).  
- **Blocking checks before merge:** lint, types, tests, coverage, security, structure-guard.

Run locally:
```bash
uv run --package packages/connectors pytest --cov=cortex_connectors
pnpm security:scan --scope=connectors
pnpm structure:validate --scope=connectors
```

---

## 7) Security & Compliance

- Scanners: **Semgrep** (block on ERROR), **gitleaks** (block on any), **OSV** per lockfile.  
- SBOM: CycloneDX generated at `./sbom/connectors.json`.  
- Provenance: SLSA/in-toto; images signed with **Cosign**.  
- Threat model notes: document in `docs/threat-model.md`.  
- Data classes: document in `docs/datasheet.md`.

**Absolute prohibitions:** placeholder adapters, fake telemetry/metrics, TODO/FIXME/HACK in prod paths, randomness-driven business logic.

---

## 8) Observability

- **OpenTelemetry** traces/logs/metrics enabled by default (instrumentation lives in `cortex_connectors.telemetry`).  
- **Prometheus**: `/metrics` exposed from the Python server when `ENABLE_PROMETHEUS=true`.  
- Log schema requires `brand:"brAInwav"`, `component:"connectors"`, and `trace_id`.

```json
{"brand":"brAInwav","component":"connectors","level":"info","msg":"started","port":0}
```

---

## 9) Accessibility (A11y)

- **UI** (if present): semantic HTML, ARIA roles, predictable focus order, target size ≥ 44×44px, no color-only signaling.  
- **CLI/TUI**: support `--plain` output, high-contrast ANSI, and avoid color-only status.  
- **Keyboard shortcuts (if UI/TUI):** `?` help • `g/G` next/prev • `Enter` open evidence • `Esc` close.  
- Add automated Axe/jest-axe (web) or snapshot validation for CLI labels.

---

## 10) Data & Migrations

- Schemas live in `contracts/` or `src/`; document migrations under `migrations/`.  
- Seed data stays out of production paths; place examples in `docs/seed.md` if needed.  
- Retention & deletion policies follow workspace governance; add package specifics in `docs/datasheet.md`.

---

## 11) Contracts & Schemas (A2A/MCP)

- Use Zod (TypeScript) or Pydantic (Python) schemas stored under `contracts/` for runtime validation.  
- **Version all contracts.** Breaking changes require a new version and migration note.  
- Provide example payloads in `contracts/examples/`.

---

## 12) E2E, Smoke, and Chaos

```bash
pnpm --filter connectors test:e2e
pnpm --filter connectors test:smoke
pnpm --filter connectors chaos:probe
```
- E2E runs against local or ephemeral environments; capture traces for failures.

---

## 13) Release, Deploy, Rollback

- Artifacts follow workspace norms (`dist/`, containers, or wheels).  
- Promotion pipeline: dev → staging → prod using documented workflows in `docs/runbooks/`.  
- Health gates: `/health` green, error rate below thresholds, latency within budgets.  
- **Rollback:** document one-command rollback in `docs/runbooks/rollback.md`.

---

## 14) Quick Command Index

```bash
# Dev & run
pnpm --filter connectors dev
pnpm --filter connectors start

# Build & verify
pnpm --filter connectors build
pnpm --filter connectors lint && pnpm --filter connectors typecheck
pnpm --filter connectors test && pnpm --filter connectors test:coverage

# Security & structure
pnpm security:scan --scope=connectors
pnpm structure:validate --scope=connectors

# MCP smoke (if applicable)
pnpm --filter connectors mcp:smoke
```

---

## 15) Pre-Commit & Pre-Merge Checklist

- [ ] **Small, focused diff**; self-review complete.  
- [ ] Tests added/updated; coverage & mutation meet local gates.  
- [ ] Contracts updated and versioned where required.  
- [ ] Security & structure scans clean (no waivers).  
- [ ] A11y checks green; CLI supports `--plain` if applicable.  
- [ ] Evidence attached in PR (file paths + line ranges, run IDs, URLs).  
- [ ] Changelog/ADR updated if behavior changes.

---

## 16) File Map (starter)

```
packages/connectors/
 ├─ src/                         # implementation
 ├─ __tests__/                   # unit/integration tests
 ├─ contracts/                   # schemas, examples, version notes
 ├─ docs/                        # env.md, datasheet.md, threat-model.md
 ├─ sbom/                        # generated CycloneDX
 ├─ migrations/                  # DB/storage migrations (if any)
 └─ AGENTS.md                    # this file
```

---

## Time Freshness & Date Handling

- Align with /.cortex/rules/_time-freshness.md: anchor decisions to the harness-declared timezone and today's date.
- Treat "latest" or similar questions as freshness checks; verify sources or confirm with stakeholders before responding.
- Convert relative timeline language in docs, runbooks, and handoffs to explicit ISO-8601 dates (e.g., 2025-10-11) to avoid ambiguity.
- Call out past vs. future dates explicitly when summarizing historical context or scheduling workstreams.

## 17) Links

- Root Governance:
  - `/.cortex/rules/vision.md`
  - `/.cortex/rules/agentic-coding-workflow.md`
  - `/.cortex/rules/code-review-checklist.md`
- `/CODESTYLE.md`
- Related ADRs: document in `docs/` (add links).  
- Dashboards/Runbooks: populate `docs/runbooks/` with service-specific entries.

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions.
This prompts your AI agents to automatically use Local Memory for persistent context across conversations.
