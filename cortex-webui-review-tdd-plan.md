# Cortex WebUI Technical Review & TDD Plan

## Technical Review Summary

- The backend server centralizes configuration, routing, WebSocket management, and database bootstrapping in a single file, making it hard to test or extend modularly.
- Configuration constants include a hardcoded JWT secret fallback, which risks accidental exposure in production.
- Frontend routing suppresses TypeScript checks via multiple `@ts-ignore` comments, hiding typing problems and increasing maintenance cost.
- Existing test suite fails to resolve several component imports, indicating incomplete module resolution or missing files.

## Strict Software Engineering Principle

**Validated Layered Architecture (VLA):**
Each request must pass through distinct layers—entry (controller), domain (service), and data—with all external inputs validated at boundaries, dependencies injected, and zero use of unchecked fallbacks.

## TDD-Driven Implementation Plan

1. **Config Validation Module**
   1. Add failing tests ensuring the app throws when `JWT_SECRET` or database paths are absent.
   2. Implement a `config.ts` that reads env vars via Zod and forbids insecure defaults.
   3. Update `server.ts` and services to consume the validated config.
2. **Rate Limiting Middleware**
   1. Write tests verifying a burst of requests returns HTTP 429 after `RATE_LIMIT_MAX`.
   2. Implement middleware using `express-rate-limit`, plug into server, and document limits.
3. **Server Decomposition**
   1. Introduce failing tests for initializing server with mocked services (DB, WebSocket).
   2. Extract routing and WebSocket setup into separate modules wired via dependency injection.
4. **Frontend Route Typing**
   1. Create tests asserting each `<Route>` renders a typed component without `ts-ignore`.
   2. Refactor `App.tsx` to use a typed route map and remove `@ts-ignore` directives.
5. **Module Resolution Fixes**
   1. Reproduce failing component imports with a failing test (already failing).
   2. Adjust Vite path aliases or file locations so tests locate components reliably.
6. **Security Tests**
   1. Add tests confirming JWT is rejected when signed with wrong secret or expired.
   2. Implement corresponding checks in `AuthService` and controllers.

## Testing

- `pnpm --filter cortex-webui test` (fails: unresolved component imports)
