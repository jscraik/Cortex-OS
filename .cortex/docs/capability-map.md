# Capability map: Four roles, one OS (ASBR-governed)

> **⚠️ HISTORICAL DOCUMENT**: This document references `apps/api` which has been removed from the codebase. Content preserved for historical reference and architectural context.

Principles

Vendor-neutral. Local-first. Deterministic. Governed via ASBR. Accessibility-aware.

Key constraint: No cross-feature imports. Communication only via A2A events, DI service interfaces, or MCP tools.

## apps/cortex-os — ASBR-lite brain

Application invariants, step context, and system gatekeeping interact inside the Cortex-OS runtime to anchor the core responsibilities of the ASBR-lite brain:

- **Vision:** One governed runtime.
- **Mission:** Wire services, enforce contracts, route, prove.
- **Must:** DI, contract registry, policy router, OTEL, provenance, structure-guard.
- **Should:** Privacy pin to MLX; cost guardrails; policy hot-reload.
- **Nice:** Admin health/routing UI.
- **Use cases:** start workflow; route capability; emit lifecycle events.

See [agents framework](./agents-framework.md) for additional context and component detail.

## 1) AI Tutor/Mentor

- What: Curriculum + code labs + spaced recall + graded reviews.
- Why: Faster skill acquisition with proofs.
- Where: `packages/{memories,rag,simlab}` + review-neuron gate.
- How: Plans in ASBR create labs; RAG bundles feed content; review-neuron scores; memories schedule recall.
- Result: Evidence-backed learning with recall schedules.

Contracts

- `schemas/tutor.plan.schema.json`
- `schemas/tutor.review.schema.json`
- Events: `tutor.lesson.assigned`, `tutor.review.completed`, `tutor.recall.due`

CLI

```bash
cortex tutor:new --goal "Rust crash course"
cortex tutor:lab --topic "lifetimes" --level 2
cortex tutor:review --lab LAB_ID
```

## 2) Product/Project Manager

- What: PRP → tasks → milestones → OKRs with gates and ownership.
- Why: Single queue, auditable progress.
- Where: `packages/orchestration` + `packages/a2a` + memories.
- How: PRP parsed into typed tasks; ASBR enforces stage gates; events drive status.
- Result: Deterministic delivery with timestamps and evidence.

Contracts

- `schemas/prp.plan.schema.json`
- `schemas/pm.task.schema.json`
- Events: `pm.task.created`, `pm.milestone.reached`, `pm.okr.updated`

CLI

```bash
cortex prp:new --title "Auth v2"
cortex prp:plan --file prp.yaml
cortex pm:board --status active
```

## 3) Chat Tool

- What: Unified chat over local models and MCP tools with citations.
- Why: One interface, logged context, reproducible runs.
- Where: `packages/model-gateway` + `packages/mcp` + memories.
- How: Sessions pinned to retrieval bundles; tools allowlisted; transcripts stored with provenance.
- Result: Traceable chats with tool use and sources.

Contracts

- `schemas/chat.session.schema.json`
- `schemas/chat.toolcall.schema.json`
- Events: `chat.session.started`, `chat.tool.used`

CLI

```bash
cortex chat --session dev-123 --tools github,jira --bundle repo:cortex-os
```

## 4) End-to-End Software Development (PRP Framework)

- What: Scaffold → codegen → tests → review → build → SBOM → release.
- Why: Reproducible, policy-gated pipeline.
- Where: `packages/{agents,orchestration,model-gateway,mcp}` + CI gates.
- How: Frontier tools via MCP; review-neuron JSON gate; SBOM + signing; ASBR sequences stages.
- Result: Release artifacts with provenance and blocking gates.

Contracts

- `schemas/dev.pipeline.schema.json`
- `schemas/review.schema.json`
- Events: `dev.scaffold.ready`, `dev.tests.passed`, `dev.review.blockers`, `dev.release.published`

CLI

```bash
cortex dev:scaffold nextjs --out apps/web
cortex dev:codegen --spec openapi.yaml
cortex dev:test && cortex dev:review && cortex dev:build && cortex dev:release
```

---

## Connection points

- HTTP in/out: `apps/api` (REST, webhooks)
- MCP in/out: `packages/mcp` (clients + outbound servers)
- A2A bus: `packages/a2a` (typed events, DLQ/outbox via a2a-services)
- Agents: `packages/agents` call MCP, emit A2A
- Models: `packages/model-gateway` on http://127.0.0.1:8081 (`/embeddings`, `/rerank`, `/chat`)

Note: Feature mounts under `apps/cortex-os/packages/` (evidence, ingest, planner, rag) are coordinated by ASBR; cross-feature imports are forbidden.

---

## Platform services (how it stays decoupled)

- ASBR Runtime: Plans, contracts, routing, enforcement.
- A2A Bus: Typed events, at-least-once, DLQ/outbox.
- Service Interfaces: Narrow, DI-bound contracts in `mvp/contracts`.
- MCP: External tools as capability-scoped servers/clients.
- Model-gateway: Local MLX/Ollama behind OpenAI-style `/chat`, `/embeddings`, plus `/rerank`.
- Memories: Encrypted stores with TTL and provenance.
- RAG: Bundled retrieval with source citations.
- Simlab: Scenario testing, failure injection.
- Security/Gov: Policies in `.cortex/` with CI gates, SBOM+signing.
- Telemetry: OTEL spans for plan→gate→release.

---

## Minimal contracts (sketch)

`schemas/review.schema.json`

```json
{
  "type": "object",
  "$id": "review.schema.json",
  "properties": {
    "blockers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "evidence": { "type": "array", "items": { "type": "string" } },
          "path": { "type": "string" },
          "range": { "type": "string" }
        },
        "required": ["id", "evidence"]
      }
    },
    "majors": { "type": "array", "items": { "type": "object" } }
  },
  "required": ["blockers", "majors"]
}
```

`schemas/prp.plan.schema.json`

```json
{
  "type": "object",
  "$id": "prp.plan.schema.json",
  "properties": {
    "goals": { "type": "array", "items": { "type": "string" } },
    "milestones": { "type": "array" },
    "tasks": { "type": "array" }
  },
  "required": ["goals", "tasks"]
}
```

---

## Enforcement and guardrails

- Imports: Ban `@cortex-os/*/src/*`. Use interfaces in `packages/mvp/contracts/*`.
- Events: Central catalog in `packages/a2a/src/events.ts` with Zod schemas.
- FS writes: Sandbox to `/var/cortex/tmp` and `./.cortex/tmp`.
- Structure: `.cortex/policy/structure.json` + `tools/structure-guard` pre-commit + CI.
- Gates: Review-neuron policy blocks merge if `blockers.length > 0`.

---

## Tests (critical TDD)

- `a2a.events.spec.ts`: schema validation, retries, idempotency.
- `prp.plan.spec.ts`: PRP → tasks fan-out, ownership assignment.
- `review.policy.spec.ts`: gate thresholds, fail/exit codes.
- `chat.session.spec.ts`: tool allowlist, transcript provenance.
- `fs.sandbox.spec.ts`: deny writes outside prefixes.
- `imports.guard.spec.ts`: forbid cross-feature deep imports.
- `pipeline.e2e.spec.ts`: scaffold → codegen → test → review → build → release happy path.

---

## Example flows

Tutor

1. Ingest sources → build RAG bundle.
2. Plan labs → emit `tutor.lesson.assigned`.
3. Complete labs → review-neuron → schedule recall.

PM

1. Parse PRP → create tasks.
2. Orchestration assigns owners → emits status events.
3. Gates enforce exit criteria.

Chat

1. Start session with bundle + tools.
2. Tool calls logged with inputs/outputs.
3. Save citations and decisions.

Dev (PRP)

1. Scaffold from plan.
2. Codegen via MCP tool.
3. Tests → review gate → build → SBOM → signed release.

---

## Startup steps (ordered)

1. Create `apps/cortex-os` and mount feature packages in `/packages`.
2. Publish contracts in `mvp/contracts` (plans, messages, review).
3. Wire DI in ASBR and start `a2a` with DLQ/outbox.
4. Configure memories (encrypted, TTL) and define RAG bundles.
5. Run `model-gateway` locally and point agents/RAG to it.
6. Register tools via MCP registry and allowlist capabilities.
7. Enable CI gates: structure-guard, review-neuron policy, SBOM+sign.

---

## Analysis

Pros: Unified runtime. Deterministic gates. Local privacy. Clear contracts.

Cons: Contract authoring overhead. DLQ/outbox complexity. Tool drift without conformance tests.

Improvements: Add schema registry with contract tests; correlation IDs; SLOs and budgets.

Missed opportunities: Starter templates library; cost/latency statusline; privacy budgets for memories.

Moving forward: Ship model-gateway v1, three MCP adapters (codegen, review, docs), review-gate CI, NATS profile with DLQ.

---

## Standards check

- A11y: WCAG 2.2 AA, ARIA APG for dialogs/menus, reduced-motion.
- Security: OWASP ASVS, SAST (Semgrep), SCA (OSV-Scanner), SBOM (SPDX) + Sigstore, secrets scanning.
- Eng: SemVer, Conventional Commits, EditorConfig/Prettier/ESLint, PEP8.
- Data/APIs: JSON Schema for I/O, Problem+JSON errors, OpenAPI for model-gateway, MCP spec alignment.

---

## Accessibility flags

Keyboard: Tab/Shift+Tab, `?` help, `g/G` next/prev, Enter open, Esc close.

Screen readers: Roles on lists/buttons/dialogs, focus-trap in modals, aria-live for gate results, no color-only cues.
