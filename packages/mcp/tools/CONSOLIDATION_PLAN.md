# Inspector Consolidation Plan

## Summary

- Consolidate on `packages/mcp/tools/mcp-inspector` as the canonical inspector.
- Remove `packages/mcp/tools/inspector` (nested git repository) in a separate PR to avoid nested-repo side effects.

Why

- Two inspector trees cause maintenance drift and confusion.
- `mcp-inspector` matches current docs and package naming.

Steps (separate PR)

1. Verify there are no unique files that must be migrated from `packages/mcp/tools/inspector`.
2. Remove the nested repository safely:
   - `cd packages/mcp/tools/inspector`
   - Note any unmerged changes (git status).
   - Migrate changes if needed.
   - Remove the directory from the parent repo:
     - Update parent `.gitignore` if necessary.
     - Delete the folder via a PR (avoid `git rm -r` in the parent against nested repo).
3. Update any README references to point to `packages/mcp/tools/mcp-inspector`.
4. Ensure CI and docs link to the canonical inspector.

Validation

- Run MCP tests and any inspector-specific tests.
- Confirm no references to the old path exist (ripgrep search for `packages/mcp/tools/inspector`).
