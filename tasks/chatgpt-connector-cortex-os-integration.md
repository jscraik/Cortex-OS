# Feature Specification: ChatGPT Connector Bridge for Cortex-OS

**Task ID**: `chatgpt-connector-cortex-os`  
**Feature Branch**: `feature/chatgpt-connector-cortex-os`  
**Created**: 2025-10-09  
**Status**: Draft  
**Priority**: P0  
**Assignee**: Unassigned

**User Request**: 
> "this information is so I can use ChatGPT connector to speak from ChatGPT pro to Cotex-OS that is what I want to implement"

---

## Executive Summary

Enable ChatGPT Pro sessions to invoke Cortex-OS capabilities through a secure remote MCP connection exposed over HTTPS/SSE. This feature hardens HTTP authentication, standardizes hybrid search responses, and documents the connector workflow so brAInwav operators can bridge external assistants to Cortex-OS safely.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: Secure Remote MCP Exposure (Priority: P0)

**As a** Cortex-OS platform engineer,  
**I want to** expose the MCP server over HTTPS with mandatory API-key auth and telemetry,  
**So that** only authorized ChatGPT connectors can reach brAInwav memory tools without opening a security regression.

**Why This Priority**: Without an authenticated transport, remote access becomes a release-blocking security hole.

**Independent Test Criteria**: Start the server with HTTP mode enabled, exercise the `/mcp` endpoint with and without `MCP_API_KEY`, and verify telemetry counters/logs plus 401 responses on invalid creds.

**Acceptance Scenarios**:

1. **Given** `MCP_API_KEY` is set and a request supplies the matching `X-API-Key` header  
   **When** a connector performs `tools/list` over HTTP/SSE  
   **Then** the server returns 200 with tool metadata  
   **And** logs a brAInwav-branded success entry containing `subjectId`.

2. **Given** `MCP_API_KEY` is configured  
   **When** a request omits or mismatches the API key  
   **Then** the server replies 401 with a branded JSON-RPC error  
   **And** increments failure telemetry without leaking the configured key.

**brAInwav Branding Requirements**:
- Auth success and failure logs include `branding: BRAND.prefix`.
- Error payloads say "Unauthorized" prefixed with brAInwav context.

---

### User Story 2: Connector-Friendly Search Responses (Priority: P1)

**As a** ChatGPT connector integrator,  
**I want to** receive normalized search results from local and Pieces backends,  
**So that** the assistant can provide consistent citations regardless of the underlying store.

**Why This Priority**: Hybrid search is core to the assistant workflow; inconsistent IDs break downstream tooling but are not security blockers.

**Independent Test Criteria**: Invoke `memory.hybrid_search` with Pieces enabled/disabled and verify deterministic IDs, metadata, and counts in the JSON response.

**Acceptance Scenarios**:

1. **Given** Pieces LTM responds with arbitrary payloads  
   **When** the hybrid tool merges local and remote results  
   **Then** the response uses stable `pieces-<hash>` IDs, includes metadata where provided, and totals match the sum of both sources.

2. **Given** Pieces is disabled or unreachable  
   **When** the tool executes  
   **Then** the response still returns local results with accurate totals  
   **And** emits a branded warning log once per failure burst.

**Dependencies**: Pieces proxy feature flag (`PIECES_MCP_ENABLED`), remote tool registration.

---

### User Story 3: Operational Connector Playbook (Priority: P2)

**As a** brAInwav operator,  
**I want to** follow documented steps to publish Cortex-OS via Cloudflared and register it in ChatGPT Pro,  
**So that** I can deploy the bridge without reverse-engineering internal changes.

**Why This Priority**: Documentation is essential but can trail the core implementation.

**Independent Test Criteria**: Follow the published playbook from a clean environment and confirm ChatGPT lists Cortex tools and executes a sample call.

**Acceptance Scenarios**:

1. **Given** the operator has a Cloudflare tunnel token  
   **When** they run the documented `cloudflared` command  
   **Then** the tunnel exposes `/mcp` and `/sse` endpoints that pass health checks.

2. **Given** ChatGPT Pro supports custom connectors  
   **When** the operator enters the tunnel URL and API key  
   **Then** ChatGPT lists Cortex tools and logs appear in Cortex-OS with brAInwav branding.

---

### Edge Cases & Error Scenarios

#### Edge Case 1: Missing MCP_API_KEY in HTTP Mode
**Given** `MCP_TRANSPORT` resolves to HTTP/SSE and `MCP_API_KEY` is unset  
**When** the server boots  
**Then** startup fails with a fatal, branded error  
**And** the process exits before binding to any port.

#### Edge Case 2: Cloudflared Tunnel Drift
**Given** the Cloudflared config points to port 3024  
**When** the operator overrides `PORT` to a different value without updating the tunnel  
**Then** the server logs a branded warning about port mismatch  
**And** supplies guidance to update `config/cloudflared/mcp-tunnel.yml`.

---

## Requirements *(mandatory)*

### Functional Requirements

1. **[FR-001]** HTTP authentication must reject unauthenticated requests.  
   - **Rationale**: Prevent open access when enabling remote connectors.  
   - **Validation**: Integration test hitting `/mcp` without key returns 401 and telemetry increments failure counter.

2. **[FR-002]** Hybrid search responses must use normalized IDs and metadata for remote Pieces results.  
   - **Rationale**: Consistent identifiers ensure connector citations remain stable.  
   - **Validation**: Unit test snapshots confirming deterministic `pieces-` IDs and metadata passthrough.

3. **[FR-003]** brAInwav branding included in logs, warnings, health responses, and error payloads.  
   - **Rationale**: Uphold branding compliance.  
   - **Validation**: Log assertions in tests plus manual review of health endpoint response.

### Non-Functional Requirements

#### Performance
- **[NFR-P-001]** Authentication guard must add <5ms overhead at 95th percentile under 100 RPS.

#### Security
- **[NFR-S-001]** Must pass `pnpm security:scan` with zero high-severity findings.  
- **[NFR-S-002]** API key comparison uses timing-safe equality and scrubs buffers post-check.  
- **[NFR-S-003]** No secrets stored in code; rely on environment variables (`MCP_API_KEY`, Cloudflare tokens).

#### Accessibility (WCAG 2.2 AA)
- **[NFR-A-001]** CLI prompts and docs highlight keyboard-only steps.  
- **[NFR-A-002]** Documentation screenshots (if any) include text alternatives.  
- **[NFR-A-003]** Markdown headings follow semantic order.  
- **[NFR-A-004]** Provide screen-reader friendly alt text for tunnel diagrams.  
- **[NFR-A-005]** Ensure color usage in docs respects AA contrast.

#### Testing
- **[NFR-T-001]** Maintain ≥90% coverage for new modules (`http-auth.ts`, `pieces-normalizer.ts`, `search-utils.ts`).  
- **[NFR-T-002]** Apply TDD for authentication and normalization helpers.  
- **[NFR-T-003]** Add integration test simulating remote MCP call over HTTP guard.  
- **[NFR-T-004]** Consider property-based tests for credential parsing edge cases.

#### Observability
- **[NFR-O-001]** Emit OpenTelemetry spans for authentication attempts and hybrid search calls.  
- **[NFR-O-002]** Structured logging retains `branding`, `authMetrics`, `subjectId`.  
- **[NFR-O-003]** Expose Prometheus counters for auth successes/failures.  
- **[NFR-O-004]** Forward warnings to error tracking with context (transport mode, port, tunnel state).
- _Implementation note (2025-10-09)_: `/metrics` (default port 9464, tunnel-accessible via `https://cortex-mcp.brainwav.io/metrics` when Access headers are supplied) now publishes `brainwav_mcp_*` counters/histograms and OTLP spans (`mcp.http.authenticate`, `mcp.tool.*`) are emitted when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Metrics coverage is validated in `metrics.integration.test.ts`, and operators are advised to run a parallel STDIO process alongside the HTTP bridge until FastMCP supports native multi-transport operation.

---

## Technical Constraints

### Must Use
- Named exports only.  
- Async/await for async flows.  
- Functions ≤ 40 lines; helpers split accordingly.  
- Zod schemas for tool input validation.  
- brAInwav branding applied to logs/messages.

### Must Avoid
- `Math.random()` in production logic.  
- Placeholder/mock responses in production paths.  
- TODO comments left in committed code.  
- Cross-domain imports bypassing A2A interfaces.  
- Hard-coded secrets or personal file paths.

### Integration Points
- **MCP Tools**: `memory.*`, `codebase.*`, `memory.hybrid_search`, remote Pieces proxies.  
- **A2A Events**: None introduced; future connector events TBD.  
- **Databases**: Local memory SQLite via `@cortex-os/memory-core`.  
- **External APIs**: Pieces MCP endpoint, Cloudflare tunnel service, ChatGPT connector framework.

---

## Architecture & Design

### System Components
```
┌───────────────────────────────┐
│  FastMCP Server (index.ts)    │
└──────────┬────────────────────┘
           │
           ├─→ Security Layer (security/http-auth.ts)
           ├─→ Search Layer   (search-utils.ts, pieces-normalizer.ts)
           └─→ Remote Bridges (Pieces proxy, Cloudflared tunnel)
```

### Data Model
```typescript
export type HttpAuthContext = {
  authenticated: true;
  issuedAt: string;
  subject: 'api-key';
  subjectId: string;
};

export type NormalizedPiecesResult = {
  id: string;
  content: string;
  score: number;
  source: 'pieces-ltm';
  metadata?: Record<string, unknown>;
};
```

### API Contracts
```typescript
export const hybridSearchInput = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
  include_pieces: z.boolean().optional().default(true),
  chat_llm: z.string().optional(),
});
```

---

## Dependencies

### Internal Dependencies (Cortex-OS packages)
- `@cortex-os/memory-core` – executes memory operations.  
- `@cortex-os/agent-toolkit` – registers agent toolkit MCP tools.

### External Dependencies (npm/pypi)
- `fastmcp@3.18.0` – FastMCP runtime; verify MPL equivalent license compliance.  
- `cloudflared` (binary) – HTTPS tunnel (operator dependency).

### Service Dependencies
- Cloudflare Tunnel service for remote exposure.  
- Pieces MCP endpoint (`PIECES_MCP_ENDPOINT`) when enabled.

---

## Implementation Phases

### Phase 1: Foundation (P0 Stories)
- [ ] Wire `security/http-auth.ts` into FastMCP with timing-safe comparisons.  
- [ ] Fail fast when HTTP transport lacks `MCP_API_KEY`.  
- [ ] Add auth telemetry metrics and structured logging.  
- [ ] Write unit/integration tests covering success/failure paths.

### Phase 2: Enhancement (P1 Stories)
- [ ] Introduce `pieces-normalizer.ts` and `search-utils.ts`.  
- [ ] Update `memory.hybrid_search` and `search` to use shared helpers.  
- [ ] Add normalization tests and regression snapshots.  
- [ ] Harden Pieces proxy gating behind feature flag.

### Phase 3: Polish (P2 Stories)
- [ ] Document Cloudflared + ChatGPT connector setup in operator playbooks.  
- [ ] Add logging guidance, diagrams, and troubleshooting tips.  
- [ ] Capture connector onboarding checklist in AGENTS.md or dedicated doc.

---

## Success Metrics

### Quantitative
- [ ] ≥90% coverage on new security/search modules.  
- [ ] Lint, typecheck, security scan, and integration tests passing in CI.  
- [ ] Auth guard latency overhead <5ms at p95 under 100 RPS.  
- [ ] 0 high-severity security findings.

### Qualitative
- [ ] Code reviews approved by security and platform maintainers.  
- [ ] Branding compliance verified.  
- [ ] Accessibility review for documentation complete.  
- [ ] Operator dry-run confirms ChatGPT connector can list and invoke Cortex tools.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Prompt injection via remote connectors | High | Medium | Enforce approval policies, sanitize logs, document connector trust checks |
| Cloudflared tunnel downtime | Medium | Medium | Run tunnel as service, monitor health endpoint, include fallback instructions |
| Pieces endpoint instability | Medium | High | Feature flag gating, graceful warnings, continue serving local results |
| Credential leakage in logs | High | Low | Mask API keys, use timing-safe compare with buffer scrubbing |

---

## Open Questions

1. **Should we automate tunnel provisioning via Terraform or document a manual path only?**  
   - **Decision needed by**: 2025-10-20  
   - **Options**: Manual operator playbook vs. IaC-managed tunnels vs. both.

2. **Do we expose additional MCP tools to ChatGPT (e.g., agent toolkit codemods) by default?**  
   - **Decision needed by**: Post-MVP review  
   - **Impact**: Affects allowed tool list and approval policies.

---

## Compliance Checklist

- [ ] Follows brAInwav Constitution principles.  
- [ ] Adheres to CODESTYLE.md standards.  
- [ ] RULES_OF_AI.md ethical guidelines respected.  
- [ ] No mock production claims.  
- [ ] brAInwav branding included throughout.  
- [ ] WCAG 2.2 AA accessibility requirements met.  
- [ ] Security requirements satisfied.  
- [ ] TDD approach documented in tests.  
- [ ] Local memory integration validated.

---

## Appendix

### References
- `packages/mcp-server/src/security/http-auth.ts` – Auth implementation.  
- `packages/mcp-server/src/pieces-normalizer.ts` – Pieces normalization helper.  
- `packages/mcp-server/src/index.ts` – Transport and connector wiring.  
- `config/cloudflared/mcp-tunnel.yml` – Default tunnel config.

### Glossary
- **MCP**: Model Context Protocol.  
- **A2A**: Agent-to-Agent communication.  
- **SSE**: Server-Sent Events transport for MCP.  
- **Cloudflared**: Cloudflare tunnel client used to expose local services securely.

---

**Version**: 1.0  
**Last Updated**: 2025-10-09  
**Maintained by**: brAInwav Development Team

Co-authored-by: brAInwav Development Team
