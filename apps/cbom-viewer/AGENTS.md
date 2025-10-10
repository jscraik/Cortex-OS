# AGENTS — Cbom Viewer

**Status:** Inherits root; local overrides may tighten but never weaken.  
**Type:** app  
**Runtime:** node  
**Owner(s):** @brAInwav-devs  
**Primary Contacts:** #cortex-ops  
**Last Updated:** 2025-10-10

---

## 0) Front-Matter (machine-readable)

```yaml
id: agents-cbom-viewer-v1
package: Cbom Viewer
type: app
runtime: node
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
- Cannot contradict root rules. When in doubt, follow this order:
  1) `/.cortex/rules/vision.md`  
  2) `/.cortex/rules/agentic-coding-workflow.md`  
  3) `/.cortex/rules/code-review-checklist.md`  
  4) `/CODESTYLE.md`  
  5) `/AGENTS.md` (root)  
  6) `apps/cbom-viewer/AGENTS.md` (this file)

---

## 2) Purpose & Scope

- **What this unit is for:** Core module for Cbom Viewer within Cortex-OS.
- **Responsibilities:**
  - Implement the Cbom Viewer domain logic and exported APIs.
  - Maintain compatibility with dependent Cortex-OS modules and contracts.
  - Provide observability, security, and documentation updates alongside code changes.
- **Non-goals:**
  - Acting as a staging ground for unrelated experiments.
  - Owning cross-domain deployment workflows.
  - Bypassing governance, memory logging, or security gates documented at root.
- **Domain boundaries:** Interacts only with documented Cortex-OS domains through public exports and A2A contracts.

---

## 3) Public Surfaces (APIs, CLIs, Events)

### 3.1 HTTP/GRPC/WS
- Serves static CBOM assets behind the dashboard; no standalone API surface.

### 3.2 MCP (Tools/Resources/Prompts)
- Does not expose MCP tools directly; leverage packages/mcp-server if needed.

### 3.3 A2A Topics (Contracts)
- No direct A2A topics; interacts through dashboard events.

### 3.4 CLI
- Use workspace commands to build and serve CBOM Viewer.

---

## 4) Build, Run, Test

### 4.1 Node/TypeScript
```bash
# Dev
pnpm --filter cbom-viewer dev

# Build
pnpm --filter cbom-viewer build

# Quality (affected-aware if available)
pnpm --filter cbom-viewer lint
pnpm --filter cbom-viewer typecheck
pnpm --filter cbom-viewer test
pnpm --filter cbom-viewer test:coverage
```

> **Keep runs fast.** Prefer affected/targeted tasks via Nx/Turbo (Node) or test selection markers (Py).

---

## 5) Environment & Config

```env
# Required
MCP_API_KEY=required
CBOM_VIEWER_BASE_URL=https://example.local
CBOM_VIEWER_DB_URL=postgres://user:pass@localhost:5432/cbom_viewer

# Optional
LOG_LEVEL=info
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
FEATURE_FLAGS=
```

- **Secrets** via env/secret manager only — never in code or `.env.example`.  
- Provide `docs/env.md` with descriptions and defaults.

---

## 6) Quality Gates (local tightening)

- Coverage: **≥ 92% global**, **≥ 95% changed lines** (ratchet-up only).  
- Mutation: **≥ 90%** where enabled.  
- Performance budgets enforced in CI (see front-matter).  
- A11y: WCAG 2.2 AA for any UI surfaces (see §9).  
- **Blocking checks before merge:** lint, types, tests, coverage, security, structure-guard.

Run locally:
```bash
pnpm --filter cbom-viewer test:coverage
pnpm security:scan --scope=cbom-viewer
pnpm structure:validate --scope=cbom-viewer
```

---

## 7) Security & Compliance

- Scanners: **Semgrep** (block on ERROR), **gitleaks** (block on any), **OSV** per lockfile.  
- SBOM: CycloneDX generated at `./sbom/cbom-viewer.json`.  
- Provenance: SLSA/in-toto; images signed with **Cosign**.  
- Threat model notes: document in `docs/threat-model.md`.  
- Data classes: document in `docs/datasheet.md`.

**Absolute prohibitions:** placeholder adapters, fake telemetry/metrics, TODO/FIXME/HACK in prod paths, randomness-driven business logic.

---

## 8) Observability

- **OpenTelemetry** traces/logs/metrics enabled by default.  
- **Prometheus**: `/metrics` exposed when relevant env toggles are set.  
- Log schema requires `brand:"brAInwav"`, `component:"cbom-viewer"`, and `trace_id`.

```json
{"brand":"brAInwav","component":"cbom-viewer","level":"info","msg":"started","port":0}
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
pnpm --filter cbom-viewer test:e2e
pnpm --filter cbom-viewer test:smoke
pnpm --filter cbom-viewer chaos:probe
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
pnpm --filter cbom-viewer dev
pnpm --filter cbom-viewer start

# Build & verify
pnpm --filter cbom-viewer build
pnpm --filter cbom-viewer lint && pnpm --filter cbom-viewer typecheck
pnpm --filter cbom-viewer test && pnpm --filter cbom-viewer test:coverage

# Security & structure
pnpm security:scan --scope=cbom-viewer
pnpm structure:validate --scope=cbom-viewer

# MCP smoke (if applicable)
pnpm --filter cbom-viewer mcp:smoke
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
apps/cbom-viewer/
 ├─ src/                         # implementation
 ├─ __tests__/                   # unit/integration tests
 ├─ contracts/                   # schemas, examples, version notes
 ├─ docs/                        # env.md, datasheet.md, threat-model.md
 ├─ sbom/                        # generated CycloneDX
 ├─ migrations/                  # DB/storage migrations (if any)
 └─ AGENTS.md                    # this file
```

---

## 17) Links

- Root Governance:
  - `/.cortex/rules/vision.md`
  - `/.cortex/rules/agentic-coding-workflow.md`
  - `/.cortex/rules/code-review-checklist.md`
- `/CODESTYLE.md`
- Related ADRs: document in `docs/` (add links).  
- Dashboards/Runbooks: populate `docs/runbooks/` with service-specific entries.
