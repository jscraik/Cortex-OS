# TDD Plan: Manifest-Driven Connectors Orchestration

**Task ID**: `connectors-manifest-runtime`
**Created**: 2025-10-10
**Status**: Draft
**Estimated Effort**: 10 working days
**PRP Integration**: Supports gates G0–G6 for connectors modernization

---

## Task Summary

Deliver a manifest-driven connectors experience: sign and publish the `/v1/connectors/service-map`, hydrate agent and MCP runtimes from that manifest, expose telemetry, and provide an operator-facing ChatGPT Apps widget. All implementations must follow strict TDD with failing tests across TypeScript and Python packages before code is written.

---

## PRP Gate Alignment

> **Integration Note**: This task aligns with PRP Runner quality gates to ensure consistent quality standards.

### Enforcement Profile Reference
- **Source**: `./enforcement-profile.yml` (default brAInwav profile)
- **Coverage Targets**:
  - Lines: 95%
  - Branches: 95%
  - Functions: 95%
  - Statements: 95%
- **Performance Budgets**:
  - LCP (Apps widget): 2500 ms
  - TBT (Apps widget): 300 ms
- **Accessibility Target**:
  - Score: 90
  - WCAG Level: AA
  - WCAG Version: 2.2
- **Security**: brAInwav Zero-Tolerance Policy
  - Critical: 0
  - High: 0
  - Medium: ≤5 (must be risk-accepted via Constitution)

### Gate Cross-References
- **G0 (Ideation)**: Spec `tasks/connectors-manifest-runtime-spec.md`
- **G1 (Architecture)**: Covered in spec architecture section; reference constitution approvals if modified.
- **G2 (Test Plan)**: This document.
- **G4 (Verification)**: Quality gates listed under Success Criteria.
- **Evidence Trail**: Link artifacts in `.cortex/evidence-index.json` after execution.

---

## Scope & Goals

### In Scope
- ✅ Create manifest schema, loader, and signer for ASBR.
- ✅ Replace ExecutionSurfaceAgent stubs with manifest-driven registry.
- ✅ Extend MCP bridge/server with connector proxies, auth headers, and telemetry.
- ✅ Implement Python connectors server, registry, tools, and ChatGPT Apps widget server.
- ✅ Ship ChatGPT Apps widget (React/Webpack) with manifest-aware hooks.
- ✅ Update docs/runbooks and package governance (AGENTS.md).
- ✅ Maintain brAInwav branding in responses, logs, metrics, and UI.

### Out of Scope
- ❌ Multi-tenant manifest overrides (future iteration).
- ❌ Connector-specific credential management (handled by ops pipelines).
- ❌ RAG/Memory feature development beyond wrapping existing APIs.

### Success Criteria
1. All new tests pass (RED→GREEN) with ≥95% coverage.
2. Quality gates: `pnpm lint`, `pnpm test`, `pnpm security:scan`, `pnpm structure:validate`, `uv run pytest` succeed.
3. Performance budgets for Apps widget satisfied (LCP ≤2500 ms, TBT ≤300 ms using synthetic bundle smoke test).
4. Accessibility audits via `jest-axe` and keyboard navigation tests pass.
5. Security scans report zero critical/high findings.
6. Constitution compliance recorded; Governance Pack references cited in PR description.
7. Evidence for memory logging updates captured per `.github/instructions/memories.instructions.md`.

---

## Prerequisites & Dependencies

### Required Research
- [x] Research document completed: `project-documentation/connectors/manifest-runtime-research.md`.
- [x] Approach defined in feature spec.
- [ ] Open questions from spec resolved (schema sharing, secrets distribution).

### Internal Dependencies
- **Package**: `@cortex-os/asbr` – exposes signed service map.
- **Package**: `@cortex-os/agents` – consumes connectors map via registry.
- **Package**: `@cortex-os/mcp-bridge` – remote proxy enhancements.
- **Package**: `@cortex-os/mcp-server` – connector proxy lifecycle.
- **Package**: `@cortex-os/agent-toolkit` (optional) – manifest lint helpers if needed.

### External Dependencies
- **Library**: `openai-agents>=0.3.3` – Official OpenAI Agents SDK (Python) for MCP server integration – MIT license.
- **Library**: `pydantic-settings>=2.5` – Python config validation – MIT license.
- **Library**: `httpx>=0.27` – Python HTTP client – BSD-3-Clause.
- **Library**: `starlette>=0.37` / `uvicorn>=0.30` – Async server – BSD/3-Clause.
- **Library**: `react@18`, `react-dom@18`, `webpack@5`, `webpack-dev-server@5`, `babel-loader@9` – Apps widget – MIT license.
- **Library**: `@openai/apps-sdk` – JavaScript SDK for ChatGPT Apps integration – MIT license.

### Environment Setup
```bash
pnpm install
uv sync
pnpm --filter apps/chatgpt-dashboard install
```
Ensure `CONNECTORS_SIGNATURE_KEY`, `CONNECTORS_MANIFEST_PATH`, `CONNECTORS_API_KEY`, and `MCP_API_KEY` are exported (use 1Password CLI per docs).

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: Author the following tests and ensure they fail before writing implementation code.

### Phase 1: Unit Tests (Write First)

#### Test Suite 1: Service Map Loader & Signer
**File**: `packages/asbr/tests/connectors.service-map.test.ts`

**Test Cases**:
1. `should sign manifest payload deterministically with CONNECTORS_SIGNATURE_KEY`
   - **Given** fixture manifest JSON, fixed clock, secret key
   - **When** loader builds service map
   - **Then** ULID id and signature match snapshot; response includes `brand:"brAInwav"`.

2. `should throw branded error when manifest missing`
   - **Given** manifest path that does not exist
   - **When** loader initializes
   - **Then** error message includes manifest path and brAInwav branding.

3. `should mark disabled entries accordingly`
   - **Given** manifest entry with `enabled:false`
   - **When** loader runs
   - **Then** service map marks status disabled and TTL countdown value.

#### Test Suite 2: Connectors Registry (Agents)
**File**: `packages/agents/src/connectors/__tests__/registry.test.ts`

**Test Cases**:
1. `should hydrate RemoteToolProxy for enabled connectors`
2. `should fall back gracefully when ASBR returns disabled connector`
3. `should emit telemetry and cache map respecting ttl`

#### Test Suite 3: MCP Bridge Remote Proxy Enhancements
**File**: `packages/mcp-bridge/src/__tests__/remote-proxy.connectors.test.ts`

**Test Cases**:
1. `should attach manifest-specified auth headers on requests`
2. `should emit brainwav_mcp_connector_proxy_up gauge transitions`
3. `should trigger availability callback on transport failure`

#### Test Suite 4: Python Connectors Registry
**File**: `packages/connectors/tests/test_registry.py`

**Test Cases**:
1. `test_manifest_loads_and_validates`
2. `test_registry_registers_tools_from_manifest_via_openai_agents`
3. `test_rejects_request_without_api_key`

#### Test Suite 5: ChatGPT Apps Hook
**File**: `apps/chatgpt-dashboard/src/hooks/__tests__/useConnectorState.test.tsx`

**Test Cases**:
1. `should initialize OpenAI Apps SDK client and fetch connector map, exposing statuses`
2. `should surface branded error when Apps SDK call rejects`
3. `should respect manifest TTL, refresh via Apps SDK, and abort prior request`

### Phase 2: Integration Tests (Write First)

#### Integration Test 1: MCP Server Connectors Wiring
**File**: `packages/mcp-server/src/__tests__/connectors.integration.test.ts`

**Scenario**: Confirm connectors proxy bootstrap registers tools and handles offline connectors.

**Test Cases**:
1. `should register connector tools with branded descriptions`
2. `should emit offline fallback metric when connector unavailable`

#### Integration Test 2: ASBR HTTP Route
**File**: `packages/asbr/tests/connectors.service-map.http.test.ts`

**Test Cases**:
1. `GET /v1/connectors/service-map returns signed payload`
2. `GET /v1/connectors/service-map fails with 503 when manifest missing`

#### Integration Test 3: Python Server ↔ ASBR Parity
**File**: `packages/connectors/tests/test_service_map_export.py`

**Test Cases**:
1. `test_export_matches_asbr_signature`
2. `test_offline_connector_returns_brand_message`

### Phase 3: End-to-End Tests (Write First)

#### E2E Test 1: ChatGPT Apps Widget Journey
**File**: `apps/chatgpt-dashboard/src/__tests__/widget.e2e.test.ts`

**User Story**: Mirrors User Story 3 from spec.

**Test Cases**:
1. `should render connector list using OpenAI Apps SDK session and allow sample action trigger`
2. `should display troubleshooting card when Apps SDK manifest fetch fails`

#### E2E Test 2: Connectors Server Smoke Test
**File**: `packages/connectors/tests/test_server_e2e.py`

**Test Cases**:
1. `test_sse_streams_events_with_auth`
2. `test_http_route_serves_apps_bundle`

### Phase 4: Accessibility Tests (UI)

**File**: `apps/chatgpt-dashboard/src/__tests__/widget.a11y.test.tsx`

**Test Cases**:
1. `should pass axe accessibility audit`
2. `should be keyboard navigable for connector cards`
3. `should expose aria-live updates for status changes`

### Phase 5: Security Tests

**File**: `packages/mcp-bridge/src/__tests__/remote-proxy.security.test.ts`

**Test Cases**:
1. `should reject proxy requests without connector auth config`
2. `should mask secrets in error logs`

**File**: `packages/connectors/tests/test_security.py`

**Test Cases**:
1. `test_missing_api_key_returns_401`
2. `test_invalid_signature_rejected`

### Phase 6: Performance Tests (Optional, Apps)

**File**: `apps/chatgpt-dashboard/src/__tests__/widget.perf.test.ts`

**Test Cases**:
1. `should hydrate state under 500 ms with mock data`
2. `should lazy-load charts without blocking main thread`

---

## Implementation Checklist

> Follow phases in order. Move to next phase only after tests turn GREEN.

### Phase 0: Setup & Scaffolding
- [ ] Add `config/connectors.manifest.json` sample and JSON schema.
- [ ] Scaffold `packages/connectors` Python package (pyproject, src/, tests/).
- [ ] Create `apps/chatgpt-dashboard` React project with Webpack integration (package.json, tsconfig, project.json, webpack config).
- [ ] Add package-level `AGENTS.md` and README updates for new packages.
- [ ] Update Justfile and scripts to run connectors server/tests.

### Phase 1: Write Failing Tests (RED)
- [ ] `packages/asbr/tests/connectors.service-map.test.ts`
- [ ] `packages/asbr/tests/connectors.service-map.http.test.ts`
- [ ] `packages/agents/src/connectors/__tests__/registry.test.ts`
- [ ] `packages/mcp-bridge/src/__tests__/remote-proxy.connectors.test.ts`
- [ ] `packages/mcp-bridge/src/__tests__/remote-proxy.security.test.ts`
- [ ] `packages/mcp-server/src/__tests__/connectors.integration.test.ts`
- [ ] `packages/connectors/tests/test_registry.py`
- [ ] `packages/connectors/tests/test_service_map_export.py`
- [ ] `packages/connectors/tests/test_server_e2e.py`
- [ ] `apps/chatgpt-dashboard/src/hooks/__tests__/useConnectorState.test.tsx`
- [ ] `apps/chatgpt-dashboard/src/__tests__/widget.e2e.test.ts`
- [ ] `apps/chatgpt-dashboard/src/__tests__/widget.a11y.test.tsx`
- [ ] `apps/chatgpt-dashboard/src/__tests__/widget.perf.test.ts`
- [ ] Confirm entire suite runs and fails for expected reasons.

### Phase 2: Minimal Implementation (GREEN)
- [ ] Implement manifest loader & signer (ASBR).
- [ ] Wire `/v1/connectors/service-map` route to loader.
- [ ] Build connectors registry in agents package with caching, telemetry, error handling.
- [ ] Enhance MCP bridge remote proxy with auth headers, callbacks, metrics.
- [ ] Add MCP server connectors proxy bootstrap and lifecycle management.
- [ ] Implement Python connectors registry + server (auth, SSE, bundle serving).
- [ ] Implement ChatGPT Apps widget and hooks wired to the OpenAI Apps SDK client.
- [ ] Ensure all tests pass (GREEN) locally.

### Phase 3: Refactor (Keep GREEN)
- [ ] Extract shared manifest validation utilities to avoid duplication.
- [ ] Enforce ≤40 lines/function; add guard clauses and abort controller support.
- [ ] Optimize logging/telemetry to avoid noise; confirm metrics naming conventions.
- [ ] Update documentation: operator guide, connectors README, connectors server README.

### Phase 4: Verification & Evidence
- [ ] Run `pnpm build:smart && pnpm test:smart && pnpm lint:smart && pnpm typecheck:smart`.
- [ ] Run `pnpm security:scan` and `pnpm structure:validate` with connectors scope.
- [ ] Run `uv run pytest packages/connectors/tests`.
- [ ] Run `pnpm --filter apps/chatgpt-dashboard build && pnpm --filter apps/chatgpt-dashboard test`.
- [ ] Capture logs/screenshots for evidence; update `.cortex/evidence-index.json`.
- [ ] Update `.github/instructions/memories.instructions.md` per memory mandate.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Diverging manifest schemas (TS vs Python) | High | Medium | Generate canonical JSON schema during build; add CI check comparing outputs. |
| Slow Apps widget bundle increasing LCP | Medium | Medium | Enable code splitting, lazy-load heavy charts, monitor bundle size in CI. |
| Connector auth misconfiguration | High | Medium | Provide configuration validation and fail-fast boot sequence with actionable errors. |
| Test flakiness in SSE integrations | Medium | Medium | Use deterministic fixtures, increase timeouts with jest fake timers, and add retries for SSE tests only. |
| Telemetry metrics collision | Medium | Low | Namespaced metrics with `brainwav_` prefix and include connector label; add unit assertions. |

---

## Success Criteria Validation

- All checklist items marked complete with evidence references.
- Coverage reports uploaded and linked in PR (≥95% lines/branches).
- Performance & accessibility tests automated and included in CI summary.
- Governance references cited in PR: `/.cortex/rules/agentic-coding-workflow.md` §3, `/CODESTYLE.md` §2, `packages/*/AGENTS.md` front-matter.
- Review sign-off includes filled CI checklist.
