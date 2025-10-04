# Auth Persistence TDD Plan

> **⚠️ HISTORICAL DOCUMENT**: This file references `apps/api` which has been removed from the codebase. Retained for historical reference and learning purposes.

## Goal

Ensure Better Auth uses the official Prisma adapter so the persistence spec passes against the Postgres
Testcontainers setup while preserving schema bootstrapping and brAInwav observability hooks (app removed).

## Test Strategy

1. Add or update unit coverage for the adapter wrapper to confirm it exposes the Better Auth factory shape
   (e.g., the resulting adapter reports `adapterId: 'prisma'`).
2. Re-run the existing persistence integration spec (app removed).
3. Optionally add a smoke test to ensure `auth.api.signUpEmail.handler` resolves without throwing when given
   mock input and interacts with Prisma.

## Implementation Steps

- Refactor auth database adapter (app removed):
  - Import `prismaAdapter` from Better Auth.
  - Ensure `ensurePrismaSchema()` executes before providing the adapter factory.
  - Compose the official adapter while injecting logging hooks (`console.info` / `console.error` with
    brAInwav branding) by wrapping the Prisma client or adapter callbacks as needed.
  - Expose a named export such as `createBetterAuthPrismaAdapter` that returns the adapter factory, retiring
    the current `DatabaseAdapter` class unless pieces are reused for schema bootstrapping.
- Update auth config to call the new factory (app removed).
- Remove or adapt any call sites that still expect the old `DatabaseAdapter` instance (tests, Express
  helpers, etc.) (app removed).
- Verify that environmental toggles (`CORTEX_SKIP_PRISMA_PUSH`) and logging remain honoured.

## Validation

- Run persistence tests (app removed)
- Lint checks (app removed)
- Confirm any new or updated unit tests pass.
- Review persistence-spec logs to ensure schema pushes and adapter operations still emit brAInwav context.
