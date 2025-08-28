# Frontier tools integration (vendor-neutral, local-first)

Purpose

Explain what Cortex-OS lets you do when you connect frontier tools (Claude Code, Gemini CLI, Qwen CLI, Codex CLI) in a governed, deterministic way via ASBR.

Outcomes (what it does)

1. Plan: goals → PRP, tasks, milestones with acceptance criteria.
2. Build: generate code/scaffolds, re-plan when diffs fail CI.
3. Review: agentic code review with JSON findings + evidence pointers.
4. Test: write/verify tests, measure coverage, gate merges.
5. Harden: build artifacts, run Linters/SAST/OSV, emit SBOM, enforce policy gates.
6. Answer: set up RAG packs, index docs, require citations.
7. Release: release trains, changelogs, SemVer, conventional commits.
8. Debug: reproduce, bisect, propose patch, verify, document.
9. Document: PRDs, tech specs, runbooks, API refs from code.
10. Learn: mine telemetry, spot recurring issues, propose refactors with ROI.

Roles (how models fit)

- Planner: turns intent into a plan graph and policy gates.
- Builder: writes diffs that pass tests and style.
- Reviewer: blocks on evidence; outputs strict JSON findings.
- Researcher: sources, ranks, and cites.
- Explainer: generates user-facing docs and upgrade notes.

Example flows

- Ship a feature: Goal → PRP → scaffold → code gen → tests → review → build → release notes → tagged release.
- Fix a prod bug: Incident → repro script → blame range → patch diff → tests → SLO check → hotfix release → postmortem.
- Adopt a library: Risk scan → codemods → try-run in simlab → canary release → rollback plan.

Wiring sketch (MCP/A2A)

- Cortex-OS hosts the bus (ASBR).
- Each frontier tool is an MCP server or A2A adapter.
- Contracts live in a schema registry; all IO typed/versioned.
- Memory writes: artifacts + citations + ULIDs; reads use selectors + TTL.
- Policy gates run OWASP/A11y checks before allowing "apply".

What/Why/Where/How/Result

- What: Unified orchestration of multiple tools as disciplined neurons.
- Why: Solo dev productivity with team-grade governance and repeatability.
- Where: Local MLX first; remote tools via MCP; storage in encrypted memory-core.
- How: Typed plans → deterministic steps → evidence → gated apply.
- Result: Faster shipping, lower risk, auditable trail.

Analysis

Pros: One interface. Deterministic pipelines. Evidence for every change. Local-first privacy.

Cons (brutal): Upfront plumbing (schemas, gates, adapters). Slower first week while policies/tests harden.

Improvements: Add schema registry + contract tests per adapter. Expand simlab scenarios for risky changes.

Missed opportunities: No DLQ/outbox yet for the bus; add to orchestration. Limited telemetry taxonomy; define issue categories.

Moving forward: Start with three adapters (codegen, review, docs). Enable review-neuron JSON gating in CI. Add MCP marketplace index.

Standards check

- A11y: WCAG 2.2 AA; label all TUI/GUI controls; no color-only cues; focus order defined.
- Security: OWASP ASVS; SAST (Semgrep); SCA (OSV-Scanner); SBOM + Sigstore.
- Eng: SemVer; Conventional Commits; EditorConfig/Prettier/ESLint; PEP8 for Python.
- Data/APIs: JSON Schema for IO; Problem+JSON errors; MCP per spec; versioned A2A contracts.
