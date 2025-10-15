# ChatGPT Apps OAuth Bridge Implementation Plan

## 1. Context
- **Driver:** Align Cortex MCP with ChatGPT Apps SDK OAuth 2.1 + PKCE so signed-in ChatGPT users inherit their Cortex-OS agent identity without a second login.
- **Inputs:** Slack request 2025-10-13 (current thread), root governance (§2 templates), package auth docs, existing ChatGPT integration guide.
- **Scope:** `packages/cortex-mcp` (FastMCP server) plus accompanying tests/docs. No downstream package changes in this plan.

## 2. Goals & Non-Goals
### Goals
1. Publish Protected Resource Metadata (PRM) at `/.well-known/oauth-protected-resource` that enumerates issuer(s), resource identifier, token formats, and supported scopes.
2. Accept and verify OAuth 2.1 access tokens on every MCP tool invocation using JWKS, audience/issuer checks, expiration, and scope validation.
3. Project verified token claims into a Cortex identity context (user, org/tenant, roles) exposed to tool handlers for authorization and auditing.
4. Enforce scope/role gates on tool registrations and surface precise 401/403 errors with audit logging.
5. Ship unit tests covering PRM output, token verification happy/error paths, and identity mapping decisions.
6. Add a lightweight `/health/auth` probe confirming PRM availability and JWKS reachability.

### Non-Goals
- Designing tenant onboarding UX or OAuth consent screens (owned by IdP / ChatGPT Apps).
- Implementing token minting or refresh endpoints (handled by IdP).
- Broader RBAC refactors outside MCP middleware.

## 3. Dependencies & Contracts
- **Identity Provider:** configurable issuer (initially staging IdP) exposing JWKS; plan to store issuer/audience in config.
- **ChatGPT Apps SDK:** consumes PRM for Dynamic Client Registration; expect bearer tokens via `Authorization: Bearer <JWT>`.
- **Cortex Identity Model:** leverage existing Cortex-OS identity/role definitions (confirm module exports in `src/auth` or adjacent).
- **Docs:** update `packages/cortex-mcp/CHATGPT_INTEGRATION_GUIDE.md` and package README once implementation lands.

## 4. Implementation Steps
1. **PRM Endpoint**
   - Add `src/auth/prm.ts` (Express/Fastify handler) returning metadata per OAuth 2.1 Protected Resource spec.
   - Wire route in server bootstrap (`src/server.ts`) under `/.well-known/oauth-protected-resource`.
   - Configuration: read issuer list, resource identifier (audience), and scope catalogue from env or config file.
2. **Token Verification Utility**
   - Introduce `src/auth/verifier.ts` with JWKS caching (use `jose` for JWT verification and JWKS support, as it is actively maintained and widely adopted), verifying `iss`, `aud`, `exp`, `nbf`, `scope`.
   - Expose helper `requireScopes(claims, requiredScopes)` returning boolean / throwing typed error.
   - Consider pluggable DPoP validation hook (stub with TODO if IdP not ready).
3. **Identity Projection**
   - Create `src/auth/context.ts` to translate JWT claims (`sub`, `email`, `org`, `roles`, `scope`) to `CortexIdentity` interface.
   - Persist context on request (e.g., `req.cortexIdentity`) with typed accessor for tools.
4. **Middleware Integration**
   - In `src/server.ts`, register middleware that:
     - Extracts `Authorization` header, validates token via verifier.
     - Attaches identity + scope checker to request.
     - Handles failure with structured 401 (missing/invalid) or 403 (insufficient scope) responses and logs sanitized event (sub, scope, tool, decision).
   - Ensure MCP tool registry reads scope guard (wrap registration helper or add decorator).
5. **Health Probe**
   - Add `/health/auth` endpoint performing:
     - Local PRM schema sanity check.
     - JWKS reachability (HEAD/GET) with timeout & cached status.
6. **Testing**
   - Unit tests in `tests/auth.prm.test.ts`, `tests/auth.verifier.test.ts`, `tests/auth.mapping.test.ts`.
   - Mock JWKS using local key pair; include failure cases (bad signature, audience mismatch, expired token, missing scope).
   - Integration-style test ensuring middleware rejects missing tokens and allows valid ones with required scope.
7. **Observability & Docs**
   - Extend logging config to tag auth decisions with `auth_source=chatgpt-apps`, `brAInwav` branding.
   - Update README + `CHATGPT_INTEGRATION_GUIDE.md` describing new endpoints, config env vars, required scopes.
   - Capture threat-model deltas in `docs/` as follow-up.

## 5. Risk Mitigation
- Cache JWKS with TTL to avoid per-request fetches; include fallback for rotation.
- Harden scope parser against wildcards (`write:*`) by normalizing claims.
- Ensure middleware fails closed when config missing (startup guard).
- Add feature flag to allow staged rollout (e.g., `CHATGPT_OAUTH_BRIDGE_ENABLED`).

## 6. Open Questions / Follow-Ups
- Confirm exact IdP issuer URL(s) and whether multiple tenants needed.
- Determine DPoP requirement from security review.
- Align Cortex identity schema with other packages (consider sharing types).
- Decide on storing oversight ID from `vibe_check` in audit logs (CI expectation?).
- Schedule TDD plan and feature spec drafts referencing `/.cortex/templates/feature-spec-template.md` and `/.cortex/templates/tdd-plan-template.md` before coding.

## 7. Evidence & Next Steps
- Oversight: `vibe_check` session `chatgpt-auth-bridge-plan` logged 2025-10-13 verifying plan alignment.
- Proceed to author feature spec + TDD plan per governance, then implement in small PRs with coverage ≥95% on changed files.

## 8. Verification Summary — 2025-10-14
- ✅ Automated suites  
  `uv run pytest packages/cortex-mcp/tests/test_oauth_bridge.py packages/cortex-mcp/tests/test_server_integration.py packages/cortex-mcp/tests/test_discovery_route.py`
- ✅ Health evidence  
  Saved `/health/auth` response and PRM payload under `~/tasks/chatgpt-apps-oauth-bridge/verification/`.
- ✅ Documentation  
  README + ChatGPT integration guide updated with OAuth env vars, PRM endpoint, and `/health/auth` dashboards.
- ✅ Oversight  
  Logged `vibe_check` response at `verification/vibe-check-response.json` (session: `chatgpt-apps-oauth-bridge`).
- 🔄 Ops follow-up  
  Instrument `/health/auth` in Grafana panel `mcp-auth-health` and confirm JWKS probe alerts (owner: Ops SRE, due 2025-10-17).
