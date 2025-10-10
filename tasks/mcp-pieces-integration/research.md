# MCP Pieces Integration - Research

## Task Overview

**Feature**: Complete Pieces OS integration for Cortex MCP hub
**Status**: Planning phase
**Priority**: High
**Estimated Duration**: 14 days

## RAID Analysis

### Risks

1. **Pieces OS Availability**
   - Risk: Pieces services may not be running during development/testing
   - Impact: Cannot test integration features
   - Mitigation: Implement graceful degradation, comprehensive mocking
   - Probability: Medium | Impact: Medium

2. **SSE Connection Stability**
   - Risk: SSE connections to Pieces services may drop unexpectedly
   - Impact: Proxy failures, incomplete data
   - Mitigation: Auto-reconnect with exponential backoff (already implemented for LTM)
   - Probability: Low | Impact: Low

3. **Performance Degradation**
   - Risk: Multi-source hybrid search may be too slow
   - Impact: Poor user experience
   - Mitigation: Timeout limits (30s), optional flags, caching
   - Probability: Medium | Impact: Medium

4. **Data Privacy Concerns**
   - Risk: Users may not want automatic context capture
   - Impact: User trust, compliance issues
   - Mitigation: Disabled by default, clear opt-in, fine-grained filters
   - Probability: Low | Impact: High

5. **Breaking Existing MCP Clients**
   - Risk: Changes to existing tools break current usage
   - Impact: Regression, user complaints
   - Mitigation: Additive changes only, backward compatibility, regression tests
   - Probability: Very Low | Impact: High

### Assumptions

1. Pieces OS will be installed and accessible on localhost:39300-39302
2. SSE transport will remain the standard for Pieces MCP services
3. Existing `PiecesMCPProxy` pattern is stable and reusable
4. FastMCP v3 infrastructure will continue to be the foundation
5. Users want unified tool discovery across local and Pieces services
6. Performance impact from multi-source queries is acceptable with timeouts

### Issues

1. **Current State Analysis**
   - Issue: Original TDD plan didn't follow code-change-planner format
   - Resolution: Created aligned implementation plan
   - Status: Resolved

2. **Missing Documentation**
   - Issue: Pieces OS integration not fully documented in existing docs
   - Resolution: Will update architecture diagrams and guides
   - Status: Open

3. **Test Infrastructure**
   - Issue: No existing test infrastructure for Pieces proxies beyond LTM
   - Resolution: Create comprehensive test suite following LTM proxy pattern
   - Status: Open

### Dependencies

**Internal Dependencies:**
- `packages/mcp-server` - MCP hub implementation
- `packages/memory-core` - Memory storage and retrieval
- `@modelcontextprotocol/sdk` - SSE client transport
- `apps/cortex-os` - Event emission and orchestration

**External Dependencies:**
- Pieces OS (LTM: port 39300)
- Pieces Drive (port 39301)
- Pieces Copilot (port 39302)

**Blocking Dependencies:**
- None - implementation can proceed incrementally
- Pieces OS installation recommended but not required (mocking available)

## Discovery Phase

### Use Cases

1. **Unified Tool Discovery**
   - User wants to see all available tools (local + Pieces) in one list
   - Expected: Single MCP `tools/list` endpoint shows all tools
   - Value: Simplified developer experience, consistent interface

2. **Multi-Source Search**
   - User searches for "meeting notes from last week"
   - Expected: Results from local memory, Pieces LTM, and Drive combined
   - Value: Comprehensive context without manual querying

3. **Context-Aware Assistance**
   - User asks Pieces Copilot a question
   - Expected: Copilot receives relevant context from local memory + Drive
   - Value: Better AI responses, reduced manual context gathering

4. **Automatic Context Capture**
   - User works in IDE, Pieces captures code changes
   - Expected: Summaries automatically stored in local memory
   - Value: Seamless context building without manual entry

5. **Time-Based Reporting**
   - User wants daily/weekly status report
   - Expected: `memory.report` aggregates from all sources
   - Value: Automated documentation, progress tracking

### Requirements Gathering

**Functional Requirements:**
1. Drive proxy connects to Pieces Drive via SSE
2. Copilot proxy connects to Pieces Copilot via SSE
3. Hybrid search aggregates results from 4 sources (local, LTM, Drive, Copilot)
4. Context bridge captures Pieces events and stores in local memory
5. Reporting tool generates summaries from multi-source queries
6. All proxies support graceful degradation when services offline
7. Configuration via environment variables
8. Tools registered with appropriate prefixes (`pieces_drive.*`, `pieces_copilot.*`)

**Non-Functional Requirements:**
1. **Performance**: Hybrid search < 500ms with all 4 sources
2. **Reliability**: 100% graceful degradation when Pieces offline
3. **Security**: No credentials in logs, secure SSE connections
4. **Testability**: ≥95% coverage with mocked Pieces services
5. **Maintainability**: Follow existing proxy patterns, clear documentation
6. **Accessibility**: Error messages clear and actionable
7. **Scalability**: Handle 1000+ hybrid search queries per hour

### Feasibility Analysis (PIECES)

**Performance:**
- SSE connections: Low latency (~50ms handshake)
- Multi-source queries: Parallel execution, 30s timeout
- Risk: Acceptable with proper timeout and caching

**Information:**
- Pieces API documentation available
- Existing LTM proxy provides reference implementation
- MCP SDK well-documented
- Risk: Low - sufficient information available

**Economics:**
- Development time: 14 days estimated
- Testing infrastructure: Reuse existing patterns
- Maintenance: Low - follows established patterns
- Risk: Low - cost-effective implementation

**Control:**
- Feature flags allow granular control
- Environment variables for configuration
- Graceful degradation maintains control
- Risk: Low - sufficient control mechanisms

**Efficiency:**
- Reuses existing proxy pattern
- Minimal code duplication
- Leverages FastMCP v3 infrastructure
- Risk: Low - efficient approach

**Services:**
- Pieces OS provides all required services
- SSE transport standard and reliable
- Optional services don't break core functionality
- Risk: Low - service availability well-handled

**Overall Feasibility**: HIGH - All PIECES factors favorable

### Technical Spikes

**Spike 1: Pieces Drive API Exploration** (2 hours)
- Problem: Unknown Drive tool capabilities and schemas
- Setup: Manual Pieces Drive connection, tool discovery
- Results: Document available tools, input/output schemas
- Outcome: [To be completed during implementation]

**Spike 2: Copilot Context Assembly** (4 hours)
- Problem: Optimal context format for Copilot queries
- Setup: Test various context structures with Copilot
- Results: Determine best context assembly pattern
- Outcome: [To be completed during implementation]

**Spike 3: Context Bridge Event Listening** (3 hours)
- Problem: How to listen for Pieces OS capture events
- Setup: Research Pieces OS event APIs (gRPC/SSE)
- Results: Identify event types and subscription methods
- Outcome: [To be completed during implementation]

### Proof-of-Concept Evaluation

**PoC 1: Drive Proxy MVP** (1 day)
- Need: Validate Drive proxy pattern works
- Ideation: Minimal proxy with one tool
- Evaluation: Connection stability, tool execution
- Design: Follow LTM proxy pattern exactly
- Presentation: Demo to team
- Status: Planned for Day 1

**PoC 2: Hybrid Search Aggregation** (1 day)
- Need: Verify multi-source merging works efficiently
- Ideation: Aggregate 2-3 sources with mock data
- Evaluation: Performance, deduplication accuracy
- Design: Parallel queries with timeout
- Presentation: Performance metrics
- Status: Planned for Day 5

**PoC 3: Context Bridge** (1 day)
- Need: Confirm Pieces event capture is feasible
- Ideation: Minimal event listener + storage
- Evaluation: Event types, capture rate, storage impact
- Design: Polling or subscription-based
- Presentation: Capture statistics
- Status: Planned for Day 7

## Architecture Choices

### Existing Patterns to Reuse

1. **`PiecesMCPProxy` pattern**
   - Location: `packages/mcp-server/src/pieces-proxy.ts`
   - Usage: Template for Drive and Copilot proxies
   - Rationale: Proven pattern, handles reconnection

2. **FastMCP v3 tool registration**
   - Location: `packages/mcp-server/src/index.ts`
   - Usage: Register all Pieces tools
   - Rationale: Standard MCP hub pattern

3. **A2A event emission**
   - Location: `apps/cortex-os/src/events/event-manager.ts`
   - Usage: Emit events for Pieces interactions
   - Rationale: Consistent observability

4. **Environment variable configuration**
   - Pattern: `PIECES_*_ENDPOINT`, `PIECES_*_ENABLED`
   - Rationale: Clear, testable, follows conventions

### Integration Points

**MCP Hub → Pieces Services:**
- Transport: SSE (`@modelcontextprotocol/sdk` SSEClientTransport)
- Discovery: Dynamic tool discovery via `listTools()`
- Execution: Proxy pattern with error handling

**Memory-Core → Context Bridge:**
- Storage: `memory.store` tool for captured events
- Retrieval: Standard `memory.search` for context assembly
- Tagging: Domain/session metadata for filtering

**Hybrid Search → All Sources:**
- Local: Direct LocalMemoryProvider call
- Pieces LTM: Via existing proxy
- Pieces Drive: Via new proxy (planned)
- Pieces Copilot: Via new proxy (planned)
- Aggregation: Parallel queries, merge, deduplicate, rerank

## Security & Accessibility Goals

### Security

1. **No credential exposure**
   - Pieces endpoints in environment variables only
   - No logging of sensitive data
   - Secure SSE connections

2. **Input validation**
   - All tool parameters validated via Zod schemas
   - Sanitize user input before Pieces queries
   - Rate limiting on hybrid search

3. **Error handling**
   - No stack traces in user-facing errors
   - Graceful degradation without data loss
   - Audit log for all Pieces interactions

### Accessibility (WCAG 2.2 AA)

1. **Error messages**
   - Clear, actionable error messages
   - Include brAInwav branding
   - Provide troubleshooting steps

2. **Tool descriptions**
   - Descriptive tool names and summaries
   - Parameter descriptions clear and concise
   - Examples provided where helpful

3. **Documentation**
   - Architecture diagrams with alt text
   - Configuration examples with explanations
   - Troubleshooting guide organized by symptom

## Research Outputs

### Technology Stack

- **TypeScript**: Core implementation language
- **FastMCP v3**: MCP hub infrastructure
- **SSE**: Transport for Pieces communication
- **SQLite**: Local memory canonical storage
- **Qdrant**: Vector search (optional)
- **NATS**: A2A event bus

### Architecture Decision Records

**ADR-001: Proxy Pattern for Pieces Integration**
- Decision: Use lightweight proxy classes for each Pieces service
- Rationale: Minimal code duplication, clear separation of concerns
- Alternatives: Direct integration, unified Pieces client
- Status: Accepted

**ADR-002: Opt-In Context Bridge**
- Decision: Context bridge disabled by default, requires explicit enable
- Rationale: User privacy, avoid unexpected behavior
- Alternatives: Enabled by default with opt-out
- Status: Accepted

**ADR-003: Hybrid Search as Aggregator Tool**
- Decision: Single `memory.hybrid_search` tool for multi-source queries
- Rationale: Simplified interface, single endpoint
- Alternatives: Separate tools per source
- Status: Accepted

**ADR-004: Environment Variable Configuration**
- Decision: All Pieces configuration via environment variables
- Rationale: 12-factor app principles, easy testing
- Alternatives: Configuration files, runtime API
- Status: Accepted

### Existing MCP Integration Points

**Current State:**
- Pieces LTM proxy implemented (`packages/mcp-server/src/pieces-proxy.ts`)
- FastMCP v3 hub running (`packages/mcp-server/src/index.ts`)
- Memory-core API available (`packages/memory-core`)
- A2A event bus configured (`apps/cortex-os`)
- Docker Compose setup ready (`docker/memory-stack/docker-compose.yml`)

**Gap Analysis:**
- Drive proxy: Not implemented
- Copilot proxy: Not implemented
- Enhanced hybrid search: Partially implemented (local + LTM only)
- Context bridge: Stubbed but not functional
- Reporting tool: Basic implementation needs enhancement

### PoC/Spike Findings

[To be updated during implementation]

---

**Research Completed**: 2025-10-10
**Next Phase**: Planning (create TDD plan, implementation checklist)
**Confidence Level**: High - clear path forward with existing patterns

Co-authored-by: brAInwav Development Team
