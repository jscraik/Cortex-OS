# Cortex Marketplace Technical Review & TDD Plan

## Technical Review

| Area             | Findings                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture** | Entry point (`index.ts`) loads config and bootstraps Fastify via `build()` in `app.ts`. Plugin-based structure registers security middleware (helmet, cors, rate-limit) and exposes modular routes (health, servers, registries, categories, stats).                                                                                                      |
| **Strengths**    | Uses TypeScript with strict mode, Zod for runtime validation, Swagger/OpenAPI for docs, and Vitest tests (unit + integration). Caching strategy via disk & memory, graceful shutdown hooks, and detailed health endpoints.                                                                                                                                |
| **Issues**       | Undeclared `request` usage in route handlers causes compilation/runtime failures; schema registration order problems (e.g., `categories` routes reference `ServerManifest` before it is added); test suite failing (`pnpm --filter @cortex-os/marketplace-api test` shows 26 failing tests) due to the above issues and incomplete route implementations. |
| **Risk**         | Failing tests and undefined variable errors block deployment; missing schemas can reject valid requests.                                                                                                                                                                                                                                                  |

## Engineering Principle

### Explicit Route Contract Principle

> Every Fastify route must:
>
> 1. Declare typed `request` and `reply` parameters.
> 2. Register shared schemas _before_ they are referenced.
> 3. Provide Zod/Fastify schemas for all inputs and outputs.
> 4. Be covered by tests that fail prior to implementation changes.

## TDD Implementation Plan

1. **Regression test for registries route** – add failing test reproducing `request` undefined error.

### Example (Vitest)

```ts
   // registries.test.ts
   it('should fail if request is undefined in handler', async () => {
     // Simulate calling the route handler without declaring request
     // @ts-expect-error
     await expect(registriesHandler()).rejects.toThrow(/request is not defined/);
   });
   // Expected error: ReferenceError: request is not defined
```

1. Expand unit tests for route validation (invalid params, missing fields) ensuring coverage.
2. Run `pre-commit`, `pnpm lint`, and `pnpm test` per commit.
3. Document environment variables and configuration loader behavior in `README.md`; add docs lint test.

## Deployment Readiness Checklist

1. All tasks above committed via Conventional Commits.
2. `pnpm lint`, `pnpm test`, and `pre-commit` pipelines green.
3. Integration suite demonstrates registry, category, and stats endpoints working end-to-end.
4. Swagger spec reachable at `/documentation` and health checks return `200`.
