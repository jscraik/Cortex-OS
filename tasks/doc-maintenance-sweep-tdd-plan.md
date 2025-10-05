# Doc Maintenance Sweep TDD Plan

- **Date**: 2025-10-05
- **Goal**: Archive or remove outdated Markdown/TXT documentation while keeping active guidance intact.
- **Inputs**:
  - Directory listings and file metadata for `docs/`, `reports/`, `tasks/`, and repository root.
  - Status cues inside documents (keywords such as "FINAL", "obsolete", "completed").
  - Existing navigational references (`README.md`, `docs/README.md`, `CHANGELOG.md`).
- **Outputs**:
  - Archived copies of selected files under `archive/docs/2025-10-05/` preserving structure.
  - `archive_manifest.json` capturing original path, new path, reason, size, timestamp, git sha.
  - `cleanup_log.json` describing any deletions with justification.
  - `summary.md` summarizing counts for scanned/archived/removed items.

## Acceptance Criteria

1. Every archived file lives under the dated archive directory and is removed from its original location.
2. Deletions occur only for items duplicated elsewhere or generated artifacts with no active references.
3. Summary, manifest, and cleanup log reflect identical counts and reasons.
4. `pnpm structure:validate` passes or documented if tooling unavailable.
5. README/CHANGELOG remain consistent—no dangling references to removed documents.

## Test Strategy

1. **Classification Review**
   - Inspect sample candidates for explicit completion language or superseded status.
   - Use `git log -1 --format=%ci` to confirm inactivity (>180 days) where status markers absent.
   - Run `grep -R` against `README.md`, `docs/README.md`, `CHANGELOG.md`, and `website/README.md` for each removal candidate.
2. **Archive Validation**
   - After moving files, check that directory structure is mirrored and files accessible.
   - Validate manifest entries for accuracy (path, size via `stat`, git sha via `git rev-parse HEAD:<path>`).
3. **Cleanup Validation**
   - Ensure each deletion entry appears in `cleanup_log.json` with supporting reference search notes.
   - Confirm repository builds `summary.md` totals that match manifest/log counts and classification list.
4. **Quality Gates**
   - Execute `pnpm structure:validate` to protect governance constraints.
   - Run `pnpm lint docs` if available; otherwise document limitation.

## Implementation Checklist

1. Catalogue candidate files from each directory with metadata (path, modified date, keywords).
2. Classify as KEEP/ARCHIVE/REMOVE with reasoning matrix stored in working notes.
3. Create `archive/docs/2025-10-05/` and reproduce relative subdirectories for ARCHIVE set.
4. Move archived files into archive tree via safe copy+delete, capturing size + sha.
5. Remove files marked REMOVE only after confirming zero references.
6. Generate `archive_manifest.json` and `cleanup_log.json` with structured JSON.
7. Produce `summary.md` summarizing total scanned, archived, removed, and high-level notes.
8. Run quality gates (`pnpm structure:validate`) and capture output.
9. Review `git status` to verify only intended changes.
