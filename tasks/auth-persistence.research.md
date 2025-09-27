# Auth Persistence Investigation

## Objective

Ensure the Better Auth persistence suite runs against a real Postgres/Prisma backend without falling back to in-memory or Kysely adapters.

## Current Findings

- The Vitest persistence spec spins up Postgres via Testcontainers and now reaches the Better Auth router.
  Route rewrites from `/auth/register` to `/auth/sign-up/email` are working.
- Requests still fail with `TypeError: db2.selectFrom is not a function` inside Better Auth, indicating the
  runtime thinks it was given a Kysely-style database instead of a Prisma adapter.
- `apps/api/src/auth/config.ts` passes `new DatabaseAdapter()` into `betterAuth({ database })`. The class
  returns a plain object with CRUD helpers but **not** the adapter factory Better Auth expects.
- Better Auth's published Prisma adapter (`better-auth/dist/adapters/prisma-adapter`) wraps the Prisma client
  and exposes `adapterId`, `usePlural`, transactions, and other metadata. Our custom adapter bypasses this,
  so Better Auth defaults to the Kysely path and calls `.selectFrom()`.

## Constraints & Requirements

- Keep `ensurePrismaSchema()` behaviour so schema `db push` still runs before the first database call.
- Maintain brAInwav logging/branding for observability.
- Avoid default exports, keep functions under 40 lines, and honour the async/await policy.
- Integration should remain synchronous for `betterAuth({ database })`, so any async preparation must
  finish before adapter creation.

## Candidate Approaches

1. Import `prismaAdapter` from Better Auth, run `ensurePrismaSchema()` before instantiating it, and pass the
   resulting adapter factory directly to `betterAuth`.
2. Wrap the official adapter with a thin proxy that injects logging and schema checks while preserving the
  expected adapter signature.
3. If schema bootstrap must stay lazy, hook Prisma middleware (`$extends` or `$use`) to trigger
   `ensurePrismaSchema()` before queries instead of replacing the adapter interface.

## Next Steps

- Refactor `DatabaseAdapter` to expose a Better Auth adapter factory, likely via composition around `prismaAdapter`.
- Update `apps/api/src/auth/config.ts` to pass the factory instead of the helper class instance.
- Rerun `pnpm vitest --run --config apps/api/vitest.config.ts tests/auth/persistence.spec.ts` to confirm the
  persistence spec reaches the Prisma backend and passes.
- Add regression coverage if needed to lock in adapter wiring.
