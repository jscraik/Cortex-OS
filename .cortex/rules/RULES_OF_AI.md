---
trigger: always_on
alwaysApply: true
---
# brAInwav Cortex-OS: Rules of AI

**Version**: 1.2.0  
**Last Updated**: 2025-10-12  
**Maintainer**: brAInwav Development Team

---

## 🏛️ Hierarchy of Authority

When documents overlap or conflict, follow this order (highest → lowest):

1. **Governance Pack** `/.cortex/rules/*` — binding project rules (this document is part of it)
2. **CODESTYLE.md** (root) — coding & testing conventions enforced by CI
3. **AGENTS.md** (root) — operational rules for agents; repo defaults
4. **Package-level `AGENTS.md`** — may tighten rules; cannot weaken repo standards
5. **Model guides** (`GPT-5-Codex.md`, `CLAUDE.md`, `QWEN.md`, `GEMINI.md`) — adapter specifics only

### Governance Pack Files (mandatory reading)

- **[Time Freshness Guard](/.cortex/rules/_time-freshness.md)**
- **[Vision](/.cortex/rules/vision.md)**
- **[Agentic Coding Workflow](/.cortex/rules/agentic-coding-workflow.md)**
- **[Task Folder Structure](/.cortex/rules/TASK_FOLDER_STRUCTURE.md)**
- **[Code Review Checklist](/.cortex/rules/code-review-checklist.md)**
- **[CI Review Checklist](/.cortex/rules/CHECKLIST.cortex-os.md)**
- **[Constitution](/.cortex/rules/constitution.md)**
- **This document** `/.cortex/rules/RULES_OF_AI.md`

---

## 🧭 Governance & Structure Standards

**Root-level files policy**

- **Allowed at root**: AGENTS.md, CODESTYLE.md, README.md, CHANGELOG.md, model guides.
- **Governance enforcement**: Structure Guard validates root entries against `allowedRootEntries`.
- **Branding**: All root docs include brAInwav branding.

**Agent responsibility**: Place specialized rules/config under the correct subdirs (`.cortex/rules/`, `config/`, `docs/`, etc.).

---

## 🚨 Truthfulness & Production Bars

### Rule 1 — No false implementation claims

Never claim "production-ready/complete/operational" if any prod path contains:
- `Math.random()`-fabricated data, hardcoded mocks, placeholder adapters ("will be wired later")
- `TODO/FIXME/HACK`, `console.warn("not implemented")`
- Fake metrics/telemetry

### Rule 2 — brAInwav truthfulness standard

- Verify claims against actual code & passing gates.
- Distinguish test scaffolding from production.
- Include brAInwav branding in outputs/errors.
- Do not inflate readiness/completion metrics.

### Rule 3 — Production validation requirements

- [ ] Placeholders eliminated  
- [ ] Real integrations in place (no fake data)  
- [ ] Errors/logs branded `[brAInwav]` / `brand:"brAInwav"`  
- [ ] Docs match code  
- [ ] Tests validate real functionality

### Rule 4 — Documentation accuracy

- Status/percentages based on real metrics.
- READMEs reflect current implementation.

### Rule 5 — Commit message standards

- Accurate, evidence-backed messages.
- Add `Co-authored-by: brAInwav Development Team` when appropriate.

---

## 🔄 Mandatory Agentic Workflow (summary)

All agents follow the **7-phase** workflow. Full details: **`/.cortex/rules/agentic-coding-workflow.md`** and **AGENTS.md**.

**Task folder (mandatory)** — **`~/{tasks}/[feature]/`** per **`/.cortex/rules/TASK_FOLDER_STRUCTURE.md`**.  
**Memory parity (mandatory)** — Persist decisions to `.github/instructions/memories.instructions.md` **and** via Local Memory **MCP/REST dual-mode**; reviewers confirm entries exist.

---

## 🧪 Phase Machine & HITL (constitutional)

**State machine**: **R → G → F → REVIEW**  
- **HITL only at REVIEW**. Any `human_input` before REVIEW is a violation.  
- Agents must persist `.cortex/run.yaml` with:
  - `phase: "R"|"G"|"F"|"REVIEW"`
  - `agents_sha: <nearest AGENTS.md git-sha>`
  - `task_id`, `run_id`, `started_at`

**Evidence tokens (CI scans logs for):**
- `AGENTS_MD_SHA:<sha>`  
- `PHASE_TRANSITION:<from>-><to>`  
- `brAInwav-vibe-check`  
- `MODELS:LIVE:OK engine=<mlx|ollama|frontier>`

**AGENTS.md acknowledgement & Vibe-check**
- At session start: load nearest `AGENTS.md`, compute `agents_sha`, log `AGENTS_MD_SHA:<sha>`.
- After planning and **before** file writes/network calls/long runs: call **Vibe Check MCP** `vibe_check`; include `"brAInwav-vibe-check"` in logs.

---

## 🧱 Integration Surfaces & Auth

**Allowed** (from **vision.md**):
1. **MCP** over HTTP/SSE/optional STDIO: `/mcp`, `/sse`, `/health`, `/metrics`  
   - API key required by default (dev may set `NO_AUTH=true`)  
   - Tools/Resources/Prompts are registered (not embedded)  
   - **Single MCP hub** — no duplicate MCPs per package
2. **A2A** hub (topics/intents) — no direct cross-domain imports
3. **REST API** — authenticated, rate-limited, policy-guarded
4. **Frontier adapters** (OpenAI/Anthropic/Google/etc.)

**MCP OAuth (optional)** — Auth0 scopes: `search.read docs.write memory.read memory.write memory.delete`; RBAC + "Add Permissions in Access Token" enabled.

**Port registry (must align with `.well-known/mcp.json`)**
- `3024` MCP, `3026` Local Memory MCP, `3028` Memory API, `39300` Pieces OS

---

## 🧩 Agent Toolkit (mandatory)

Use `packages/agent-toolkit` instead of ad-hoc `rg/grep/sed/awk`.

```ts
import { createAgentToolkit } from '@cortex-os/agent-toolkit';
const tk = createAgentToolkit();
await tk.multiSearch('pattern', './src');
await tk.validateProject(['*.ts','*.py','*.rs']);
```

Deterministic output; attach logs as evidence.

---

## 💾 Hybrid Model Solution — Live-Only (CONSTITUTIONAL)

**Hard rule**: Embeddings, rerankers, generations must use **live** engines:
- **MLX** (local on-device)
- **Ollama** (local server)  
- **Frontier APIs** (OpenAI/Anthropic/Google/etc.)

**Forbidden**: Stubs/recordings/`dry_run` for models. No cached "golden" vectors. No echo rerankers.

**Evidence before merge**: `pnpm models:health && pnpm models:smoke`; attach logs (engine, model IDs, vector norms/shape, latency).

**Fallback chain**: MLX → Ollama → Frontier (if live). If unavailable, mark task **blocked**; escalate per Constitution.

---

## ♿ Accessibility (WCAG 2.2 AA)

**Non-negotiable**:
- Semantic HTML, correct ARIA roles, keyboard-complete, target ≥ 44×44 CSS px
- Screen-reader testing via `jest-axe`/axe
- No color-only signaling; consistent focus order
- CLI/TUI: support `--plain` output + high-contrast mode

Include brAInwav branding in a11y announcements where appropriate.

---

## 🛡️ Security & Supply Chain

**Scanners (blocking)**:
- **Semgrep** — block on ERROR  
- **gitleaks** — block on ANY secret detection  
- **OSV/audit** — clean lockfiles  
- **SBOM** — CycloneDX generated for all artifacts

**Environment/config**:
- Use shared loader (`scripts/utils/dotenv-loader.mjs` or `@cortex-os/utils`)
- **Never call `dotenv.config()` directly**
- No hardcoded secrets; env/secret managers only; retrieve API keys, SSH keys, and tokens via the 1Password CLI (`op`) at runtime

**Containers**: Minimal base, pinned digests, non-root user, read-only FS, dropped capabilities.

---

## 📏 Code Standards (prod paths)

- **Named exports only** (no `export default`)
- **≤ 40 lines per function** (compose via guard clauses)
- **No `any` in TypeScript** (except tests/justified compat shims)
- **No cross-domain imports** — use A2A topics/MCP tools/declared contracts
- **async/await + AbortSignal** — no `.then()` chains
- **Structured logging** — `brand:"brAInwav"`, request/run IDs, OTel traces

---

## 🧪 Quality Gates

**Coverage & mutation**:
- **≥ 90% global coverage**
- **≥ 95% changed lines**
- **≥ 90% mutation** (where enabled)

**Tests**: TDD (Red-Green-Refactor); co-locate tests; property-based for critical paths.

**Performance**: Bundle budgets, latency thresholds enforced in CI.

## ⚡ Performance Standards (constitutional)

**Performance components must meet these non-negotiable standards**:

### Rule 1 — Performance Component Standards
- **No performance regressions**: All performance components must improve or maintain existing performance metrics
- **Real metrics only**: No fake or simulated performance data in production code
- **Comprehensive monitoring**: Every performance component must include structured metrics and health checks
- **Graceful degradation**: Performance failures must not crash the system

### Rule 2 — Auto-Scaling Standards
- **ML model validation**: Auto-scaling ML models must be trained on real data with proven accuracy (>80%)
- **Cost optimization**: Scaling decisions must consider cost implications and optimize for efficiency
- **Emergency handling**: Auto-scaling must include emergency response protocols for critical load conditions
- **Predictive accuracy**: Load forecasting must achieve minimum accuracy thresholds

### Rule 3 — Resource Management Standards
- **Memory efficiency**: GPU and memory management must minimize waste and prevent leaks
- **Fair scheduling**: Resource allocation must be fair and prevent starvation
- **Capacity planning**: Resource management must include forward-looking capacity analysis
- **Resource isolation**: Performance components must not impact core system functionality

### Rule 4 — Monitoring Standards
- **Real-time metrics**: All performance components must emit real-time metrics
- **Alert thresholds**: Performance alerts must have meaningful thresholds with clear escalation paths
- **Performance baselines**: Every component must establish and maintain performance baselines
- **Anomaly detection**: Performance monitoring must include automated anomaly detection

### Rule 5 — Integration Standards
- **Event-driven communication**: Performance components must use A2A events for inter-component communication
- **Circuit breaker patterns**: All external dependencies must include circuit breaker protection
- **Backward compatibility**: Performance improvements must not break existing integrations
- **Configuration-driven**: Performance behavior must be configurable without code changes

---

## 📚 Memory Management & Persistence

**Local Memory (mandatory)**: Store context, decisions, rationale via:
1. **MCP mode**: Local Memory MCP server  
2. **REST mode**: Memory API (dual-mode for parity)  
3. **Oversight log**: `.github/instructions/memories.instructions.md`

**Task artifacts**: `~/tasks/[feature]/` (research, plans, logs, evidence) per **Task Folder Structure**.

---

## 🔍 Code Review (constitutional enforcement)

**Human reviewer (non-author)** completes `/.cortex/rules/code-review-checklist.md`:
- Paste filled checklist as top-level PR comment
- **BLOCKER** items must be PASS
- **MAJOR** items need fixes or Constitution waiver
- **MINOR** items need follow-up task

**Evidence requirements**: file paths+lines, trace IDs, screenshots, URLs.

---

## 🌐 Observability & Telemetry

**Structured logs** — include:
- `brand:"brAInwav"`
- `component:"<package-name>"`
- `trace_id`, `request_id`, `run_id`
- `level`, `msg`, `timestamp` (ISO-8601)

**Metrics/traces**: OpenTelemetry for services; Prometheus `/metrics`; no fake telemetry.

---

## 🔧 Development Environment

**Smart targets** (affected-only):
```bash
pnpm build:smart && pnpm test:smart && pnpm lint:smart
```

**Pre-merge gates**:
```bash
pnpm structure:validate && pnpm security:scan && pnpm models:health
```

**Repo boundaries**: Nx/ESLint enforce dependency graph; no circular deps.

---

## 📝 Evidence & Documentation

**PR requirements**:
- Evidence tokens in logs (`AGENTS_MD_SHA`, `brAInwav-vibe-check`, `MODELS:LIVE:OK`)
- TDD plan + coverage reports attached
- a11y validation (axe reports)
- Security scan results (clean)
- Live model smoke test logs

**Task documentation**: Complete context under `~/tasks/[feature]/` for reproducibility.

**brAInwav attribution**: `Co-authored-by: brAInwav Development Team` in commits where applicable.

---

## ⚖️ Constitutional Compliance

This document is **immutable ethics** (highest precedence in Governance Pack).

**Violations**: Policy violations trigger incident review per Constitution.

**Amendment**: Core principles (truthfulness, branding, accessibility, security) cannot be weakened.

---

**Maintained by**: brAInwav Development Team  
**Co-authored-by**: brAInwav Development Team