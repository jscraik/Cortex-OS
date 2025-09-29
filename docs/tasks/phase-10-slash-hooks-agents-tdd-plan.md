# phase-10-slash-hooks-agents-tdd-plan.md

## Implementation Checklist

1. **Slash command integration tests**
   - Author `packages/commands/tests/slash-integration.test.ts` covering `/help`, `/agents`,
     `/model`, and `/compact` executed through parser → loader → runner.
   - Stub `BuiltinsApi` so `/agents create` and `/model` mutate state deterministically.
   - Assert command metadata (model, allowed-tools) is preserved on the returned result.

2. **Hook filesystem loader coverage**
   - Add `packages/hooks/tests/filesystem-config.test.ts` that seeds temporary
     `.cortex/hooks` directories for user and project scopes.
   - Validate precedence (project overrides user) and hot reload by changing on-disk YAML
     and reloading within the same test run.
   - Ensure settings merges respect command allow-list overrides.

3. **Agent template loader**
   - Implement `packages/agents/src/file-agent-loader.ts` (or similar) that walks
     `.cortex/agents/**` in user then project directories, parses YAML/JSON, and compiles to
     LangGraph-ready definitions.
   - Add `packages/agents/tests/file-agent-loader.test.ts` verifying precedence, schema
     validation, and error branding.

4. **Kernel tool binder**
   - Create `packages/kernel/src/tools/bind-kernel-tools.ts` exporting named
     `bindKernelTools()` that assembles shell, filesystem, and web fetch tools with
     allow-lists, timeouts, and brAInwav-branded errors.
   - Expose metadata so orchestration can surface command allow-lists and model defaults.
   - Back with `packages/kernel/tests/tool-binding.test.ts` covering happy path and
     rejection when allow-lists are violated.

5. **Orchestration metadata propagation**
   - Update the orchestration surface (likely `packages/orchestration/src/langgraph` nodes)
     to accept command metadata from loaders and inject into N0 state.
   - Extend existing state/adapters tests to confirm metadata flows through.

## Testing Strategy

- Use Vitest with temporary directories via `tmp.dirSync({ unsafeCleanup: true })` to
  isolate filesystem-based tests.
- Run focussed suites locally:

  ```bash
  pnpm --filter @cortex-os/commands exec vitest run tests/slash-integration.test.ts
  pnpm --filter @cortex-os/hooks exec vitest run tests/filesystem-config.test.ts
  pnpm --filter @cortex-os/agents exec vitest run tests/file-agent-loader.test.ts
  pnpm --filter @cortex-os/kernel exec vitest run tests/tool-binding.test.ts
  ```

- Execute `pnpm test:smart --focus @cortex-os/commands,@cortex-os/hooks,@cortex-os/agents,@cortex-os/kernel`
  once all suites are green.
- Follow up with `pnpm lint:smart` and `pnpm typecheck:smart` across the affected packages.

## Open Questions

- Do agent template specs already exist under `packages/agents/.cortex` that we can reuse
  as fixtures, or should tests author synthetic templates?
- Which orchestration modules currently consume command metadata, and do we need to add new
  adapters for Phase 10 propagation?
- Are there existing allow-list schemas for `bindKernelTools()` we can reuse to stay within
  security boundaries?
