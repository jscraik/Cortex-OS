# Implementation Plan: Manifest-Driven Connectors Orchestration

**Task ID**: `connectors-manifest-runtime`
**Feature Branch**: `feature/connectors-manifest-runtime`
**Created**: 2025-10-10
**Status**: Draft
**Priority**: P1
**Assignee**: @jamiecraik

**User Request**:
> Replace the empty connector map with a manifest-driven, signed payload, wire MCP proxies across runtimes, surface telemetry, and ship operator docs plus a ChatGPT Apps widget for the new connectors server.

---

## Executive Summary

Manifest-driven connectors will allow Cortex-OS to expose real, signed metadata about external tools, hydrate runtime agents from a single source of truth, and ship a UI that operators can use inside ChatGPT Apps. This feature establishes a shared manifest, signs responses from ASBR, boots Python-based MCP connectors, and threads availability telemetry into the MCP bridge. Operators and agents gain deterministic discovery, stronger auth, and clearer runbooks.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: Receive Signed Connector Map (Priority: P0)

**As an** operator integrating Cortex-OS with external services,
**I want to** fetch a signed `/v1/connectors/service-map` payload that matches the manifest,
**So that** I can validate availability and route traffic confidently.

**Why This Priority**: Without a populated, signed service map, downstream agents and tooling cannot trust connector metadata; shipping this unblocks all other work.

**Independent Test Criteria**:
The ASBR endpoint can be hit independently, returning non-empty connectors with valid signature and TTL; verifying the signature yields value even before other components ship.

**Acceptance Scenarios**:

1. **Given** CONNECTORS_SIGNATURE_KEY is configured and the manifest exists
   **When** an authenticated client calls `GET /v1/connectors/service-map`
   **Then** the response contains `id`, `generatedAt`, `ttlSeconds`, `signature`, and at least one connector entry with scopes, headers, and status
   **And** the signature validates against the configured key using the published algorithm.

2. **Given** the manifest contains a disabled connector entry
   **When** the endpoint is called
   **Then** that connector appears with `enabled: false` and an explanatory status message branded with brAInwav context.

**brAInwav Branding Requirements**:
- Responses must include `brand: "brAInwav"` in metadata objects and error payloads.

---

### User Story 2: Hydrate Agents from Manifest (Priority: P1)

**As an** ExecutionSurfaceAgent maintainer,
**I want to** load connector definitions from the ASBR service map and hydrate RemoteToolProxy instances dynamically,
**So that** agents can reach real tools without hard-coded stubs.

**Why This Priority**: Agents currently ship placeholders; dynamic hydration is critical to deliver actual value to end users.

**Independent Test Criteria**:
The agents package can run unit tests that stub the ASBR response and verify proxies execute, failover, and log telemetry without relying on the Python server.

**Acceptance Scenarios**:

1. **Given** ASBR returns a connector map with two enabled connectors
   **When** the ExecutionSurfaceAgent boots
   **Then** it registers corresponding RemoteToolProxy instances and exposes them through the allowed surfaces list.

2. **Given** ASBR marks a connector as disabled or unreachable
   **When** the agent attempts execution
   **Then** it emits a branded error that references the connector id and respects fallback policies without crashing.

**Dependencies**:
- Requires Story 1 to provide the signed map contract.

---

### User Story 3: Monitor Connectors via ChatGPT Apps Widget (Priority: P2)

**As a** platform operator using ChatGPT Apps,
**I want to** load a dashboard widget that visualizes connector health and lets me trigger sample tool invocations,
**So that** I can validate setup without leaving ChatGPT.

**Why This Priority**: Enhances usability but is not blocking the core runtime integration.

**Independent Test Criteria**:
The Apps bundle can be served locally and renders connector status using mocked or real manifest data, independently of production rollout.

**Acceptance Scenarios**:

1. **Given** the connectors server is running with built assets
   **When** the ChatGPT Apps widget loads inside the Apps runtime
   **Then** it fetches the connector map via `window.openai` client, displays availability state, and surfaces branded errors on failure.

2. **Given** the bundle is missing or outdated
   **When** an operator navigates to the widget endpoint
   **Then** the server responds with a branded troubleshooting page instructing how to rebuild the assets.

---

### Edge Cases & Error Scenarios

#### Edge Case 1: Missing Manifest File
**Given** CONNECTORS_MANIFEST_PATH points to a nonexistent file
**When** ASBR or the Python connectors server starts
**Then** the service fails fast with a `brand:"brAInwav"` error, logs the path, and exits with a non-zero status code.

#### Edge Case 2: Signature Secret Rotated Mid-Request
**Given** a new CONNECTORS_SIGNATURE_KEY is deployed while a service map response is cached
**When** a consumer validates the signature with the new key
**Then** validation fails gracefully, emits metric increments, and instructs clients to refetch after TTL expiry.

---

## Requirements *(mandatory)*

### Functional Requirements

1. **[FR-001]** Populate `/v1/connectors/service-map` with manifest-derived entries signed via CONNECTORS_SIGNATURE_KEY.
   - **Rationale**: Provides a trustworthy discovery channel shared by all runtimes.
   - **Validation**: Unit and integration tests verify schema conformity and signature determinism.

2. **[FR-002]** Hydrate ExecutionSurfaceAgent connectors through a typed registry that consumes the ASBR map and executes via MCP bridge proxies.
   - **Rationale**: Removes stubbed logic and enables real tool execution.
   - **Validation**: Agents unit tests simulate enabled/disabled connectors and assert proxy invocation.

3. **[FR-003]** Launch a Python-based connectors server that proxies manifest-defined MCP tools (via the official OpenAI Agents SDK) and serves the ChatGPT Apps widget.
   - **Rationale**: Supplies MCP transport plumbing and UI entry point for operators.
   - **Validation**: Pytest suites cover registry loading, signature parity, HTTP auth enforcement, and the React widget exercises the OpenAI Apps SDK end-to-end.

4. **[FR-004]** Emit `brainwav_mcp_connector_proxy_up{connector=...}` metrics and structured logs from the MCP bridge for each connector.
   - **Rationale**: Ensures observability and quick outage detection.
   - **Validation**: Telemetry tests assert metric registration and state changes on proxy reconnect.

### Non-Functional Requirements

#### Performance
- **[NFR-P-001]** Service map route must respond within 200ms p95 under 10 concurrent requests (measured locally with cached manifest).

#### Security
- **[NFR-S-001]** Must pass `pnpm security:scan` with zero high severity findings.
- **[NFR-S-002]** Connectors server enforces API-key auth on all routes by default; local bypass requires explicit `NO_AUTH=true` flag.
- **[NFR-S-003]** Signatures use HMAC-SHA256 with keys sourced from secret management; no secrets hard-coded.

#### Accessibility (WCAG 2.2 AA)
- **[NFR-A-001]** ChatGPT Apps widget actions are keyboard navigable and announce state changes to screen readers.
- **[NFR-A-002]** Visual elements maintain ≥ 4.5:1 contrast.
- **[NFR-A-003]** Provide aria labels for connector status pills.
- **[NFR-A-004]** Include branded error region with role="alert" for failures.
- **[NFR-A-005]** Axe audits pass in CI.

#### Testing
- **[NFR-T-001]** Maintain ≥90% coverage in each affected package (TypeScript & Python) with changed-line coverage ≥95%.
- **[NFR-T-002]** Follow TDD: write failing tests before implementation.
- **[NFR-T-003]** Add integration tests for MCP server connector registration and ASBR route.
- **[NFR-T-004]** Include property-based tests for manifest validation where practical (e.g., TTL boundaries).

#### Observability
- **[NFR-O-001]** Emit OpenTelemetry spans (`component=connectors`) for manifest loading, signing, registry hydration, and proxy calls.
- **[NFR-O-002]** Log structured events containing `brand:"brAInwav"`, `connectorId`, and `trace_id`.
- **[NFR-O-003]** Register Prometheus gauge `brainwav_mcp_connector_proxy_up` with `connector` label.
- **[NFR-O-004]** Record manifest version in metrics/logs for troubleshooting.

---

## Technical Constraints

### Must Use
- Named exports only in TypeScript modules.
- Async/await patterns across Node services.
- Zod for manifest/type validation in TypeScript.
- Pydantic models for manifest validation in Python.
- brAInwav branding fields in responses, logs, and metrics labels.

### Must Avoid
- Default exports in TypeScript/JavaScript.
- Placeholder implementations in production routes.
- TODO/FIXME/HACK comments outside TODO backlog files.
- Direct cross-domain imports; use HTTP/MCP contracts and published packages.
- Unpinned dependencies or network calls without timeouts.

### Integration Points
- **MCP Tools**: Register per-connector tools via openai-agents `MCPServer`. ExecutionSurfaceAgent consumes them via MCP bridge.
- **A2A Events**: None introduced; future enhancements may emit health topics.
- **Databases**: None new; rely on manifest + HTTP endpoints.
- **External APIs**: Connector endpoints defined in manifest (OpenAI, proprietary vendor APIs, etc.).

---

## Architecture & Design

### System Components
```
┌────────────────────┐      ┌─────────────────────┐      ┌────────────────────────┐
│ config/connectors. │      │ ASBR Service Map    │      │ ExecutionSurfaceAgent   │
│ manifest.json      │ ───→ │ Loader & Signer     │ ───→ │ Connectors Registry     │
└────────────────────┘      └─────────┬───────────┘      └──────────────┬─────────┘
                                      │                                  │
                                      │                                  │
                           ┌──────────▼─────────┐          ┌─────────────▼──────────┐
                           │ MCP Server Proxies │ ◄─────── │ MCP Bridge RemoteProxy │
                           │ (connectors server)│          └─────────────┬──────────┘
                           └──────────┬─────────┘                        │
                                      │                                  │
                           ┌──────────▼─────────┐          ┌─────────────▼──────────┐
                           │ ChatGPT Apps Widget│          │ Telemetry / Metrics     │
                           └────────────────────┘          └────────────────────────┘
```

The ChatGPT Apps widget integrates with the official OpenAI Apps SDK (`@openai/apps-sdk`) to call connector tools and render status updates inside ChatGPT while consuming the signed manifest.

### Data Model
```typescript
export const connectorEntrySchema = z.object({
  id: z.string().min(1),
  version: z.string(),
  displayName: z.string(),
  endpoint: z.string().url(),
  auth: z.object({
    type: z.enum(['apiKey', 'bearer', 'none']),
    headerName: z.string().optional(),
  }),
  scopes: z.array(z.string().min(1)).min(1),
  ttlSeconds: z.number().int().positive(),
  quotas: z.object({
    perMinute: z.number().int().positive(),
    perHour: z.number().int().positive(),
  }),
  enabled: z.boolean().default(true),
  metadata: z.object({ brand: z.literal('brAInwav') }).passthrough(),
});
```

### API Contracts
```typescript
export const serviceMapResponseSchema = z.object({
  id: ulidSchema,
  brand: z.literal('brAInwav'),
  generatedAt: z.string().datetime(),
  ttlSeconds: z.number().int().positive(),
  connectors: z.array(connectorEntrySchema),
  signature: z.string().min(1),
});

export type ServiceMapResponse = z.infer<typeof serviceMapResponseSchema>;
```

---

## Dependencies

### Internal Dependencies (Cortex-OS packages)
- `@cortex-os/asbr` – Hosts the signed service map endpoint.
- `@cortex-os/agents` – Hydrates ExecutionSurfaceAgent from connector map.
- `@cortex-os/mcp-server` – Registers connector proxies and exposes MCP tools.
- `@cortex-os/mcp-bridge` – Provides RemoteToolProxy with header/metrics enhancements.

### External Dependencies (npm/pypi)
- `openai-agents>=0.3.3` – Official OpenAI Agents SDK (Python) for MCP transport & registration.
- `pydantic-settings>=2.5` – Manifest/env validation in Python runtime.
- `httpx>=0.27` – HTTP client for connector calls.
- `starlette>=0.37` & `uvicorn>=0.30` – Async server for connectors HTTP/SSE endpoints.
- `react@18`, `react-dom@18`, `webpack@5`, `webpack-dev-server@5`, `babel-loader@9` – ChatGPT Apps widget front-end toolchain.
- `@openai/apps-sdk` (latest) – Official OpenAI Apps SDK used by the React widget to interact with ChatGPT Apps runtime.

### Service Dependencies
- ASBR HTTP surface at `https://<host>/v1/connectors/service-map`.
- MCP bridge service for RemoteToolProxy connections.
- Manifest-defined external APIs (OpenAI, Memory API, Tasks API, etc.).

---

## Implementation Phases

### Phase 1: Foundation (P0/P1 Stories)
- [ ] Create manifest schema (TypeScript & JSON) and sample `config/connectors.manifest.json`.
- [ ] Implement ASBR service map loader, signer, and endpoint integration.
- [ ] Add unit/integration tests for manifest parsing and signatures.
- [ ] Update ExecutionSurfaceAgent to consume the manifest via registry with tests.

### Phase 2: Enhancement (P1/P2 Stories)
- [ ] Scaffold Python connectors package, registry, and tests.
- [ ] Wire MCP server proxies and metrics.
- [ ] Extend MCP bridge with auth headers and telemetry gauge.
- [ ] Provide docs/runbooks describing configuration and rollout.

### Phase 3: Polish (P2 Stories)
- [ ] Build ChatGPT Apps widget and integration tests (a11y, unit, e2e via Apps harness).
- [ ] Add CLI/script to launch connectors server with bundle verification.
- [ ] Finalize operator documentation and dashboards.

---

## Success Metrics

### Quantitative
- [ ] ≥90% coverage (lines/statements) across modified packages (`asbr`, `agents`, `mcp-bridge`, `mcp-server`, `connectors`, `apps/chatgpt-dashboard`).
- [ ] All quality gates pass (`lint`, `typecheck`, `test`, `security:scan`, `structure:validate`).
- [ ] Service map latency ≤200ms p95 under load test.
- [ ] Prometheus gauge populated for every manifest-defined connector.
- [ ] Zero critical/high findings in security scans.

### Qualitative
- [ ] Code review signed off citing Governance Pack and CODESTYLE sections.
- [ ] Constitution compliance recorded in evidence checklist.
- [ ] Operator runbook updated with manifest/signature instructions.
- [ ] ChatGPT Apps widget passes manual QA for keyboard navigation and screen readers.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Manifest drift between TypeScript and Python schemas | High | Medium | Generate shared JSON schema, add CI lint comparing manifest validation outputs. |
| External connector outage | Medium | High | Implement retries, expose metrics, and surface disabled state in registry/UI. |
| Signature key misconfiguration | High | Medium | Fail fast on startup, document env requirements, add health check alert when signature missing. |
| Apps bundle not built before deployment | Medium | Medium | Startup script verifies bundle presence and logs actionable errors. |
| Security regressions from new proxies | High | Low | Enforce API key auth, use httpx timeouts, run Semgrep/gitleaks in CI. |

---

## Open Questions

1. **Where should the shared manifest schema live for reuse across Node and Python?**
   - **Decision needed by**: 2025-10-15
   - **Options**: (a) Generate JSON schema from Zod and import in Python, (b) Maintain hand-written JSON schema committed in `schemas/`.

2. **How will we distribute connector-specific secrets (API keys) to the Python connectors server?**
   - **Decision needed by**: 2025-10-18
   - **Impact**: Blocks deployment automation; options include 1Password env bundles or dedicated secret manager entries.

---
