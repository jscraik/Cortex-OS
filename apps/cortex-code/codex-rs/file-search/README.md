# codex_file_search

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

Fast fuzzy file search tool for Codex.

Uses <https://crates.io/crates/ignore> under the hood (which is what `ripgrep` uses) to traverse a directory (while honoring `.gitignore`, etc.) to produce the list of files to search and then uses <https://crates.io/crates/nucleo-matcher> to fuzzy-match the user supplied `PATTERN` against the corpus.
