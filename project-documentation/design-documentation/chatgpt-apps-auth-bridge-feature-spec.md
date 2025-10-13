# Feature Specification: ChatGPT Apps SDK OAuth Bridge for Cortex MCP

**Task ID**: `FEAT-CHATGPT-AUTH-BRIDGE`
**Feature Branch**: `feature/FEAT-CHATGPT-AUTH-BRIDGE`
**Created**: 2025-10-13
**Status**: Draft
**Priority**: P1
**Assignee**: `jamiescottcraik`

**User Request**:
> Plan the implementation of a secure token-sharing bridge so that ChatGPT Apps SDK OAuth tokens can be reused inside Cortex-OS MCP without forcing users to re-authenticate.

---

## Executive Summary

This feature introduces an OAuth 2.1 bridge between ChatGPT Apps SDK sessions and the Cortex-OS MCP server. By publishing Protected Resource Metadata (PRM), verifying bearer tokens on every MCP call, and projecting JWT claims into Cortex-OS identities, we provide seamless single sign-on, enforce scoped permissions, and preserve auditability for agent actions triggered through ChatGPT.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1: Seamless Auth Context Handoff (Priority: P0)

**As a** signed-in ChatGPT Apps SDK user invoking Cortex MCP tools,
**I want to** have my OAuth session reused within Cortex-OS,
**So that** I can execute authorized actions without repeating login challenges.

**Why This Priority**: Without this bridge, every MCP call would fail or require manual token pasting, making ChatGPT integrations unusable and blocking security compliance.

**Independent Test Criteria**:
Validated by running an Apps SDK simulated call against the MCP server and confirming a successful 200 response with the expected Cortex identity resolved.

**Acceptance Scenarios**:

1. **Given** a valid OAuth access token issued by the trusted authorization server,
   **When** ChatGPT invokes an MCP tool with `Authorization: Bearer <token>`,
   **Then** the Cortex MCP server verifies the token using JWKS,
   **And** attaches `cortexIdentity.userId` and scoped roles to the request context.

2. **Given** a user whose scopes include `cortex.tools.write:mail`,
   **When** they invoke the `send_mail` MCP tool,
   **Then** the scope gate permits execution,
   **And** the audit log records the identity, scope, and tool name with brAInwav branding.

**brAInwav Branding Requirements**:
- Audit logs must prefix entries with `brAInwav-auth-bridge` and include the oversight ID from the latest `vibe_check` gate.

---

### User Story 2: Scoped Authorization Enforcement (Priority: P1)

**As a** Cortex-OS security engineer,
**I want to** ensure MCP tools enforce least-privilege scopes,
**So that** sensitive actions are guarded by explicit authorization policies.

**Why This Priority**: Scope enforcement is essential for compliance and prevents privilege escalation through generic access tokens.

**Independent Test Criteria**:
Execute each MCP tool with and without the required scopes using mocked JWT claims to confirm 403 responses on insufficient scopes.

**Acceptance Scenarios**:

1. **Given** a JWT missing the `cortex.mem.write` scope,
   **When** the user invokes a memory mutation tool,
   **Then** the request is rejected with a 403 MCPError containing `insufficient_scope`,
   **And** the denial is logged with brAInwav branding.

2. **Given** a JWT containing `cortex.tools.read`,
   **When** the user reads a document via MCP,
   **Then** the response succeeds,
   **And** the request trace shows the required scope satisfied.

**Dependencies**:
- Requires completion of User Story 1 to obtain validated claims before enforcing scopes.

---

### User Story 3: Operational Visibility (Priority: P2)

**As a** Cortex-OS operator,
**I want to** monitor the health of OAuth configuration and JWKS reachability,
**So that** I can diagnose authentication outages quickly.

**Why This Priority**: Observability ensures the bridge remains reliable in production without manual probing.

**Independent Test Criteria**:
Call the `/health/auth` endpoint and confirm it validates PRM and JWKS availability, returning actionable status codes.

**Acceptance Scenarios**:

1. **Given** the MCP server is running with correct auth configuration,
   **When** `/health/auth` is requested,
   **Then** it returns 200 with JSON indicating PRM and JWKS checks passed.

2. **Given** the JWKS endpoint is unreachable,
   **When** `/health/auth` is requested,
   **Then** it returns 503 with diagnostics referencing `jwks_unreachable`.

---

### Edge Cases & Error Scenarios

#### Edge Case 1: Expired or Invalid Token
**Given** an access token with an expired `exp` claim,
**When** ChatGPT calls any MCP tool,
**Then** the server responds with 401 and `token_expired`,
**And** the error payload and logs include the `brAInwav-auth-bridge` prefix without exposing raw token contents.

#### Edge Case 2: Scope Downgrade During Session
**Given** a user whose scopes were reduced after issuance,
**When** JWKS verification succeeds but the required scope is missing,
**Then** the tool returns 403 `insufficient_scope`,
**And** telemetry emits a structured event with user, scope, tool, and policy decision.

```typescript
// Example MCP Tool Guard Skeleton
export function guardTool(requiredScopes: string[], handler: ToolHandler) {
  return async (ctx: ToolContext) => {
    if (!ctx.hasScopes?.(requiredScopes)) {
      throw new MCPError('insufficient_scope');
    }
    return handler(ctx);
  };
}
```

---

## Dependencies

### Internal Dependencies (Cortex-OS packages)
- `@cortex-os/cortex-mcp` – Core MCP server that will host the auth middleware and PRM endpoint.
- `@cortex-os/cortex-logging` – Provides structured logging utilities with brAInwav branding.
- `@cortex-os/policy` – Supplies scope definitions and enforcement helpers.

### External Dependencies (npm/pypi)
- `jwks-rsa@^3.0.1` – Fetches signing keys from the authorization server.
- `jsonwebtoken@^9.0.2` – Verifies JWTs and decodes claims.
- `[IdP SDK TBD]` – Optional helper if the selected OAuth provider offers a supported client.

### Service Dependencies
- OAuth Authorization Server (e.g., Logto, Auth0, SSOReady) exposing JWKS and DCR endpoints.
- ChatGPT Apps SDK OAuth flow (PKCE + Dynamic Client Registration).
- Local Memory API for persisting audit trails if required by governance.

---

## Implementation Phases

### Phase 1: Foundation (P0 Stories)
- [ ] Publish PRM endpoint at `/.well-known/oauth-protected-resource` with authorization server metadata.
- [ ] Implement JWKS-backed bearer verifier middleware that validates `iss`, `aud`, `exp`, and `scope`.
- [ ] Map decoded claims into a `CortexIdentity` context object with user, org, and roles.
- [ ] Add unit tests covering PRM payload, JWT verification, and claim mapping logic.

### Phase 2: Enhancement (P1 Stories)
- [ ] Wrap MCP tools with reusable scope guards enforcing least privilege.
- [ ] Implement `/health/auth` diagnostic endpoint covering PRM and JWKS reachability.
- [ ] Extend logging with brAInwav-branded auth events and oversight IDs.
- [ ] Add integration tests simulating scoped and unscoped tokens.

### Phase 3: Polish (P2 Stories)
- [ ] Document configuration and troubleshooting in `packages/cortex-mcp/docs/auth.md`.
- [ ] Provide sample Apps SDK manifest entries demonstrating OAuth integration.
- [ ] Add observability dashboards or alerts for token verification failures.

---

## Success Metrics

### Quantitative
- [ ] ≥95% unit test coverage across new auth modules.
- [ ] 100% of MCP tool invocations audited with identity and scope metadata.
- [ ] JWKS fetch latency p95 ≤ 200 ms with caching.
- [ ] Zero unauthorized access events detected in simulated tests.

### Qualitative
- [ ] Code review approval with references to Constitution compliance.
- [ ] Governance checklist (/.cortex/rules/code-review-checklist.md) completed with evidence.
- [ ] brAInwav branding present in logs, errors, and documentation.
- [ ] Documentation provides clear operator guidance and remediation steps.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| JWKS endpoint outages | High | Medium | Implement caching with TTL and fallback to last-known good keys, emit `/health/auth` alerts. |
| Scope misconfiguration between ChatGPT app and Cortex-OS | Medium | High | Maintain canonical scope map in `@cortex-os/policy`, add integration tests for each scope pairing. |
| Token replay without DPoP | Medium | Medium | Evaluate IdP DPoP support; if unavailable, enforce short-lived tokens and rely on PKCE + HTTPS. |
| Logging sensitive data | High | Low | Redact tokens and PII, log only hashed subject IDs per governance policy. |

---

## Open Questions

1. **Which OAuth authorization server will back production?**: Needed to finalize issuer URI, JWKS endpoints, and client registration automation.
   - **Decision needed by**: 2025-10-20
   - **Options**: Logto, Auth0, SSOReady, existing enterprise IdP.

2. **Do we require DPoP tokens for Apps SDK traffic?**: Determines whether we must add proof-of-possession validation to the middleware.
   - **Decision needed by**: 2025-10-25
   - **Impact**: Blocks completion of verifier implementation details.

---

## Compliance Checklist

- [ ] Follows brAInwav Constitution principles
- [ ] Adheres to CODESTYLE.md standards
- [ ] RULES_OF_AI.md ethical guidelines respected
- [ ] No mock production claims
- [ ] brAInwav branding included throughout
- [ ] WCAG 2.2 AA accessibility requirements met
- [ ] Security requirements satisfied
- [ ] Test-driven development approach documented
- [ ] Local memory integration planned (if applicable)

---

## Appendix

### References
- `.cortex/templates/feature-spec-template.md`
- `docs/operators/chatgpt-connector-bridge.md`
- `README.md` (vibe_check governance overview)

### Glossary
- **PRM**: Protected Resource Metadata document describing OAuth requirements for a resource server.
- **DPoP**: Demonstration of Proof-of-Possession, an OAuth extension adding replay protection.
- **MCP**: Model Context Protocol, the tool execution interface used by Cortex-OS.

---

**Version**: 1.0
**Last Updated**: 2025-10-13
**Maintained by**: brAInwav Development Team

Co-authored-by: brAInwav Development Team
