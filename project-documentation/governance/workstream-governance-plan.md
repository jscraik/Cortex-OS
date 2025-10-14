# Workstream Governance Plan

This plan consolidates the mandatory task governance expectations from the brAInwav Agentic Coding Workflow and the root repository operating agreement.

## Required `~/tasks/[feature]/` Structure

Every task must maintain a complete audit trail inside `~/tasks/[feature]/` with the following structure:

- `notes.md`, `raid-log.md`, and related context files at the folder root to keep running decisions and RAID tracking current.
- `research/` for discovery notes, feasibility spikes, proofs of concept, and hybrid model evidence captured during research phases.
- `planning/` artifacts including `implementation-plan.md`, `srs.md`, business case summaries, and BDD/TDD planning notes.
- `design/` for diagrams, integration maps, and architectural decisions that inform implementation.
- `implementation-log.md` documenting red/green/refactor loops, plus any supporting subfolders needed by the change.
- `test-logs/` or `validation/` storing automated test output, accessibility audits, security scans, coverage, and mutation reports gathered prior to merge.
- `monitoring/` and `HITL-feedback.md` (where applicable) for ongoing verification, human-in-the-loop decisions, and post-merge learnings.
- Archived evidence remains in place after completion so future agents can reproduce, audit, and learn from the task.

## Vibe-Check Timing and Expectations

- Run the Vibe Check MCP immediately after planning and **before** any file writes, network calls, or long-running actions.
- Capture the resulting logs containing the `"brAInwav-vibe-check"` marker and store them in the task folder.
- Reference the stored vibe-check evidence in the PR to avoid merge blocks.

## Mandatory Governance Artifacts

Maintain the following artifacts for every workstream:

- **Feature Specification** — Use `/.cortex/templates/feature-spec-template.md` and save the filled copy inside the task folder.
- **Research Dossier** — Use `/.cortex/templates/research-template.md`; include semantic code search findings, spikes, proofs of concept, and hybrid model logs under `research/`.
- **TDD Plan** — Use `/.cortex/templates/tdd-plan-template.md`; document Given-When-Then scenarios, red/green/refactor sequencing, and attach evidence of execution.
- **Code Review Checklist** — Ensure a human reviewer completes `/.cortex/rules/code-review-checklist.md`, posts it as a top-level PR comment, and links the evidence back to the task folder.
- **Verification Logs** — Archive outputs from `pnpm lint`, `pnpm test`, `pnpm security:scan`, `pnpm models:health`, `pnpm models:smoke`, accessibility tooling, and coverage/mutation runs within `test-logs/` or `validation/`.
- **Branding & Compliance Evidence** — Store proof that new logs/errors include `[brAInwav]` with structured metadata and that all hybrid model activity used live engines.

All referenced artifacts must have clear pointers in the PR so reviewers can trace evidence back to the task folder.
