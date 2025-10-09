# Cortex-OS Documentation Site

This directory contains the Docusaurus-based documentation website for Cortex-OS.

<!-- markdownlint-disable MD013 -->

## Recent Updates

### Unified Workflow Integration - Phase 4 Complete (2025-02-06)

Added comprehensive documentation for the new unified workflow orchestration system:

- **Workflow Orchestrator Package** (`@cortex-os/workflow-orchestrator`)
  - Complete state machine engine for PRP gates (G0-G7) and task phases (0-5)
  - CLI commands: init, run, status, profile, insights
  - SQLite persistence with checkpoint and resume functionality
  - Property-based testing for state machine correctness
  - Full brAInwav branding compliance

- **Workflow Dashboard Package** (`@cortex-os/workflow-dashboard`)
  - Initial structure created (Phase 6 implementation pending)
  - Prepared for real-time workflow visualization

- **Implementation Status**: Phases 0-4 complete (Test Infrastructure, Schemas, Persistence, Engine, CLI)
- **Pending Work**: Phases 5-6 (Local Memory Integration, Dashboard UI)

### Reality Filter Integration

All AI agent documentation has been updated to include Phase 6: Reality Filter, ensuring:

- Enhanced truthfulness verification for all AI outputs
- Standardized labeling of unverified content across all systems
- Improved accuracy requirements for LLM behavior claims
- Consistent brAInwav branding in all AI agent interactions

Updated files include: `AGENTS.md`, `CLAUDE.md`, `QWEN.md`, `GEMINI.md`, `copilot-instructions.md`, and `RULES_OF_AI.md`.

### Cortex MCP Production Hardening

- Added deployment runbook updates covering the new Cortex/Local Memory adapters,
  JWT-secured REST routes, and Prometheus metrics.
- Updated package README and deployment guide references so docs site surfaces
  the latest configuration variables (`CORTEX_MCP_*`, `JWT_SECRET_KEY`).
- Highlighted the removal of committed virtual environments to keep the repo
  lean and reproducible across environments.

## Quick Start

```bash
# Sync documentation from source packages
pnpm sync

# Build the documentation site locally
pnpm build:local

# Start development server
pnpm start
```

## Codemap Artifacts

- `pnpm codemap` generates `out/codemap.json` + `out/codemap.md` for the entire repository with brAInwav guidance for downstream automation.
- `make codemap SCOPE=app:cortex-os SECTIONS=git,complexity TOOLS=lizard` narrows the scan to a single Nx project and limits emitted sections/tools.
- Scope selectors (`repo`, `package:<name>`, `app:<name>`, `path:<relative>`) mirror Nx metadata and update the `scan` metadata block embedded in the JSON.
- Filtered sections keep documentation-friendly Markdown tight while preserving canonical metadata headers (`scan`, `notes`, `tools`).

## Scripts

- `pnpm sync` - Sync documentation from all packages to docs/
- `pnpm sync -- --check` - Dry-run mode: report would-be changes without writing
- `pnpm build:local` - Build site using local configuration
- `pnpm test` - Run sanitizer and utility tests
- `pnpm start` - Start development server

## Sanitization Pipeline

The documentation sync process includes a robust sanitization pipeline that ensures MDX content is safe for Docusaurus processing. The sanitizer automatically handles common issues that cause MDX parse errors:

### What Gets Sanitized

- **Code Fence Normalization**: Repairs malformed fences, upgrades double-backticks to triple-backticks, and fixes language tag issues
- **Generic Type Escaping**: Converts `Promise<T>` to `Promise&lt;T&gt;` outside code blocks to prevent JSX parsing conflicts
- **Pseudo-JSX Handling**: Escapes fragment syntax (`<>`, `</>`) and self-closing components (`<Component />`) in prose
- **HTML Tag Escaping**: Handles stray HTML tags that might be interpreted as JSX components
- **Spurious Fence Repair**: Fixes code blocks that were accidentally split by premature closing fences

### Code Block Preservation

Content within proper code fences (`` ```lang `` blocks) is **never modified** - all transformations only apply to prose text and markdown structure outside code blocks.

### Dry-Run Mode

Use `--check` flag to preview sanitization changes without writing files:

```bash
pnpm sync -- --check
```

This reports:

- Which files would be modified
- Counts of each type of sanitization fix
- Total files that would be processed

### Testing

The sanitizer includes comprehensive tests:

- **Unit tests** (`__tests__/sanitizer.test.ts`) - Test individual sanitization rules
- **Integration tests** (`__tests__/sanitizer-integration.test.ts`) - Test against curated problem corpus
- **Corpus fixture** (`__tests__/fixtures/sanitizer-corpus.md`) - Collection of known problematic patterns

Run tests:

```bash
pnpm test
```

### Behavioral Regression Detection

The integration test runs the sanitizer against a curated corpus of known problematic patterns and asserts expected repair counts. This catches behavioral regressions when sanitizer logic changes.

If you encounter new MDX parse errors, consider:

1. Adding the problematic pattern to the test corpus
2. Extending sanitizer rules to handle the new case
3. Adding corresponding unit tests

## Architecture

- `sync-docs.ts` - Main sync script with sanitization pipeline
- `__tests__/` - Test suites for sanitizer and utilities
- `docs/` - Generated documentation (auto-synced, do not edit directly)
- `sidebars.ts` - Auto-generated navigation structure

## Troubleshooting

### MDX Parse Errors

If you encounter acorn parse errors during build:

1. Run `pnpm sync -- --check` to see what sanitization would be applied
2. Check if new patterns need sanitizer rules
3. Run `pnpm test` to ensure sanitizer works correctly
4. Build with `pnpm build:local` to validate

### Duplicate Routes

The sync process automatically handles duplicate routes by:

- Preferring `index.md` over base package README
- Cleaning up stale files from previous syncs
- Generating unique slugs for conflicting documents

### Performance

For large documentation sets, sync may take time. The process is optimized with:

- Concurrent directory processing
- Smart skip logic for unchanged files
- Efficient file operations

## Contributing

When modifying the sync pipeline:

1. Add tests for new sanitization rules
2. Update the integration test corpus if needed  
3. Document new sanitization behaviors in this README
4. Test with both regular sync and dry-run mode

<!-- markdownlint-enable MD013 -->
