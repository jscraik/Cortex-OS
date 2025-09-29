# slash-commands.research.md

## Research Objective

Assess existing `@cortex/commands` implementation against the n0 blueprint for slash commands and determine gaps or remediation needs.

## Existing Patterns Found

- `packages/commands/src/parseSlash.ts` already provides the `/` parser with lowercase command normalization.
- `packages/commands/src/loader.ts` loads Markdown-based commands from both project (`.cortex/commands/**`) and user scopes with frontmatter for description, models, and `allowed-tools`.
- `packages/commands/src/runner.ts` renders templates with `$ARGUMENTS`, positional substitution, `!` safe bash execution, and `@file` includes gated by allow-lists; integrates command execution logging.
- Built-in commands (`packages/commands/src/builtins.ts`) cover `/help`, `/agents`, `/model`, `/compact`, `/status`, `/test`, `/format`, and `/lint`, aligning with blueprint MVP set.
- Security helpers (`packages/commands/src/security.ts`) enforce bash/spec and file glob allow-lists, matching blueprint guard requirements.

## External Research

No external sources required; functionality aligns with internal blueprint and existing packages.

## Observations & Recommendations

- The package already implements the requested skeleton and features; focus shifts to verifying integration with orchestration (`parse_or_command` node) and ensuring other packages respect command scopes.
- `runner.ts` generates run IDs via `Math.random()` which violates brAInwav production standards; replace with `crypto.randomUUID()` or similar deterministic-safe approach.
- Confirm `RenderContext` wiring in orchestration provides kernel-backed `runBashSafe`, file allowlists, and per-command budget caps to honour security expectations.
- Ensure command metadata (model, allowed-tools) is honored downstream when binding tools/models in n0 integration.
