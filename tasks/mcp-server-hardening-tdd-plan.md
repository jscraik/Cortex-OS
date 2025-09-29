# mcp-server-hardening-tdd-plan.md

## Implementation Plan

### Phase 1: Test Setup
1. Create fixture helpers to spin up the FastMCP server with dependency injection for adapters.
2. Write failing async tests for knowledge search tool hitting mocked Cortex search adapter.
3. Write failing tests for memory REST routes interacting with Local Memory REST mock (store/search/get/delete).
4. Add tests for JWTAuthenticator + RateLimiter integration on REST routes.
5. Add tests for health/discovery endpoints ensuring brAInwav manifests.

### Phase 2: Core Implementation
1. Implement configuration module using `pydantic-settings` to surface backend URLs, timeouts, secrets.
2. Build CortexSearchAdapter calling configured HTTP endpoint with retries/circuit breaker.
3. Build LocalMemoryAdapter wrapping REST API (search, get, create, delete) with sanitization.
4. Refactor MCP tool registration to use adapters, ensuring functions stay ≤40 lines via helper modules.
5. Wire REST routes to adapters and ensure responses are sanitized + branded.

### Phase 3: Integration & Observability
1. Register metrics middleware, structured logging, and detailed health checks using adapter status probes.
2. Ensure list_capabilities reports dynamic tool list from registry.
3. Update deployment docs (README / DEPLOYMENT.md) to reflect new configuration knobs and setup steps.

### Technical Decisions
- Use `httpx.AsyncClient` with `tenacity` retry wrappers for outbound calls.
- Keep adapters stateless; inject via `create_server` factory for testability.
- Utilize `pytest` `AsyncClient` (httpx) for REST tests; monkeypatch adapters for deterministic assertions.
- Maintain existing JWT + rate limiting utilities instead of introducing new frameworks.
- Export named factory `create_server` and new helper `build_app` to integrate with FastMCP CLI.

## Implementation Checklist
- [x] Test scaffolding with adapter fixtures and failing tests committed.
- [x] Configuration module added with env overrides + validation.
- [x] Knowledge search adapter implemented with retries and sanitization.
- [x] Local Memory adapter implemented for persistent CRUD.
- [x] MCP tool registration refactored to call adapters.
- [x] REST routes refactored + secured.
- [x] Health/metrics/discovery updated for real status.
- [x] Documentation updated (README, DEPLOYMENT, CHANGELOG, website README).
- [x] Tests green via `pnpm test:smart` (or focused equivalent) and coverage reports updated.
- [ ] Task artifacts archived per workflow.
