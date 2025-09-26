# slash-commands-tdd-plan.md

## Implementation Plan

### Phase 1: Test Coverage Review
1. Add unit coverage for `parseSlash` ensuring lowercase normalization and argument parsing.
2. Write tests for `renderTemplate` to confirm `$ARGUMENTS`, positional args, and `!`/`@` expansions respect allow-lists.
3. Exercise `isBashAllowed` and `isFileAllowed` to validate security gating on sample allow-lists.

### Phase 2: Production Safe Run IDs
1. Replace `Math.random()` based `generateRunIdLight` with `crypto.randomUUID()`.
2. Update associated tests/mocks to accommodate the new deterministic-safe generator.
3. Ensure logging metadata continues to emit `runId` without introducing randomness policy violations.

### Phase 3: Orchestration Integration Validation
1. Confirm orchestration layer supplies kernel-backed `runBashSafe` and file allow-lists when invoking commands.
2. Verify command metadata for `model` and `allowed-tools` propagates through n0 binding logic.
3. Document integration expectations to keep slash command behaviour aligned with hooks/subagent policies.

## Testing Strategy
- Extend existing `packages/commands/tests` with Vitest unit cases covering parser, runner, and security helpers.
- Execute `pnpm test --filter "packages-commands"` (or targeted Vitest invocation) to validate new coverage.
- If orchestration verification requires integration harness, craft focused tests under `packages/orchestration` to simulate slash invocation.
