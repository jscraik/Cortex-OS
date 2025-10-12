# AGENTS — ChatGPT Dashboard Widget

**Status:** Inherits root; local overrides may tighten but never weaken.  
**Type:** app  
**Runtime:** node  
**Owner(s):** @brAInwav-devs  
**Primary Contacts:** #cortex-ops  
**Last Updated:** 2025-10-10

---

## 0) Front-Matter (machine-readable)

```yaml
id: agents-chatgpt-dashboard-v1
package: ChatGPT Dashboard Widget
type: app
runtime: node
owners: ['@brAInwav-devs']
version: 0.1.0
coverage:
  global_min: 94
  changed_min: 97
mutation_min: 90
performance_budgets:
  lcp_ms: 2500
  tbt_ms: 300
  hydration_ms: 800
a11y_flags: [true]
risk_flags: []
slo:
  availability: 99.5
  latency_p95_ms: 200
```

---

## 1) Inheritance & Governance

- Follow governance priority: `/.cortex/rules/vision.md` → `/.cortex/rules/agentic-coding-workflow.md` → `/.cortex/rules/code-review-checklist.md` → `/CODESTYLE.md` → `/AGENTS.md` (root) → this file.
- **Time freshness guard:** anchor timezone/date context per `/.cortex/rules/_time-freshness.md` before executing tasks or shipping guidance.
- **Mandatory Templates:** Must use all templates from `/.cortex/templates/` - feature specs, research, TDD plans, constitution updates.
- **Vibe Check MCP:** Call `vibe_check` tool after planning and before file writes/network calls. Config: VIBE_CHECK_HTTP_URL (default http://127.0.0.1:2091).
- Cite relevant sections in PRs and reviews.

---

## 2) Purpose & Scope

- **Purpose:** Ship the ChatGPT Apps widget bundle that visualizes connector health, approvals, and sample actions.
- **Responsibilities:**
  - Maintain React/Webpack build targeting ESM output served by connectors server with the OpenAI Apps SDK integration.
  - Ensure UI complies with WCAG 2.2 AA and brAInwav branding.
  - Provide hooks and adapters that consume the connectors manifest safely.
- **Non-goals:**
  - Serving as an operator dashboard outside ChatGPT context.
  - Owning MCP server lifecycle (belongs to Python connectors package).
  - Holding backend secrets or business logic beyond API projection.

---

## 3) Public Surfaces

- **Apps Widget**: Exported as static assets consumed by ChatGPT Apps runtime; documented in `README.md`.
- **No MCP/A2A surfaces**: UI fetches data via connectors server HTTP endpoints only.

---

## 4) Build, Run, Test

```bash
# Install dependencies (affected-aware via pnpm workspace)
pnpm --filter apps/chatgpt-dashboard install

# Develop with webpack-dev-server (requires mock API)
pnpm --filter apps/chatgpt-dashboard start

# Build production bundle (ESM)
pnpm --filter apps/chatgpt-dashboard build

# Tests (Jest + Testing Library)
pnpm --filter apps/chatgpt-dashboard test
pnpm --filter apps/chatgpt-dashboard test:a11y
pnpm --filter apps/chatgpt-dashboard test:perf
```

> Keep bundles small (<250 kB). Use code splitting and lazy loading for heavy components.

---

## 5) Environment & Config

- UI reads runtime config from `window.__CONNECTORS_CONFIG__` injected by connectors server.
- Provide mock config in `src/config/mock.ts` for local development.
- Do not embed secrets in the bundle; rely on connectors server API key enforcement.

---

## 6) Quality Gates (local tightening)

- Coverage ≥94% global, ≥97% changed lines (Jest + Testing Library).
- Axe accessibility audits required in CI.
- Bundle analyzer must show <250 kB gzipped asset by default.
- Run locally:
```bash
pnpm --filter apps/chatgpt-dashboard test --coverage
pnpm --filter apps/chatgpt-dashboard lint
pnpm --filter apps/chatgpt-dashboard build && pnpm --filter apps/chatgpt-dashboard analyze
```

---

## 7) Security & Compliance

- No secrets or tokens inside bundle code.
- Sanitize all untrusted data from connectors API before rendering.
- Use CSP-friendly patterns; avoid inline scripts by default.
- Document telemetry events and ensure they include `brand:"brAInwav"`.

---

## 8) Observability

- Emit structured console logs in development with `brand`, `component:"chatgpt-dashboard"`, and `traceId`.
- Telemetry events should integrate with connectors server OTel spans via browser instrumentation (to be added in future iteration).

---

## 9) Accessibility

- Meet WCAG 2.2 AA across keyboard navigation, focus management, color contrast.
- Provide aria-live regions for status changes and ensure every interactive element is ≥44×44 CSS px.
- Include screen reader documentation in `README.md` for manual QA.

---

## 10) Release Checklist Additions

- Attach bundle report to PR (size + hashed filenames).
- Record manifest compatibility tests (UI vs server) in evidence checklist.
- Update connectors operator docs with widget changes.
- **Code Review Checklist:** Completed `/.cortex/rules/code-review-checklist.md` linked in PR with all BLOCKER items ☑ PASS.
- **Vibe Check Evidence:** PR contains logs with "brAInwav-vibe-check" at plan→act gates.
- **Memory Persistence:** Decision logged in `.github/instructions/memories.instructions.md` and persisted via Local Memory MCP/REST.
- **Live Model Evidence:** Model IDs and sample inference logs attached for hybrid model changes (if applicable).

## Time Freshness & Date Handling

- Align with /.cortex/rules/_time-freshness.md: anchor decisions to the harness-declared timezone and today's date.
- Treat "latest" or similar questions as freshness checks; verify sources or confirm with stakeholders before responding.
- Convert relative timeline language in docs, runbooks, and handoffs to explicit ISO-8601 dates (e.g., 2025-10-11) to avoid ambiguity.
- Call out past vs. future dates explicitly when summarizing historical context or scheduling workstreams.

## Local Memory

Proactively use local-memory MCP to store, retrieve, update, and analyze memories to maintain context and build expertise over time. Store key insights including lessons learned, architectural decisions, development strategies, and project outcomes. Use semantic search and relationship mapping to find relevant memories across all projects and sessions.
This prompts your AI agents to automatically use Local Memory for persistent context across conversations.
