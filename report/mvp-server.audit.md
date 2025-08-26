# MVP Server Audit

- **Package**: `apps/cortex-os/packages/mvp-server`
- **Timestamp**: 2025-08-26T20:25:39+00:00

## Readiness Score
| Area | Max | Score |
| --- | --- | --- |
| Security | 25 | 12 |
| Reliability | 20 | 8 |
| Architecture | 15 | 9 |
| Test | 25 | 5 |
| Documentation | 10 | 4 |
| Accessibility | 5 | 0 |
| **Total** | **100** | **38** |

> Current readiness: **38/100**. Target ≥ 90.

## Findings
### HTTP/gRPC APIs
- Fastify server skeleton exists but export mismatch (`buildServer` missing).
- No gRPC surface.

### Authentication & Authorization
- HTTP server lacks token or session auth.
- MCP tool layer enforces token but no RBAC/ABAC.

### Rate Limits
- `@fastify/rate-limit` configured at 60 req/min.

### Persistence Adapters
- No persistence layer or migration framework.

## Checks
- **Input validation**: Zod schemas absent for HTTP routes.
- **Auth flows**: missing login/token refresh endpoints.
- **RBAC/ABAC**: not implemented.
- **Idempotency**: no idempotency keys.
- **Migrations**: none.
- **Health/Readiness**: `/health`, `/ready`, `/live` present.
- **OpenAPI**: no spec or validation.

## TDD Plan
1. API contract tests using OpenAPI stub.
2. Auth & permission matrix with token, roles.
3. Migration tests via SQLite + Prisma.
4. Chaos tests inducing timeouts and rate limit bursts.

## Fix Plan
- Restore Fastify `buildServer` export and align tests.
- Introduce Zod schemas for routes and generate OpenAPI.
- Implement JWT auth with role checks.
- Add persistence adapter (e.g., SQLite) with migration scripts.
- Instrument p95/p99 latency and define SLOs.

## Notes
- Ensure deterministic seeds and capped resource usage in tests.
