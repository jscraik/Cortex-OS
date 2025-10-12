## 1) File Tree of Proposed Changes
```
.cortex/rules/
└─ vision.md                        UPDATE – encode skill governance obligations

AGENTS.md                           UPDATE – repo-wide skill lifecycle policy
packages/memory-core/
├─ AGENTS.md                        UPDATE – tighten skill subsystem requirements
├─ src/index.ts                     UPDATE – export skill manager factory & types
├─ src/skills/index.ts              NEW – consolidated skill exports for consumers
├─ src/skills/events/skill-events.ts NEW – wrap A2A emission & telemetry helpers
├─ src/skills/manager/SkillManager.ts NEW – orchestrate load/registry/index lifecycle
├─ src/skills/watchers/SkillDirectoryWatcher.ts NEW – chokidar-backed skill watcher
├─ src/skills/loaders/skill-loader.ts UPDATE – surface hooks + richer metadata payloads
├─ src/skills/registry/skill-registry.ts UPDATE – diff-aware updates & indexing glue
├─ src/skills/__tests__/skill-manager.test.ts NEW – manager orchestration tests
├─ src/skills/__tests__/skill-directory-watcher.test.ts NEW – watcher behaviour tests
├─ docs/skills-system.md            NEW – package-level operating runbook
packages/rag/
├─ AGENTS.md                        UPDATE – document skill indexing gates
├─ src/index.ts                     UPDATE – export skill ingestion adapter
├─ src/integrations/skills/SkillIndexer.ts NEW – convert skills into RAG ingest jobs
├─ src/integrations/__tests__/skills-indexer.test.ts NEW – ingestion & error cases
packages/mcp-server/
├─ AGENTS.md                        UPDATE – call out skill tool governance
├─ src/tools/index.ts               UPDATE – register skill tool bundle
├─ src/tools/skills.ts              NEW – MCP tool handlers backed by SkillManager
├─ src/__tests__/tools.skills.test.ts NEW – tool registration & execution tests
├─ docs/skills-tools.md             NEW – MCP usage guide & scopes
skills/
└─ README.md                        NEW – contributor checklist for skill assets
docs/architecture/
└─ skills-governance.md             NEW – cross-cutting governance + escalation flow
```

## 2) Implementation Plan
1. **Codify governance guardrails.** Amend `/.cortex/rules/vision.md` and root `AGENTS.md` to define the skills subsystem as a governed surface (ingestion path, required evidence, and audit hooks). Update package-level `AGENTS.md` (memory-core, rag, mcp-server) to inherit the repo rules and specify local gates (coverage minima, model evidence, vib e-check timing) for skill work.
2. **Introduce a first-class SkillManager in memory-core.** Create `src/skills/manager/SkillManager.ts` that composes the existing loader, validators, and registry. The manager should:
   - Accept `SkillLoader`, `SkillRegistry`, the new `SkillIndexer` adapter, and configuration (skills directory, watcher debounce, telemetry sinks).
   - Provide methods `initialize()`, `refreshSkill(filePath)`, `removeSkill(filePath)`, `search(query)`, and `apply(skillId, context)` returning typed results.
   - Emit A2A events via `skill-events.ts` helpers (Validated, Loaded, Indexed, Updated, Deleted) and record metrics using `@cortex-os/observability` counters/timers.
   - Track revision hashes so re-index runs only on changed files.
   - Register/unregister watchers via the new `SkillDirectoryWatcher` and expose hooks for graceful shutdown.
3. **Enhance loader & registry contracts.** Extend `skill-loader.ts` to return normalized metadata (frontmatter hash, markdown body) and accept dependency injection for validators. Add failure telemetry + structured errors. Update `skill-registry.ts` to expose `upsert`, `markDeprecated`, and `toIndexPayload(skillId)` that bundles content/metadata for the indexer. Adjust existing tests to cover new branches.
4. **Add SkillDirectoryWatcher abstraction.** Implement `SkillDirectoryWatcher` using `chokidar` with ignore lists mirroring MCP watchers. Support add/change/delete events, debounce, and safety around partial writes. Unit-test with mocked `chokidar` ensuring debounced callbacks fire exactly once per batch and errors bubble through the manager.
5. **Wire A2A event helpers.** Create `skills/events/skill-events.ts` that wraps `publishA2AMemoryEvent` with `SkillEventSchemas` validation, ensuring event payloads include `brand:"brAInwav"`, correlation IDs, and skill metadata snapshots.
6. **Build RAG SkillIndexer adapter.** Under `packages/rag/src/integrations/skills`, implement a `SkillIndexer` class that:
   - Accepts an embedder + store (reuse `RAGPipeline` ingestion primitives) and skill metadata.
   - Splits markdown into semantic chunks (respecting existing chunk util), generates embeddings, and upserts into a dedicated `skills` collection with consistent IDs.
   - Supports remove/deprecate operations by deleting chunks and storing tombstones.
   - Surfaces index latency metrics + error normalization. Provide focused unit tests with mocked embedder/store verifying chunk sizing, metadata propagation, and failure handling.
   - Export factory helpers via `packages/rag/src/index.ts` for reuse.
7. **Expose manager from memory-core.** Add `src/skills/index.ts` to re-export manager, watcher, and type definitions. Update `src/index.ts` to export `createSkillManager(options)` that configures loader, registry, indexer (via rag helper), watchers, and instrumentation defaults.
8. **Add MCP tool surface.** Implement `packages/mcp-server/src/tools/skills.ts` registering tools `skill.search`, `skill.inspect`, `skill.apply`, and `skill.refresh` using the SkillManager instance. Tools should enforce OAuth scopes (e.g., `skills.read`, `skills.write`), stream progress where applicable, and return JSON payloads consistent with contracts. Update `tools/index.ts` to wire registration and extend tests verifying registration, auth gating, and execution results (mock SkillManager).
9. **Document and test.** Create `packages/memory-core/docs/skills-system.md`, `packages/mcp-server/docs/skills-tools.md`, `docs/architecture/skills-governance.md`, and `skills/README.md` describing lifecycle, required metadata, audit evidence, and escalation paths. Ensure AGENTS updates reference the new docs. Add targeted unit tests (`skill-manager.test.ts`, `skill-directory-watcher.test.ts`, `skills-indexer.test.ts`, `tools.skills.test.ts`) and update existing tests impacted by new signatures. Validate watchers & event helpers in tests using `vi.mock` patterns already present in repo.

## 3) Technical Rationale
- Centralising orchestration in `SkillManager` keeps skill lifecycle logic inside memory-core (the designated integration hub per architecture docs) while reusing existing loader/registry code.
- Leveraging a dedicated RAG adapter avoids copy-pasting ingestion logic and guarantees skills flow through the same embedding/indexing infrastructure as memories, meeting parity requirements.
- Implementing watchers and events ensures runtime awareness of skill changes without manual operator intervention, aligning with autonomous ingestion goals.
- Housing MCP tool handlers inside `packages/mcp-server` matches existing memory tool patterns, reducing coupling and keeping tool registration close to server boot code.
- Governance and documentation updates provide enforceable policy references so future contributors honour schema, coverage, and live-model requirements.

## 4) Dependency Impact
- **Internal:** New exports from memory-core consumed by mcp-server; new rag integration consumed by memory-core.
- **External:** No new npm dependencies (reuse existing `chokidar`, `@cortex-os/observability`, etc.). Ensure peer dependency constraints remain unchanged.
- **Config:** Skill manager options (skills directory path, index collection name) default to `skills/` and may be exposed via env vars in follow-up work; document placeholders but do not change runtime defaults yet.

## 5) Risks & Mitigations
- **Watcher churn causing duplicate loads:** Mitigate with hash-based change detection and debounced watcher callbacks, covered by unit tests simulating rapid file edits.
- **RAG indexing failures blocking ingestion:** Catch and log errors, emit `skill.index_failed` events, and leave registry state untouched so operators can retry; add tests for embedder/store exceptions.
- **Tool misuse without proper scopes:** Enforce OAuth scope checks in tool handlers and document required scopes in `skills-tools.md`.
- **Performance regression on startup:** Measure load + index durations inside `SkillManager.initialize()` and ensure tests assert caching/hashing prevents redundant work.

## 6) Testing & Validation Strategy
- **Unit Tests:**
  - `skill-manager.test.ts` covering initialization, incremental refresh, failure handling, event emission.
  - `skill-directory-watcher.test.ts` verifying debounce and callback invocation.
  - `skills-indexer.test.ts` covering chunking, metadata, remove/deprecate flows, and error propagation.
  - `tools.skills.test.ts` ensuring MCP handlers enforce scopes, call manager methods, and format responses.
- **Existing Test Updates:** Adjust loader/registry tests for new return types and metrics hooks.
- **Integration Smoke:** Add a lightweight `pnpm --filter mcp-server test -- tools.skills.test.ts` invocation to CI instructions plus `pnpm --filter memory-core test -- skill-manager.test.ts`.
- **Manual QA Checklist:**
  1. Drop a sample skill markdown in `skills/`; confirm logs show load/index events.
  2. Call `skill.search` via MCP CLI; ensure response includes metadata & persuasive framing.
  3. Update the skill file; verify watcher triggers refresh without duplicate indexing.
  4. Delete the file; confirm removal event and MCP search no longer returns it.

## 7) Rollout / Migration Notes
- Default to local `skills/` directory; document env overrides for deployments.
- Provide fallback instructions (disable watcher + manual refresh tool) for environments where filesystem watching is restricted.
- No data migrations required; registry is in-memory. Future persistence can reuse manager interfaces.
- Feature flag can be added later by gating `createSkillManager` invocation; note in docs for ops.

## 8) Completion Criteria
- [ ] SkillManager orchestrates load/index/watch with passing unit tests.
- [ ] RAG SkillIndexer exported and covered by tests.
- [ ] MCP skill tools registered and validated with scope enforcement tests.
- [ ] Governance docs & AGENTS updated with skill policies.
- [ ] `skills/README.md` published with contributor checklist.
- [ ] All affected packages pass lint, typecheck, and test commands with ≥95% changed-line coverage.
- [ ] Manual QA checklist executed or delegated with evidence.
