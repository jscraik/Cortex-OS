# brAInwav VS Code Extensions Sync TDD Plan

- **Task ID**: `vscode-extensions-sync`
- **Objective**: Ensure `.vscode/extensions.json` reflects the currently installed VS Code extensions used in the brAInwav Cortex-OS workspace.

## Test Strategy

1. **Configuration Consistency Check**
   - *Red*: Confirm existing recommendations omit many installed extensions by comparing against `code --list-extensions` output.
   - *Green*: Update the JSON `recommendations` array to include all installed extensions in alphabetical order.
   - *Refactor*: Remove obsolete `unwantedRecommendations` entries unless still applicable, ensuring future maintenance is clear.

2. **Lint / Format Verification**
   - *Red*: Markdown lint error for missing language on fenced blocks (captured during research phase).
   - *Green*: Tag fenced blocks with `text` to satisfy markdownlint MD040.
   - *Refactor*: Keep documentation ASCII-only and sort recommendation entries for stable diffs.

## Implementation Checklist

- [x] Update `.vscode/extensions.json` to match the installed extensions list (alphabetical) and drop obsolete unwanted recommendations.
- [x] Re-run `code --list-extensions` if necessary to confirm no drift.
- [x] Verify JSON formatting (2-space indent, ASCII only).
- [x] Document deviations or residual risks in the final response.
