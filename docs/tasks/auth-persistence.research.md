# Auth Persistence Investigation

> **⚠️ HISTORICAL DOCUMENT**: This file references `apps/api` which has been removed from the codebase. Retained for historical reference and learning purposes.

## Objective

Ensure the Better Auth persistence suite runs against a real Postgres/Prisma backend without falling back to in-memory or Kysely adapters (app removed).

## Current Findings

- The Vitest persistence spec spins up Postgres via Testcontainers and reaches the Better Auth router (app removed).
  Route rewrites from `/auth/register` to `/auth/sign-up/email` were working.
- Requests failed with `TypeError: db2.selectFrom is not a function` inside Better Auth, indicating the
  runtime thought it was given a Kysely-style database instead of a Prisma adapter.
- Auth config passed `new DatabaseAdapter()` into `betterAuth({ database })` (app removed). The class
  returned a plain object with CRUD helpers but **not** the adapter factory Better Auth expects.
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

- Refactor `DatabaseAdapter` to expose a Better Auth adapter factory, likely via composition around `prismaAdapter` (app removed).
- Update auth config to pass the factory instead of the helper class instance (app removed).
- Rerun persistence spec to confirm the integration reaches the Prisma backend and passes (app removed).
- Add regression coverage if needed to lock in adapter wiring.
