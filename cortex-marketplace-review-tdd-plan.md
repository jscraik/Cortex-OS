# Cortex Marketplace Technical Review & TDD Plan

## Technical Review

| Area             | Findings                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture** | Entry point (`index.ts`) loads config and bootstraps Fastify via `build()` in `app.ts`. Plugin-based structure registers security middleware (helmet, cors, rate-limit) and exposes modular routes (health, servers, registries, categories, stats).                                                                                                      |
| **Strengths**    | Uses TypeScript with strict mode, Zod for runtime validation, Swagger/OpenAPI for docs, and Vitest tests (unit + integration). Caching strategy via disk & memory, graceful shutdown hooks, and detailed health endpoints.                                                                                                                                |
| **Issues**       | <ul><li><strong>Undeclared <code>request</code> usage</strong> in route handlers causes compilation/runtime failures.</li><li><strong>Schema registration order</strong>: <code>categories</code> routes reference <code>ServerManifest</code> before it is added.</li><li><strong>Test suite failing</strong>: <code>pnpm --filter @cortex-os/marketplace-api test</code> shows 26 failing tests due to above issues and incomplete route implementations.</li></ul> |
| **Risk**         | Failing tests and undefined variable errors block deployment; missing schemas can reject valid requests.                                                                                                                                                                                                                                                  |

## Engineering Principle

**Explicit Route Contract Principle**

> Every Fastify route must:
>
> 1. Declare typed `request` and `reply` parameters.
> 2. Register shared schemas _before_ they are referenced.
> 3. Provide Zod/Fastify schemas for all inputs and outputs.
> 4. Be covered by tests that fail prior to implementation changes.

## TDD Implementation Plan

1. **Regression test for registries route** – add failing test reproducing `request` undefined error.
2. Fix registries, categories, stats, servers handlers to use explicit `request`/`reply` params.
3. **Schema registration test** – failing test for categories route expecting `ServerManifest` schema to resolve.
4. Register `ServerManifest` schema globally so all routes can reference it.
5. Add linter rule `no-undef`/`no-unused-vars` to prevent undeclared identifier usage; test lint failure when `request` missing.
6. Expand unit tests for route validation (invalid params, missing fields) ensuring coverage.
7. Run `pre-commit`, `pnpm lint`, and `pnpm test` per commit.
8. Document environment variables and configuration loader behavior in `README.md`; add docs lint test.

## Deployment Readiness Checklist

1. All tasks above committed via Conventional Commits.
2. `pnpm lint`, `pnpm test`, and `pre-commit` pipelines green.
3. Integration suite demonstrates registry, category, and stats endpoints working end-to-end.
4. Swagger spec reachable at `/documentation` and health checks return `200`.
