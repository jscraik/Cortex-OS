# MCP and Memory Integration - Aligned Implementation Plan

**Goal:** Complete the MCP and Memory integration following existing architecture
**Entry Points:** `packages/mcp-server`, `packages/memory-core`, `packages/agent-toolkit`
**Stack:** TypeScript, FastMCP v3, SQLite, Qdrant, NATS
**Constraints:** Work with existing MCP setup, maintain backward compatibility, no breaking changes
**Testing:** 95%+ coverage with integration tests
**Non-goals:** Rewriting existing MCP infrastructure, removing working features

---

## 1) File Tree of Proposed Changes

```
packages/mcp-server/
├─ src/
│  ├─ pieces-drive-proxy.ts          NEW – Pieces Drive SSE proxy
│  ├─ pieces-copilot-proxy.ts        NEW – Pieces Copilot SSE proxy  
│  ├─ tools/
│  │  ├─ agent-toolkit.ts            UPDATE – integrate with path resolver
│  │  ├─ memory-tools.ts             UPDATE – add report tool
│  │  └─ hybrid-search.ts            UPDATE – enhance aggregation
│  └─ __tests__/
│     ├─ pieces-drive-proxy.test.ts  NEW – Drive proxy tests
│     ├─ pieces-copilot-proxy.test.ts NEW – Copilot proxy tests
│     └─ hybrid-search.test.ts       UPDATE – aggregation tests

packages/memory-core/
├─ src/
│  ├─ context-bridge.ts              UPDATE – Pieces capture integration
│  ├─ reporting.ts                   UPDATE – enhanced reporting
│  └─ __tests__/
│     ├─ context-bridge.test.ts      UPDATE – capture tests
│     └─ reporting.test.ts           UPDATE – report generation tests

packages/agent-toolkit/
├─ src/
│  └─ infra/
│     ├─ paths.ts                    UPDATE – verify resolver
│     └─ __tests__/
│        └─ paths.test.ts            UPDATE – path resolution tests

apps/cortex-os/
├─ tests/
│  ├─ events/
│  │  └─ event-manager.test.ts       NEW – event validation tests
│  └─ mcp/
│     ├─ pieces-integration.test.ts  NEW – Pieces proxy integration
│     └─ memory-reporting.test.ts    NEW – reporting tool tests

docker/
└─ memory-stack/
   ├─ docker-compose.yml              UPDATE – add Pieces endpoints
   └─ .env.example                    UPDATE – Pieces configuration

scripts/
├─ setup-pieces-integration.sh       NEW – Pieces setup script
└─ ci/
   ├─ pieces-integration.test.sh     NEW – Pieces CI validation
   └─ memory-enforce.test.sh         UPDATE – memory deduplication checks
```

---

## 2) Implementation Plan

### Phase 1: Pieces Drive Proxy (Days 1-2)

1. Create `PiecesDriveProxy` class following existing `PiecesMCPProxy` pattern
   - Connect to `http://localhost:39301/model_context_protocol/2024-11-05/sse`
   - Auto-discover Drive tools via `listTools()` API
   - Register with `pieces_drive.` prefix in MCP hub
   - Implement graceful degradation when Drive offline

2. Integrate Drive proxy in `packages/mcp-server/src/index.ts`
   - Initialize alongside existing LTM proxy
   - Add environment variables: `PIECES_DRIVE_ENDPOINT`, `PIECES_DRIVE_ENABLED`
   - Register dynamic tools with MCP hub
   - Add health check status

3. Write comprehensive tests
   - Connection/reconnection scenarios
   - Tool discovery and registration
   - Graceful degradation when offline
   - Error handling and logging

### Phase 2: Pieces Copilot Proxy (Days 3-4)

1. Create `PiecesCopilotProxy` class with context orchestration
   - Connect to `http://localhost:39302/model_context_protocol/2024-11-05/sse`
   - Register tools: `copilot.ask`, `copilot.summarize`, `copilot.comment_code`
   - Auto-gather context from Local Memory + Drive + LTM before queries
   - Emit A2A events for Copilot interactions

2. Implement context orchestration
   - When `copilot.ask` called, run `memory.hybrid_search` first
   - Include Drive files and LTM memories in Copilot query
   - Persist Copilot interactions in Local Memory

3. Add configuration and tests
   - Environment: `PIECES_COPILOT_ENDPOINT`, `PIECES_COPILOT_ENABLED`
   - Integration tests with context assembly
   - A2A event emission validation

### Phase 3: Enhanced Hybrid Search (Days 5-6)

1. Extend `memory.hybrid_search` tool in `packages/mcp-server/src/tools/hybrid-search.ts`
   - Add flags: `include_drive`, `include_copilot` (alongside existing `include_pieces`)
   - Deduplicate and rerank results from multiple sources
   - Attribute sources in response: cortex-local, pieces-ltm, pieces-drive, copilot

2. Implement multi-source aggregation
   - Query local memory-core (existing)
   - Query Pieces LTM if enabled (existing)
   - Query Pieces Drive if enabled (NEW)
   - Query Pieces Copilot if enabled (NEW)
   - Merge and rerank all results with source attribution

3. Update parameters schema
   ```typescript
   {
     query: string,
     include_pieces?: boolean,    // LTM (existing)
     include_drive?: boolean,     // NEW
     include_copilot?: boolean,   // NEW
     limit?: number,
     time_range?: { start?: string, end?: string }
   }
   ```

### Phase 4: Context Bridge Enhancement (Days 7-8)

1. Update `packages/memory-core/src/context-bridge.ts`
   - Listen to Pieces OS capture events (via gRPC or SSE if available)
   - Forward summarized entries to Local Memory using `memory.store`
   - Capture: tabs, code changes, notes, meetings
   - Tag with domain/session metadata

2. Add configuration
   - `PIECES_CONTEXT_BRIDGE_ENABLED=true` (default)
   - `PIECES_CONTEXT_FILTERS` (optional: domains to include/exclude)
   - Can be disabled if user doesn't want automatic ingestion

3. Test coverage
   - Event capture and transformation
   - Memory storage integration
   - Domain filtering
   - Enable/disable functionality

### Phase 5: Memory Reporting Tool (Days 9-10)

1. Enhance `packages/memory-core/src/reporting.ts`
   - Add MCP tool `memory.report` to memory-core
   - Accept time range, domain, formatting options
   - Query Local Memory + optional Pieces services
   - Generate summaries/timelines (meetings, status updates, research)

2. Register in MCP hub
   - Accessible via agents, CLI, ChatGPT
   - Support output formats: markdown, JSON, plain text
   - Include source attribution

3. Test reporting scenarios
   - Time-based queries
   - Domain filtering
   - Multi-source aggregation
   - Format transformations

### Phase 6: Event Manager Validation (Day 11)

1. Add validation in `apps/cortex-os/src/events/event-manager.ts` (already done)
2. Create comprehensive test suite `apps/cortex-os/tests/events/event-manager.test.ts`
   - Positive cases: valid events
   - Negative cases: malformed events throw errors
   - Type and payload structure validation
   - A2A emission verification

3. Run focused tests
   ```bash
   pnpm vitest apps/cortex-os/tests/events/event-manager.test.ts --runInBand
   ```

### Phase 7: Docker Compose Integration (Day 12)

1. Update `docker/memory-stack/docker-compose.yml`
   - Add `extra_hosts` for Pieces OS access: `host.docker.internal:host-gateway`
   - Configure environment variables for all three Pieces services
   - Ensure cortex-mcp container can reach host ports 39300-39302

2. Example configuration addition:
   ```yaml
   cortex-mcp:
     extra_hosts:
       - "host.docker.internal:host-gateway"
     environment:
       - PIECES_MCP_ENDPOINT=http://host.docker.internal:39300/...
       - PIECES_DRIVE_ENDPOINT=http://host.docker.internal:39301/...
       - PIECES_COPILOT_ENDPOINT=http://host.docker.internal:39302/...
       - PIECES_CONTEXT_BRIDGE_ENABLED=true
   ```

3. Add health checks and dependency management
   - Ensure services start in correct order
   - Graceful degradation if Pieces services unavailable
   - Health endpoints reflect Pieces connection status

### Phase 8: CI/CD & Documentation (Day 13-14)

1. Create CI validation scripts
   - `scripts/ci/pieces-integration.test.sh` – validate Pieces proxies
   - Update `scripts/ci/memory-enforce.test.sh` – memory deduplication
   - `scripts/setup-pieces-integration.sh` – setup helper

2. Update documentation
   - Architecture diagrams showing Pieces integration
   - Configuration guide for all Pieces services
   - Deployment guide with Docker Compose
   - Troubleshooting guide for common issues

3. Update GitHub Actions
   - Add Pieces integration test job (optional, requires Pieces OS)
   - Update memory enforcement job
   - Add documentation validation

---

## 3) Technical Rationale

### Why This Approach

1. **Reuses Existing Patterns**: Follows `PiecesMCPProxy` pattern already implemented for LTM
2. **Minimal Changes**: Works with current MCP infrastructure without rewrites
3. **Graceful Degradation**: Hub remains fully functional even if Pieces services offline
4. **Local-First**: All data in memory-core (SQLite + Qdrant); Pieces is secondary
5. **Modular**: Each Pieces service can be enabled/disabled independently
6. **Type-Safe**: Leverages existing TypeScript infrastructure and FastMCP v3

### Alignment with Existing Conventions

- Uses SSE transport via `@modelcontextprotocol/sdk` (already in use)
- Follows existing proxy pattern from `pieces-proxy.ts`
- Integrates with existing MCP hub tool registration
- Maintains existing A2A event emission patterns
- Respects existing environment variable naming conventions

### Trade-offs

- **Simplicity vs Extensibility**: Chose simple proxy pattern over complex abstraction
- **Coupling vs Cohesion**: Proxies are loosely coupled; can add/remove Pieces services easily
- **Performance vs Features**: Hybrid search may be slower but provides comprehensive results
- **Configuration vs Convention**: Explicit environment variables over implicit discovery

---

## 4) Dependency Impact

### Internal Dependencies

- **No new internal dependencies**: Uses existing packages
- **Enhanced integration**: `packages/mcp-server` ↔ `packages/memory-core`
- **Event flow**: `apps/cortex-os` continues emitting A2A events for Pieces interactions

### External Packages

- **No new external packages required**: Already using `@modelcontextprotocol/sdk`
- **Optional peer dependencies**: Pieces OS services (run on host, not containerized)

### Configuration Changes

- **New environment variables**:
  - `PIECES_DRIVE_ENDPOINT` (default: `http://localhost:39301/model_context_protocol/2024-11-05/sse`)
  - `PIECES_DRIVE_ENABLED` (default: `true`)
  - `PIECES_COPILOT_ENDPOINT` (default: `http://localhost:39302/model_context_protocol/2024-11-05/sse`)
  - `PIECES_COPILOT_ENABLED` (default: `true`)
  - `PIECES_CONTEXT_BRIDGE_ENABLED` (default: `true`)
  - `PIECES_CONTEXT_FILTERS` (optional)
  - `MEMORY_REPORTING_ENABLED` (default: `true`)

- **Docker Compose additions**:
  - `extra_hosts` configuration for Pieces OS access
  - Environment variable propagation to containers

---

## 5) Risks & Mitigations

### Risk 1: Pieces OS Not Running
- **Impact**: Proxies fail to connect, features unavailable
- **Mitigation**: Graceful degradation – hub logs warning, continues with local tools only
- **Test**: Connection failure scenarios in integration tests

### Risk 2: SSE Connection Stability
- **Impact**: Dropped connections to Pieces services
- **Mitigation**: Auto-reconnect with exponential backoff (already implemented in LTM proxy)
- **Test**: Connection/reconnection scenarios

### Risk 3: Performance Impact from Multi-Source Queries
- **Impact**: Slower hybrid search when querying multiple Pieces services
- **Mitigation**: 
  - Make Pieces queries optional via flags
  - Implement timeout limits (30s default)
  - Cache results where appropriate
- **Test**: Performance benchmarks with multiple sources

### Risk 4: Data Privacy Concerns
- **Impact**: Users may not want automatic context capture
- **Mitigation**: 
  - `PIECES_CONTEXT_BRIDGE_ENABLED` defaults to true but easily disabled
  - `PIECES_CONTEXT_FILTERS` allows fine-grained control
  - All data stays local; no cloud syncing unless explicitly enabled
- **Test**: Configuration validation tests

### Risk 5: Breaking Changes to Existing MCP Clients
- **Impact**: Existing tools change behavior unexpectedly
- **Mitigation**:
  - New tools added with distinct names (`pieces_drive.*`, `pieces_copilot.*`)
  - Existing tools maintain backward compatibility
  - Hybrid search additions are opt-in via new flags
- **Test**: Regression suite for existing MCP tools

---

## 6) Testing & Validation Strategy

### Unit Tests (Packages)

**`packages/mcp-server`**
- `src/__tests__/pieces-drive-proxy.test.ts`
  - Connection scenarios (success, failure, reconnect)
  - Tool discovery and registration
  - Error handling
  - Graceful degradation
  
- `src/__tests__/pieces-copilot-proxy.test.ts`
  - Connection and tool registration
  - Context assembly before queries
  - A2A event emission
  - Response transformation

- `src/tools/__tests__/hybrid-search.test.ts`
  - Multi-source aggregation
  - Deduplication logic
  - Source attribution
  - Flag combinations (include_drive, include_copilot)

**`packages/memory-core`**
- `src/__tests__/context-bridge.test.ts`
  - Event capture and transformation
  - Memory storage integration
  - Domain filtering
  - Enable/disable functionality

- `src/__tests__/reporting.test.ts`
  - Time-based queries
  - Domain filtering
  - Multi-source aggregation
  - Format transformations (markdown, JSON, text)

**`packages/agent-toolkit`**
- `src/infra/__tests__/paths.test.ts` (UPDATE)
  - Verify all path resolution priorities
  - Test fallback behavior
  - Environment variable precedence

### Integration Tests (Apps)

**`apps/cortex-os`**
- `tests/events/event-manager.test.ts` (NEW)
  - Valid event emission
  - Malformed event rejection
  - Type and payload validation
  - A2A integration

- `tests/mcp/pieces-integration.test.ts` (NEW)
  - Full proxy lifecycle
  - Tool execution through hub
  - Hybrid search with multiple sources
  - Context bridge integration

- `tests/mcp/memory-reporting.test.ts` (NEW)
  - Report generation
  - Multi-source queries
  - Format options
  - Time range filtering

### Docker Integration Tests

**`docker/memory-stack`**
- Service startup order validation
- Health check verification
- Cross-service communication
- Pieces OS host access validation
- Data persistence across restarts

### Performance Tests

- Hybrid search latency with 1-4 sources
- Context bridge throughput
- Report generation time
- Memory usage with multiple proxies

### Manual QA Checklist

- [ ] Pieces OS running on ports 39300-39302
- [ ] MCP hub connects to all three Pieces services
- [ ] `tools/list` shows all `pieces_*` tools
- [ ] `memory.hybrid_search` merges results correctly
- [ ] Context bridge captures Pieces events
- [ ] `memory.report` generates accurate summaries
- [ ] Graceful degradation when Pieces services offline
- [ ] Docker Compose stack starts cleanly
- [ ] ChatGPT integration works via stdio
- [ ] Health endpoints reflect Pieces connection status

---

## 7) Rollout / Migration Notes

### Feature Flags

- `PIECES_DRIVE_ENABLED=true|false` – Enable/disable Drive proxy
- `PIECES_COPILOT_ENABLED=true|false` – Enable/disable Copilot proxy
- `PIECES_CONTEXT_BRIDGE_ENABLED=true|false` – Enable/disable automatic capture
- `MEMORY_REPORTING_ENABLED=true|false` – Enable/disable reporting tool

### Gradual Enablement

1. **Phase 1 (Week 1)**: Deploy with all Pieces features disabled
   - Verify existing functionality unaffected
   - Monitor stability

2. **Phase 2 (Week 2)**: Enable LTM proxy only (already implemented)
   - Test hybrid search with single remote source
   - Monitor performance

3. **Phase 3 (Week 3)**: Enable Drive proxy
   - Test file/snippet operations
   - Monitor storage impact

4. **Phase 4 (Week 4)**: Enable Copilot proxy
   - Test context-aware queries
   - Monitor API usage

5. **Phase 5 (Week 5)**: Enable context bridge
   - Test automatic capture
   - Monitor memory growth

6. **Phase 6 (Week 6)**: Enable reporting tool
   - Test report generation
   - Monitor query performance

### Rollback Plan

If issues arise, disable Pieces features individually:

```bash
# Disable all Pieces features
export PIECES_MCP_ENABLED=false
export PIECES_DRIVE_ENABLED=false
export PIECES_COPILOT_ENABLED=false
export PIECES_CONTEXT_BRIDGE_ENABLED=false

# Restart MCP hub
pnpm --filter @cortex-os/mcp-server restart
```

Hub continues functioning with local tools only.

### Cleanup Plan (Post-Stabilization)

1. Remove experimental flags once stable
2. Archive old proxy implementations if upgraded
3. Update documentation to reflect standard configuration
4. Remove temporary compatibility shims
5. Consolidate test fixtures

---

## 8) Completion Criteria

### Must Have (Blocking Release)

- [ ] All Pieces proxies implemented and tested
- [ ] Hybrid search aggregates from all sources
- [ ] Context bridge captures and stores Pieces events
- [ ] Memory reporting generates accurate summaries
- [ ] Event manager validation enforced
- [ ] Docker Compose configuration complete
- [ ] All tests pass with ≥95% coverage
- [ ] All security/lint gates clean
- [ ] Documentation complete and accurate

### Nice to Have (Post-Release)

- [ ] Performance optimization for hybrid search
- [ ] Advanced filtering for context bridge
- [ ] Custom report templates
- [ ] Pieces OS health monitoring dashboard
- [ ] Automated Pieces service discovery

### Success Metrics

1. **Coverage**: ≥95% test coverage across all new code
2. **Performance**: Hybrid search < 500ms with 4 sources
3. **Reliability**: Graceful degradation in 100% of Pieces outage scenarios
4. **Adoption**: Context bridge captures 90%+ of relevant Pieces events
5. **Quality**: Zero regressions in existing MCP functionality

---

## Quick Start Commands

```bash
# Setup environment
export PIECES_DRIVE_ENABLED=true
export PIECES_COPILOT_ENABLED=true
export PIECES_CONTEXT_BRIDGE_ENABLED=true

# Run tests
pnpm --filter @cortex-os/mcp-server test
pnpm --filter @cortex-os/memory-core test
pnpm vitest apps/cortex-os/tests/events/event-manager.test.ts

# Start services
docker compose -f docker/memory-stack/docker-compose.yml up -d

# Verify Pieces integration
curl http://localhost:3024/health
pnpm --filter @cortex-os/mcp-server tools:list
```

---

## References

- Existing LTM proxy: `packages/mcp-server/src/pieces-proxy.ts`
- Hybrid search: `packages/mcp-server/src/tools/hybrid-search.ts`
- Event manager: `apps/cortex-os/src/events/event-manager.ts`
- Docker config: `docker/memory-stack/docker-compose.yml`
- Original TDD plan: `tasks/mcp-and-memory-tdd-plan.md`

---

**Status**: Ready for implementation
**Estimated Duration**: 14 days
**Risk Level**: Medium (existing architecture, gradual rollout)
**Dependencies**: Pieces OS running on localhost:39300-39302

Co-authored-by: brAInwav Development Team
