# Cortex-OS MCP Ecosystem Code Review

_Compliance baseline for the Python (`packages/cortex-mcp`) and TypeScript (`packages/mcp`, `packages/mcp-server`) components against `AGENTS.md` and `vision.md`._

## 1. Author Preparation
- [ ] **Self-review completed?** – Not evaluated (repository baseline, no PR evidence).
- [ ] **Small, focused change?** – Not evaluated.

## 2. Implementation & Design
- [ ] **Does it accomplish the requirement?** – The Python HTTP client does not attach the MCP API key header required by the FastMCP server, so authenticated requests to the unified hub will fail, violating the single-hub contract from the vision document.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L140】【F:packages/mcp-server/src/security/http-auth.ts†L40-L200】【F:.cortex/rules/vision.md†L18-L43】
- [ ] **Is the solution as simple as possible?** – The TypeScript `AuthServer` extends the base server but duplicates CORS/ratelimit/auth logic without integrating with FastMCP; meanwhile the Python client reimplements routing instead of reusing published SDK helpers, indicating opportunity to consolidate around the shared FastMCP server API.【F:packages/mcp/src/server/auth-server.ts†L20-L276】【F:packages/mcp-server/src/server/mcp-server.ts†L1-L53】
- [ ] **Dependencies & abstraction:** – FastMCP-based server already exists in `packages/mcp-server`; however, the base `packages/mcp` server advertises STDIO-only transport and lacks HTTP/SSE endpoints required by the vision, creating divergent abstractions.【F:packages/mcp/src/server.ts†L64-L104】【F:.cortex/rules/vision.md†L25-L43】
- [ ] **Correct imports used?** – No unused import issues spotted, but the Python client’s logging namespace typo (`brainwav` vs `brAInwav`) breaks brand consistency mandated by governance.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L21-L40】
- [ ] **Reuse existing functionality:** – Opportunity to reuse FastMCP tooling from `packages/mcp-server` instead of duplicating server logic in `packages/mcp`.【F:packages/mcp/src/server.ts†L64-L548】【F:packages/mcp-server/src/server/mcp-server.ts†L1-L53】
- [ ] **Design patterns & principles:** – CORS handling compares JSON-RPC method names to the HTTP verb “OPTIONS”, so preflight requests will never succeed, undermining HTTP support.【F:packages/mcp/src/server/auth-server.ts†L66-L88】
- [ ] **Design artefacts present:** – Not evaluated (no new specs located).
- [ ] **Interface compliance:** – Python client targets `/mcp` but omits the mandatory API key header and health endpoint contract, so it cannot satisfy the FastMCP interface.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L199】【F:packages/mcp-server/src/security/http-auth.ts†L40-L200】
- [ ] **License/legal compliance:** – Not evaluated.

## 3. Functionality & Logic
- [ ] **Correctness:** – HTTP preflight and authentication flows are broken as described above; tool/resource registration paths otherwise appear deterministic.【F:packages/mcp/src/server/auth-server.ts†L66-L121】【F:packages/mcp/src/server.ts†L109-L465】
- [ ] **Edge cases & error states:** – `AuthServer` raises an `HTTPException(204, ...)`, which is later serialized into a JSON-RPC error payload, so the HTTP layer never emits a true 204 response.【F:packages/mcp/src/server/auth-server.ts†L83-L88】【F:packages/mcp/src/server.ts†L232-L303】
- [ ] **Concurrency & multithreading:** – Not evaluated (code is single-threaded async).
- [ ] **User impact:** – Broken authentication prevents Python-side tooling from reaching the MCP hub, blocking user workflows that depend on Cortex-Py integration.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L199】【F:packages/mcp-server/src/security/http-auth.ts†L40-L200】
- [ ] **Rollback plan:** – Not evaluated.
- [ ] **Feature flags/toggles:** – Not evaluated.

## 4. Complexity & Readability
- [ ] **Avoid unnecessary complexity:** – `handleResourcesRead` exceeds the 40-line cap and performs multiple responsibilities (validation, logging, transformation).【F:packages/mcp/src/server.ts†L409-L466】【F:AGENTS.md†L304-L307】
- [ ] **Good naming:** – Mostly descriptive; however, `AuthServer` context mixing JSON-RPC `request` with HTTP headers leads to ambiguity.【F:packages/mcp/src/server/auth-server.ts†L45-L121】
- [ ] **Logical organization:** – Duplicate server implementations between `packages/mcp` and `packages/mcp-server` complicate the source of truth for MCP capabilities.【F:packages/mcp/src/server.ts†L64-L548】【F:packages/mcp-server/src/server/mcp-server.ts†L1-L53】
- [ ] **Understandable control & data flow:** – Preflight/auth paths are confusing because they operate on a JSON-RPC envelope while expecting HTTP semantics.【F:packages/mcp/src/server/auth-server.ts†L66-L176】
- [ ] **Comments:** – Adequate high-level comments.
- [ ] **Style compliance:** – Violations of the “no default exports” rule at the bottom of `server.ts` and `auth-server.ts`.【F:packages/mcp/src/server.ts†L543-L548】【F:packages/mcp/src/server/auth-server.ts†L279-L284】【F:AGENTS.md†L304-L307】
- [ ] **Commented-out code:** – None observed.
- [ ] **Cleanup of debug/test code:** – None observed.

## 5. Error Handling, Logging & Monitoring
- [ ] **Proper error handling:** – JSON-RPC error codes misuse HTTP statuses (e.g., 204), breaking client expectations.【F:packages/mcp/src/server/auth-server.ts†L83-L88】【F:packages/mcp/src/server.ts†L232-L303】
- [ ] **Logging:** – Structured logs include brand/service fields; acceptable.【F:packages/mcp/src/server.ts†L505-L517】
- [ ] **Observability:** – Base server lacks `/metrics` handling, deviating from vision’s observability goals.【F:packages/mcp/src/server.ts†L64-L548】【F:.cortex/rules/vision.md†L38-L43】
- [ ] **User-friendly messages:** – Error text is branded but JSON-RPC codes misuse HTTP statuses (see above).
- [ ] **Post-deployment monitoring:** – Not evaluated.
- [ ] **Alert fatigue check:** – Not evaluated.

## 6. Dependencies, Documentation & Configuration
- [ ] **Documentation updated:** – Python client README still references FastMCP server but code now acts as proxy; mismatch not documented (not evaluated here but worth noting).
- [ ] **System impacts & compatibility:** – Broken authentication impacts Cortex-Py to MCP compatibility.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L199】【F:packages/mcp-server/src/security/http-auth.ts†L40-L200】
- [ ] **Secrets and configs:** – API key omitted from HTTP client headers violates security guidance.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L140】【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】
- [ ] **Package vision and directory structure:** – Duplicate MCP server implementations conflict with single-hub mandate.【F:packages/mcp/src/server.ts†L64-L548】【F:packages/mcp-server/src/server/mcp-server.ts†L1-L53】【F:.cortex/rules/vision.md†L18-L43】
- [ ] **Scaffolding and structure:** – Default-export usage conflicts with repository standards.【F:packages/mcp/src/server.ts†L543-L548】【F:packages/mcp/src/server/auth-server.ts†L279-L284】【F:AGENTS.md†L304-L307】
- [ ] **Platform/environment compatibility:** – Not evaluated.
- [ ] **Build verification:** – Not evaluated.
- [ ] **Data migration scripts:** – Not applicable.
- [ ] **Data retention compliance:** – Not evaluated.
- [ ] **Deployment readiness:** – Not evaluated.
- [ ] **Release notes:** – Not evaluated.
- [ ] **Runbooks/Incident response:** – Not evaluated.

## 7. Security & Data Privacy
- [ ] **Security vulnerabilities:** – Missing API key header exposes unauthenticated traffic rejection and blocks legitimate clients; should inject `Authorization: Bearer` or `x-api-key` from configuration.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L140】【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】
- [ ] **Authentication & authorization:** – Python client ignores API key requirement; TypeScript `AuthServer` assumes headers exist but never ensures they are propagated from transport.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L199】【F:packages/mcp/src/server/auth-server.ts†L45-L176】
- [ ] **Input validation:** – Zod schemas cover resource registration; acceptable.【F:packages/mcp/src/server.ts†L13-L142】
- [ ] **Sensitive data handling:** – Not evaluated.
- [ ] **Third-party code scanning:** – Not evaluated.

## 8. Performance & Scalability
- [ ] **Performance impact:** – No benchmarking evidence; repeated HTTP client instantiation per request avoided, but circuit-breaker resets for each instance (acceptable). Not fully evaluated.
- [ ] **Optimization opportunities:** – Consolidate server logic to avoid duplicated request handling paths.【F:packages/mcp/src/server.ts†L64-L548】【F:packages/mcp-server/src/server/mcp-server.ts†L1-L53】
- [ ] **Scalability:** – Rate limit store keeps entries indefinitely until manual cleanup; acceptable but could be improved (not blocking).

## 9. Usability & Accessibility
- [ ] **User-centric design:** – Authentication breakages render the Python CLI unusable; CLI help strings exist but inability to authenticate undermines usability.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L168-L240】【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】
- [ ] **Accessibility:** – CLI prints text help; no issues noted.
- [ ] **Internationalization/localization:** – Not evaluated.

## 10. Ethics, Responsible AI, and AI Governance
- [ ] **Privacy & exploitation:** – Not evaluated.
- [ ] **Harassment & abuse prevention:** – Not evaluated.
- [ ] **Inclusiveness & fairness:** – Not evaluated.
- [ ] **Compliance with ethical standards:** – Missing authentication breaches security best practices mandated by governance docs.【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】【F:.cortex/rules/vision.md†L18-L43】
- [ ] **Responsible AI governance:** – Not evaluated.
- [ ] **Model version tracking:** – Not evaluated.
- [ ] **Reproducibility:** – Not evaluated.
- [ ] **Explainability artifacts:** – Not evaluated.

## 11. Testing, Rollback, & Quality Assurance
- [ ] **Test coverage:** – No automated tests found for the new Python HTTP client or the TypeScript auth server additions; consider adding integration tests for HTTP transport and Python bridge.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L1-L240】【F:packages/mcp/src/server/auth-server.ts†L20-L284】
- [ ] **Test correctness:** – Not evaluated.
- [ ] **Edge cases & negative tests:** – Not evaluated.
- [ ] **Test maintainability:** – Not evaluated.
- [ ] **Rollback drills:** – Not evaluated.
- [ ] **Feature toggling tested:** – Not evaluated.

## 12. AI Code & Code Completion Considerations
- [ ] **Treat AI output as draft:** – Not evaluated (historical context unknown).
- [ ] **Combine AI and human expertise:** – Not evaluated.
- [ ] **CI/CD integration:** – Not evaluated.
- [ ] **Transparent feedback:** – This review documents concrete gaps for follow-up.
- [ ] **Model & team training:** – Not evaluated.
- [ ] **Bias & fairness auditing:** – Not evaluated.
- [ ] **Security & privacy of AI tools:** – Not evaluated.
- [ ] **Context & business logic:** – Authentication breakage contradicts business requirement for secure MCP access.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L140】【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】
- [ ] **False positives/negatives:** – Not evaluated.

## 13. Collaboration, Review Process & Stakeholder Communication
- [ ] **Clear review roles:** – Not evaluated.
- [ ] **Respectful feedback:** – Not evaluated.
- [ ] **Guidance vs. autonomy:** – Not evaluated.
- [ ] **Positive reinforcement:** – Base logging and schema validation are solid foundations (no action required).【F:packages/mcp/src/server.ts†L13-L142】【F:packages/mcp/src/server.ts†L505-L517】
- [ ] **Timeliness:** – Not evaluated.
- [ ] **Time-zone considerations:** – Not evaluated.
- [ ] **Psychological safety:** – Not evaluated.
- [ ] **Checklist usage:** – This document captures current checklist evaluation.
- [ ] **Bias awareness:** – Not evaluated.
- [ ] **Process metrics:** – Not evaluated.
- [ ] **Cross-functional reviews:** – Security and platform stakeholders should be engaged due to auth failures.
- [ ] **Document decisions:** – Recommend tracking resolutions via ADR or package docs once addressed.
- [ ] **Business sign-off:** – Not evaluated.
- [ ] **User communication:** – Not evaluated.

### Priority Fixes
1. **Inject MCP API key headers in `MCPHttpClient` and expose configuration hooks** so Cortex-Py can authenticate against the FastMCP hub.【F:packages/cortex-mcp/src/cortex_mcp/http_client.py†L68-L199】【F:packages/mcp-server/src/security/http-auth.ts†L148-L179】
2. **Align the TypeScript server stack around the FastMCP implementation**—remove default exports, enforce HTTP/SSE capability alignment, and replace broken CORS/OPTIONS handling with transport-aware hooks.【F:packages/mcp/src/server.ts†L64-L548】【F:packages/mcp/src/server/auth-server.ts†L45-L284】【F:.cortex/rules/vision.md†L25-L43】
3. **Refactor oversized handlers (`handleResourcesRead`) and eliminate default exports** to satisfy `AGENTS.md` anti-pattern rules, adding unit tests that exercise HTTP authentication and resource flows.【F:packages/mcp/src/server.ts†L409-L548】【F:AGENTS.md†L304-L307】

