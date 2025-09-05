# Legacy Docs Normalization Plan

> Objective: Resolve outstanding markdownlint issues (MD013, MD024, MD026) across deep-dive legacy documents prior to Docusaurus migration.

## Scope

Applies to long-form or historical narrative documents under `docs/` not recently refactored.
Recently normalized files (e.g. `quick-start.md`, `python-integration.md`, `architecture-overview.md`) are excluded.

## Target Rules

| Rule  | Description                      | Strategy                                                                        |
| ----- | -------------------------------- | ------------------------------------------------------------------------------- |
| MD013 | Line length                      | Soft wrap at ~120–140; allow exceptions in tables/code; reflow prose paragraphs |
| MD024 | Duplicate headings               | Add clarifiers (e.g. suffix context) or combine sections                        |
| MD026 | Trailing punctuation in headings | Remove trailing `:` unless part of code identifier                              |

## Affected Files (Initial Set)

Source: recent `markdownlint-cli2` run.

| File                                           | Issues (examples)                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/agent-architecture.md`                   | MD013 lines 51–56                                                               |
| `docs/architecture.md`                         | MD013 line 108                                                                  |
| `docs/brainwav-cortex-mcp-user-guide.md`       | MD013 multiple; reflow needed                                                   |
| `docs/cli-tools-integration.md`                | MD013 + MD024 duplicate headings (Available Scripts / Current Status)           |
| `docs/cortex-code-model-picker.md`             | MD013 long lines                                                                |
| `docs/evals-and-gates.md`                      | MD040 (add language) — include opportunistically                                |
| `docs/github-apps-management.md`               | MD024 duplicates for app headings                                               |
| `docs/hf-migration.md`                         | MD013                                                                           |
| `docs/investor-deck.md`                        | MD022/MD032 (block spacing) + MD013 (treat while editing)                       |
| `docs/mcp-bug-fixes-and-improvements.md`       | MD013 + MD024 (Requirements / Test Cases) repeats                               |
| `docs/mcp-final-improvements-summary.md`       | MD013 + MD026 (trailing colon headings)                                         |
| `docs/mcp-security-enhancements.md`            | MD013 + MD024 duplicates (Features Implemented / Security Features / Interface) |
| `docs/mcp-strategy-update.md`                  | MD013                                                                           |
| `docs/mcp.audit.md`                            | MD013 severe (long narrative lines >300 chars)                                  |
| `docs/mcp.fix-plan.md`                         | MD013 long lines                                                                |
| `docs/mcp.security-score.md`                   | MD013 + MD040 missing code lang                                                 |
| `docs/mlx-and-ci-setup-summary.md`             | MD013 + MD029 ordered list prefix + MD013 heavy lines                           |
| `docs/orbstack-dev.md`                         | MD034 bare URL + MD013                                                          |
| `docs/README.md`                               | MD033 inline HTML + MD013                                                       |
| `docs/repository-organization-improvements.md` | MD013                                                                           |
| `docs/typescript-template-config.md`           | MD013                                                                           |

## Remediation Checklist

For each file:

1. Reflow paragraphs to ~120 char soft wrap (no mid-sentence breaks if possible)
2. Normalize headings (unique text; remove trailing colons)
3. Add missing code fence languages (`bash`, `typescript`, `json`, `text` as fallback)
4. Replace inline HTML with Markdown equivalents (center blocks -> simple heading or quote)
5. Fix ordered list numbering (use `1.` style for all items; MD029)
6. Wrap bare URLs with `< >` or convert to `[label](url)`
7. Verify tables don't exceed width; split or wrap surrounding prose
8. Spot-fix incidental rules (MD022, MD032) while editing
9. Commit incrementally (one logical file or group)
10. Run `pnpm docs:lint` before each commit

## Suggested Batch Order

1. High noise structural docs: `mcp.audit.md`, `mlx-and-ci-setup-summary.md`
2. Duplicate heading clusters: `cli-tools-integration.md`, `mcp-security-enhancements.md`, `mcp-bug-fixes-and-improvements.md`
3. Narrative strategy docs: `mcp-final-improvements-summary.md`, `mcp.fix-plan.md`
4. Remaining individual long-line files

## Estimation

| Batch | Files | Complexity                          | Est. Effort |
| ----- | ----- | ----------------------------------- | ----------- |
| 1     | 2     | Very High (extreme line lengths)    | 1.5–2h      |
| 2     | 3     | High (semantic heading adjustments) | 1–1.5h      |
| 3     | 2     | Medium                              | 45m         |
| 4     | ~10   | Low/Medium                          | 1–1.5h      |

Total estimated effort: ~5–6 hours focused.

## Style Notes

- Prefer semantic qualifiers for duplicate headings: `### Features Implemented (Phase 1)`
- Use consistent tense (present) and active voice
- Keep architectural terms aligned with `AGENTS.md` and `README.md`
- Avoid marketing tone drift; keep technical and procedural

## Acceptance Criteria

- All listed files pass `pnpm docs:lint` with zero errors (allow MD013 exemptions only inside code/tables)
- No regressions introduced to already-clean docs
- Commit history grouped logically for review
- Plan updated if new files added or rule set expands

## Post-Normalization (Docusaurus Prep)

After cleanup:

| Action                                 | Purpose                                 |
| -------------------------------------- | --------------------------------------- |
| Add front matter                       | Enable sidebar & metadata in Docusaurus |
| Convert deep guides -> `/docs/guides/` | Hierarchical navigation                 |
| Extract long tables -> partials        | Reuse across pages                      |
| Introduce versioning strategy          | Lock historical snapshots               |

## Tracking

Create a GitHub Issue: "Docs: Legacy normalization & Docusaurus readiness" referencing this plan and link per-file subtasks.

## Tooling Notes

- Routine commits use `pnpm docs:lint` (curated modern docs only) for fast feedback.
- Full backlog review: run `pnpm docs:lint:all` to surface remaining legacy issues enumerated above.
- Pre-commit hook auto-skips large legacy/report/security/analysis docs to prevent
  noise; explicitly run full lint before starting a normalization batch.
- When normalizing a legacy file, stage only that file and re-run
  `pnpm docs:lint:all` (or temporarily add it to curated set) to verify fixes in
  isolation.

---

Return to: [Architecture Overview](./architecture-overview.md) | [Quick Start](./quick-start.md)
