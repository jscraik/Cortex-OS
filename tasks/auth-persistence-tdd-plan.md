# Auth Persistence TDD Plan

## Goal

Ensure Better Auth uses the official Prisma adapter so the persistence spec passes against the Postgres
Testcontainers setup while preserving schema bootstrapping and brAInwav observability hooks.

## Test Strategy

1. Add or update unit coverage for the adapter wrapper to confirm it exposes the Better Auth factory shape
   (e.g., the resulting adapter reports `adapterId: 'prisma'`).
2. Re-run the existing persistence integration spec:
   `pnpm vitest --run --config apps/api/vitest.config.ts tests/auth/persistence.spec.ts`.
3. Optionally add a smoke test to ensure `auth.api.signUpEmail.handler` resolves without throwing when given
   mock input and interacts with Prisma.

## Implementation Steps

- Refactor `apps/api/src/auth/database-adapter.ts`:
  - Import `prismaAdapter` from Better Auth.
  - Ensure `ensurePrismaSchema()` executes before providing the adapter factory.
  - Compose the official adapter while injecting logging hooks (`console.info` / `console.error` with
    brAInwav branding) by wrapping the Prisma client or adapter callbacks as needed.
  - Expose a named export such as `createBetterAuthPrismaAdapter` that returns the adapter factory, retiring
    the current `DatabaseAdapter` class unless pieces are reused for schema bootstrapping.
- Update `apps/api/src/auth/config.ts` to call the new factory (for example,
  `database: createBetterAuthPrismaAdapter()`).
- Remove or adapt any call sites that still expect the old `DatabaseAdapter` instance (tests, Express
  helpers, etc.).
- Verify that environmental toggles (`CORTEX_SKIP_PRISMA_PUSH`) and logging remain honoured.

## Validation

- `pnpm vitest --run --config apps/api/vitest.config.ts tests/auth/persistence.spec.ts`
- `pnpm lint --filter apps-api`
- Confirm any new or updated unit tests pass.
- Review persistence-spec logs to ensure schema pushes and adapter operations still emit brAInwav context.
