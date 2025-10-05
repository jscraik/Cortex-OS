# Doc Maintenance Sweep Research

- **Date**: 2025-10-05
- **Scope**: Identify archival and removal candidates across `docs/`, `reports/`, `tasks/`, and
  repository root Markdown/TXT assets per doc-maintenance-sweeper brief.
- **Primary sources**: `/.github/copilot-instructions.md`, `.cortex/rules/RULES_OF_AI.md`, `AGENTS.md`, sweep prompt, and `docs/DOCS_CLEANUP_SUMMARY.md`.
- **Tools attempted**:
  - `just scout` → unavailable on host (`zsh: command not found`).
  - Fallback commands (`find`, `grep`) for discovery; results captured below.

## Directory Inventory Snapshot

| Directory | Markdown-like files (`.md`, `.markdown`, `.mdx`, `.txt`) | Notes |
| --- | --- | --- |
| `docs/` | 235 | Historical reports, legacy `README_OLD`, many early-phase research/TDD pairs |
| `reports/` | 58 | Generated logs, audits, production readiness summaries |
| `tasks/` | 58 | Phase completion retrospectives and TDD plans marked FINAL/COMPLETE |
| repo root | 21 | Governance docs plus session transcripts and commit message templates |

## Observations & Potential Targets

1. **Phase Completion Bundles** (`tasks/PHASE*-*.md`, `tasks/FINAL-*`): appear to document
  completed retrospectives; need verification against active plans.
2. **Dual copies of key governance docs**: `docs/AGENTS.md`, `docs/CLAUDE.md`, `docs/GEMINI.md`
  duplicate root instructions after prior cleanup—investigate whether duplicates remain
  necessary.
3. **Legacy or superseded navigation**: `docs/README_OLD.md` predates reorganized
  `docs/README.md`; candidate for archival rather than live tree.
4. **Historical cleanup summaries**: `docs/DOCS_CLEANUP_SUMMARY.md` (2025-10-01) plus prior
  `docs/legacy-docs-normalization.md` may be needed for history but not active use.
5. **Generated artifacts** in `reports/generated/` and logs like `reports/eslint-filelist.txt`,
  `reports/semgrep-full-scan.txt` likely archival/deletion candidates once captured in
  manifest.
6. **Repeated TDD plan pairs** in `docs/tasks/` (e.g., `coverage-tuning.research.md`
  alongside `.tdd-plan.md`) may belong in archive if implementation finished; confirm via doc
  content for statuses such as "Completed" or dated earlier phases.

## Next Research Actions

- Sample representative files from each candidate bucket to confirm status keywords
  ("completed", "final", "retired") and ensure no references from README/CHANGELOG.
- Determine latest update timestamps via `git log -1 --format=%ci <file>`.
- Build classification rubric for KEEP/ARCHIVE/REMOVE with reasoning to feed TDD plan.
- Ensure archive output path `archive/docs/2025-10-05/` reserved and manifest/log schema defined before execution.
