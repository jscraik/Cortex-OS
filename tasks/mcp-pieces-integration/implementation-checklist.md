# MCP Pieces Integration - Implementation Checklist

## Phase 1: Pieces Drive Proxy (Days 1-2)

### Day 1: Drive Proxy Core
- [ ] Create `packages/mcp-server/src/pieces-drive-proxy.ts`
  - [ ] Define `PiecesDriveProxyConfig` interface
  - [ ] Create `PiecesDriveProxy` class with SSE transport
  - [ ] Implement `connect()` method
  - [ ] Implement `disconnect()` method
  - [ ] Implement `isConnected()` getter
  - [ ] Add error handling and logging

- [ ] Implement auto-reconnect logic
  - [ ] Add `scheduleReconnect()` private method
  - [ ] Implement 5-second delay between attempts
  - [ ] Add reconnect attempt logging
  - [ ] Clear timer on successful connection

- [ ] Implement tool discovery
  - [ ] Add `discoverTools()` method calling `listTools()`
  - [ ] Parse tool definitions from Pieces Drive
  - [ ] Cache discovered tools
  - [ ] Implement `getTools()` method

### Day 2: Drive Proxy Integration & Tests
- [ ] Integrate Drive proxy in MCP hub
  - [ ] Update `packages/mcp-server/src/index.ts`
  - [ ] Initialize Drive proxy on startup
  - [ ] Register Drive tools with `pieces_drive.` prefix
  - [ ] Add graceful shutdown handler
  - [ ] Update health check to include Drive status

- [ ] Add environment configuration
  - [ ] Define `PIECES_DRIVE_ENDPOINT` default
  - [ ] Define `PIECES_DRIVE_ENABLED` default (true)
  - [ ] Update `.env.example`
  - [ ] Document in README

- [ ] Write comprehensive tests
  - [ ] Create `src/__tests__/pieces-drive-proxy.test.ts`
  - [ ] Test successful connection
  - [ ] Test connection failure handling
  - [ ] Test auto-reconnect
  - [ ] Test tool discovery
  - [ ] Test tool execution forwarding
  - [ ] Test graceful disconnection

- [ ] Verify implementation
  - [ ] Run tests: `pnpm test pieces-drive-proxy`
  - [ ] Check coverage ≥95%
  - [ ] Lint: `pnpm lint`
  - [ ] Manual test with real Pieces Drive (if available)

## Phase 2: Pieces Copilot Proxy (Days 3-4)

### Day 3: Copilot Proxy Core
- [ ] Create `packages/mcp-server/src/pieces-copilot-proxy.ts`
  - [ ] Define `PiecesCopilotProxyConfig` interface
  - [ ] Create `PiecesCopilotProxy` class
  - [ ] Implement SSE connection (following Drive pattern)
  - [ ] Add tool discovery
  - [ ] Add auto-reconnect logic

- [ ] Implement context assembly
  - [ ] Create `assembleContext()` private method
  - [ ] Query local memory for relevant entries
  - [ ] Query Pieces LTM (if available)
  - [ ] Query Pieces Drive (if available)
  - [ ] Format context object for Copilot
  - [ ] Add timeout for context assembly (5s)

- [ ] Implement tool execution with context
  - [ ] Override `callTool()` for context-aware tools
  - [ ] Assemble context before `copilot.ask`
  - [ ] Include context in Copilot query
  - [ ] Return Copilot response

### Day 4: Copilot Persistence & Tests
- [ ] Add interaction persistence
  - [ ] Store query in local memory after completion
  - [ ] Tag with domain "copilot"
  - [ ] Include query, context summary, and response
  - [ ] Add timestamp and session metadata

- [ ] Emit A2A events
  - [ ] Emit `cortex.copilot.query.started` event
  - [ ] Emit `cortex.copilot.query.completed` event
  - [ ] Include correlation ID
  - [ ] Add timing metrics

- [ ] Integrate in MCP hub
  - [ ] Update `packages/mcp-server/src/index.ts`
  - [ ] Initialize Copilot proxy
  - [ ] Register Copilot tools with `pieces_copilot.` prefix
  - [ ] Pass memory provider for context assembly
  - [ ] Add health check

- [ ] Write tests
  - [ ] Create `src/__tests__/pieces-copilot-proxy.test.ts`
  - [ ] Test context assembly
  - [ ] Test context formatting
  - [ ] Test interaction persistence
  - [ ] Test A2A event emission
  - [ ] Test graceful degradation

- [ ] Verify implementation
  - [ ] Run tests: `pnpm test pieces-copilot-proxy`
  - [ ] Check coverage ≥95%
  - [ ] Integration test with mocked Copilot

## Phase 3: Enhanced Hybrid Search (Days 5-6)

### Day 5: Multi-Source Aggregation
- [ ] Update `packages/mcp-server/src/tools/hybrid-search.ts`
  - [ ] Add `include_drive` parameter
  - [ ] Add `include_copilot` parameter
  - [ ] Implement parallel queries to all sources
  - [ ] Add 30s timeout for entire operation
  - [ ] Add individual source timeouts (10s each)

- [ ] Implement result aggregation
  - [ ] Collect results from all enabled sources
  - [ ] Track source for each result
  - [ ] Handle partial failures gracefully
  - [ ] Log warnings for offline sources

- [ ] Add deduplication logic
  - [ ] Define deduplication key (content hash or ID)
  - [ ] Remove duplicate entries
  - [ ] Prefer local results over remote
  - [ ] Keep source attribution

### Day 6: Reranking & Testing
- [ ] Implement result reranking
  - [ ] Score results by relevance
  - [ ] Consider recency
  - [ ] Weight by source reliability
  - [ ] Sort by combined score

- [ ] Add source attribution
  - [ ] Include `source` field in each result
  - [ ] Add source metadata: `{ name, count, latency }`
  - [ ] Include warnings for failed sources

- [ ] Update response format
  - [ ] `sources`: Array of queried sources with stats
  - [ ] `combined`: Deduplicated and reranked results
  - [ ] `warnings`: Array of issues encountered
  - [ ] `timing`: Query timing breakdown

- [ ] Write comprehensive tests
  - [ ] Update `src/tools/__tests__/hybrid-search.test.ts`
  - [ ] Test all source combinations
  - [ ] Test deduplication
  - [ ] Test reranking
  - [ ] Test source attribution
  - [ ] Test partial failures
  - [ ] Test performance (< 500ms target)

- [ ] Verify implementation
  - [ ] Run tests: `pnpm test hybrid-search`
  - [ ] Performance benchmarks
  - [ ] Integration test with all proxies

## Phase 4: Context Bridge (Days 7-8)

### Day 7: Event Listening
- [ ] Update `packages/memory-core/src/context-bridge.ts`
  - [ ] Define `ContextBridgeConfig` interface
  - [ ] Create `ContextBridge` class
  - [ ] Research Pieces OS event API (gRPC/SSE)
  - [ ] Implement event listener
  - [ ] Add event type parsing

- [ ] Implement event filtering
  - [ ] Parse `PIECES_CONTEXT_FILTERS` config
  - [ ] Filter events by domain
  - [ ] Skip unwanted event types
  - [ ] Log filtered events (debug level)

- [ ] Add enable/disable logic
  - [ ] Check `PIECES_CONTEXT_BRIDGE_ENABLED`
  - [ ] Skip event listener if disabled
  - [ ] Add runtime enable/disable methods

### Day 8: Event Storage & Testing
- [ ] Implement event transformation
  - [ ] Extract relevant data from Pieces events
  - [ ] Create summary for each event type
  - [ ] Add domain tagging (code, notes, meetings, etc.)
  - [ ] Add session metadata

- [ ] Implement storage
  - [ ] Call `memory.store` for each captured event
  - [ ] Batch events if high volume
  - [ ] Add retry logic for failed storage
  - [ ] Log storage statistics

- [ ] Write tests
  - [ ] Create `src/__tests__/context-bridge.test.ts`
  - [ ] Test event capture
  - [ ] Test domain filtering
  - [ ] Test enable/disable
  - [ ] Test event transformation
  - [ ] Test storage integration
  - [ ] Test batching logic

- [ ] Verify implementation
  - [ ] Run tests: `pnpm test context-bridge`
  - [ ] Manual test with simulated events
  - [ ] Check memory growth is reasonable

## Phase 5: Memory Reporting (Days 9-10)

### Day 9: Report Generation
- [ ] Update `packages/memory-core/src/reporting.ts`
  - [ ] Define `ReportConfig` interface
  - [ ] Update `generateReport()` function
  - [ ] Add time-based filtering
  - [ ] Add domain filtering
  - [ ] Integrate hybrid search for multi-source queries

- [ ] Implement markdown formatting
  - [ ] Create report template
  - [ ] Add sections: meetings, code, notes, etc.
  - [ ] Format timestamps
  - [ ] Add source attribution
  - [ ] Include statistics

- [ ] Add alternative formats
  - [ ] JSON format
  - [ ] Plain text format
  - [ ] Support format parameter

### Day 10: Reporting Tool & Tests
- [ ] Register `memory.report` MCP tool
  - [ ] Update tool registration in MCP hub
  - [ ] Define tool schema with Zod
  - [ ] Add examples in tool description
  - [ ] Connect to reporting engine

- [ ] Write tests
  - [ ] Update `src/__tests__/reporting.test.ts`
  - [ ] Test time-based reports
  - [ ] Test domain filtering
  - [ ] Test multi-source aggregation
  - [ ] Test markdown formatting
  - [ ] Test JSON format
  - [ ] Test plain text format

- [ ] Verify implementation
  - [ ] Run tests: `pnpm test reporting`
  - [ ] Generate sample reports
  - [ ] Verify report accuracy

## Phase 6: Event Manager Validation (Day 11)

- [ ] Create `apps/cortex-os/tests/events/event-manager.test.ts`
  - [ ] Test valid event emission
  - [ ] Test malformed events throw errors
  - [ ] Test missing `type` field
  - [ ] Test missing `payload` field
  - [ ] Test empty `type` string
  - [ ] Test non-object `payload`
  - [ ] Test A2A integration

- [ ] Run focused tests
  - [ ] Execute: `pnpm vitest apps/cortex-os/tests/events/event-manager.test.ts --runInBand`
  - [ ] Verify all tests pass
  - [ ] Check coverage

- [ ] Document event schema
  - [ ] Update event documentation
  - [ ] Add examples
  - [ ] Document validation rules

## Phase 7: Docker Compose Integration (Day 12)

### Day 12: Docker Configuration
- [ ] Update `docker/memory-stack/docker-compose.yml`
  - [ ] Add `extra_hosts` for Pieces OS access
  - [ ] Configure `host.docker.internal:host-gateway`
  - [ ] Add all Pieces environment variables
  - [ ] Update cortex-mcp service config

- [ ] Update `.env.example`
  - [ ] Add all Pieces configuration examples
  - [ ] Document required vs optional variables
  - [ ] Add comments explaining each variable

- [ ] Test Docker stack
  - [ ] Start stack: `docker compose up -d`
  - [ ] Verify service startup order
  - [ ] Check health endpoints
  - [ ] Test Pieces proxy connections
  - [ ] Verify graceful degradation when Pieces offline

- [ ] Document deployment
  - [ ] Update deployment guide
  - [ ] Add troubleshooting section
  - [ ] Document Pieces OS requirements

## Phase 8: CI/CD & Documentation (Days 13-14)

### Day 13: CI Scripts & Tests
- [ ] Create `scripts/ci/pieces-integration.test.sh`
  - [ ] Validate Pieces proxy configurations
  - [ ] Test graceful degradation
  - [ ] Check environment variables
  - [ ] Verify tool registration

- [ ] Update `scripts/ci/memory-enforce.test.sh`
  - [ ] Add Pieces integration checks
  - [ ] Verify no duplicate logic
  - [ ] Check memory deduplication

- [ ] Create `scripts/setup-pieces-integration.sh`
  - [ ] Setup helper for Pieces configuration
  - [ ] Validate Pieces OS installation
  - [ ] Configure environment variables
  - [ ] Test connectivity

- [ ] Update GitHub Actions
  - [ ] Add Pieces integration test job (optional)
  - [ ] Update memory enforcement workflow
  - [ ] Add documentation validation

### Day 14: Documentation
- [ ] Update architecture documentation
  - [ ] Create architecture diagram with Pieces
  - [ ] Document data flow
  - [ ] Explain proxy pattern
  - [ ] Show integration points

- [ ] Write configuration guide
  - [ ] Document all environment variables
  - [ ] Provide configuration examples
  - [ ] Explain feature flags
  - [ ] Add quick start guide

- [ ] Create troubleshooting guide
  - [ ] Common issues and solutions
  - [ ] Debugging steps
  - [ ] Log interpretation
  - [ ] Health check meanings

- [ ] Update README files
  - [ ] `packages/mcp-server/README.md`
  - [ ] `packages/memory-core/README.md`
  - [ ] Root `README.md` (if applicable)

- [ ] Create deployment guide
  - [ ] Docker Compose instructions
  - [ ] Pieces OS setup
  - [ ] Environment configuration
  - [ ] Verification steps

## Final Verification

- [ ] Run full test suite
  - [ ] `pnpm test` - all tests pass
  - [ ] Coverage ≥95% maintained
  - [ ] No regressions in existing functionality

- [ ] Run quality gates
  - [ ] `pnpm lint` - all files pass
  - [ ] `pnpm typecheck` - no type errors
  - [ ] `pnpm security:scan` - no issues
  - [ ] `pnpm structure:validate` - structure valid

- [ ] Manual QA
  - [ ] Pieces Drive proxy connects
  - [ ] Pieces Copilot proxy connects
  - [ ] Hybrid search aggregates correctly
  - [ ] Context bridge captures events
  - [ ] Reports generate successfully
  - [ ] Graceful degradation works
  - [ ] Docker stack runs cleanly

- [ ] Documentation review
  - [ ] All docs updated
  - [ ] Examples work
  - [ ] Links valid
  - [ ] Diagrams accurate

- [ ] Create SUMMARY.md
  - [ ] Capture implementation decisions
  - [ ] Document challenges and solutions
  - [ ] Record lessons learned
  - [ ] Note future improvements

---

## Progress Tracking

**Started**: [Date]
**Current Phase**: Phase 0 (Planning)
**Completed Phases**: 0/8
**Overall Progress**: 0/150 items (0%)

## Notes

- Check off items as completed
- Update progress percentages daily
- Document blockers immediately
- Escalate risks early

---

Co-authored-by: brAInwav Development Team
