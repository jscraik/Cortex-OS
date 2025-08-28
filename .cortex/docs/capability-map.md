# Capability map: Four goals, one OS (ASBR-governed)

Principles

Vendor-neutral. Local-first. Deterministic. Governed via ASBR. Accessibility-aware.

1. Learn assistant

- What: Curriculum builder, spaced repetition, code labs, RAG with citations.
- How: `packages/memories` + `packages/rag` + simlab; MCP adapters fetch sources; review-neuron grades outputs.
- Result: Structured learning with proofs and recall schedules.

1. Task manager

- What: PRP→tasks→milestones→OKRs with policy gates.
- How: `packages/orchestration` plans; `packages/a2a` routes updates; memory stores state; CLI TUI is the board.
- Result: Single queue across tools with evidence and timestamps.

1. Software development pipeline

- What: Scaffold→codegen→tests→review→build→release with SBOM and audit trail.
- How: Frontier tools via MCP (Claude Code, Gemini CLI, Qwen CLI, Codex CLI); CI runs review-neuron JSON gate; ASBR enforces steps.
- Result: Reproducible releases with blocking gates and provenance.

1. Website development hub

- What: Central hub to create, run, and deploy sites and docs.
- How: Next.js scaffold, design tokens, a11y checks, deploy adapters; content RAG; doc generator from code.
- Result: One place to build sites, docs, and marketing with accessibility baked in.

Minimal setup (ordered)

1. Initialize repo
   - `cortex init` scaffolds `apps/cortex-os` and `packages/{a2a,mcp,orchestration,memories,rag,simlab}`; ASBR expects fixed paths.
2. Register tools via MCP
   - `cortex mcp add claude-code …`, `… gemini-cli …`, `… qwen-cli …`, `… codex-cli …` adapters run as servers.
3. Enable review gate
   - Add GitHub Action with review-neuron output schema; fail on blockers.
4. Wire memory + RAG
   - Configure `memory-core.sqlite` + encryption; define RAG bundles; require citations.
5. Spin up the hub
   - `cortex web dev` for Glass UI; Alt+G toggles glass.

Example flows

- Learn a topic: Goal → sources ingest → plan → lab tasks → graded review → spaced recall.
- Ship a feature: Goal → PRP → scaffold → codegen (frontier tool) → tests → review-neuron → build → SBOM → release notes → tag.
- Build a website: Template select → Next.js scaffold → content RAG → a11y audit → preview → deploy.

What / Why / Where / How / Result

- What: A governed second brain that plans, builds, and teaches with proofs.
- Why: Solo velocity with team-grade safety and auditability.
- Where: Local first (MLX). External tools via MCP. Data in encrypted memory-core.
- How: ASBR plans → typed contracts → gated steps → evidence logs.
- Result: Faster learning, orderly tasks, clean pipeline, and a single web hub.

Accessibility flags

- Keyboard: Tab/Shift+Tab focus order, ? help, g/G next/prev item, Enter open, Esc close.
- Screen readers: ARIA roles on lists, buttons, dialogs; statusline announces gate results; no color-only cues.

Analysis

Pros: Unified cockpit. Deterministic pipelines. Provenance for every change. Local privacy.

Cons (brutal): Upfront schema work and adapters. First week slower while gates harden.

Improvements: Schema registry + contract tests per adapter. Expand simlab scenarios. Add DLQ/outbox to orchestration.

Missed opportunities: Telemetry taxonomy not standardized; define issue categories. Limited website templates; add docs+blog starters.

Moving forward: Start with three adapters (codegen, review, docs). Turn on review-neuron CI gate. Import website template and connect deploy.

Standards check

- A11y: WCAG 2.2 AA, ARIA APG for menus/dialogs.
- Security: OWASP ASVS, SAST (Semgrep), SCA (OSV-Scanner), SBOM + Sigstore.
- Eng: SemVer, Conventional Commits, EditorConfig/Prettier/ESLint, PEP8.
- Data/APIs: JSON Schema for IO, Problem+JSON errors, MCP spec, versioned A2A contracts.
