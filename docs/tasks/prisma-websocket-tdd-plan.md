# Prisma-WebSocket Type Safety TDD Plan

## Guiding Principles

- Uphold brAInwav production standards: no mock placeholders, branded telemetry, and contract-first design.
- Enforce 40-line function limits, named exports, and async/await per `CODESTYLE.md`.
- Prefer test-first changes that capture regressions for Prisma delegate typing and WebSocket messaging.

## Phase 1: Contract Foundation (Failing Tests First)

1. Add new Zod-backed schemas to `libs/typescript/contracts`:
   - `RealtimeMemoryInboundMessageSchema` covering `subscribe`, `unsubscribe`, `ping`.
   - `RealtimeMemoryOutboundMessageSchema` covering `connected`, `subscribed`, `change`, `error`, etc.
   - Connection state snapshot schema for observability events.
2. Write contract unit tests validating accepted and rejected payloads.
3. Export TypeScript types and update `index.ts` barrel to surface new contracts.

## Phase 2: Prisma Client Hardening

1. Author API tests that fail because current Prisma typing is too loose:
   - Validate that `/tasks` handler uses generated types without `unknown` casts.
   - Ensure fallback mode exposes an `isFallback` flag so API can log degraded state.
2. Refactor `prisma-client.ts`:
   - Import `PrismaClient` and `Prisma` namespaces directly from `@prisma/client`.
   - Maintain lazy generation, but return a discriminated singleton `{ client, disconnect, isFallback }` typed as `PrismaClient`.
   - Guarantee fallback proxy implements delegate signatures returning sensible defaults with brAInwav warnings.
3. Update API router to rely on typed delegates and remove manual interfaces.
4. Extend tests to cover fallback logging and ensure tasks payload is correctly typed.

## Phase 3: WebSocket Adapter Refactor

1. Start by writing failing integration tests in `packages/memories/tests/integration/realtime-server.test.ts`:
   - Assert invalid message payloads are rejected with contract-driven errors.
   - Verify connection state snapshot exposes typed shape (e.g., `connectedAt`, `subscriptions`).
   - Confirm broadcast replays use outbound schema.
2. Implement adapter changes:
   - Introduce state management helper to track lifecycle per connection.
   - Replace `Record<string, unknown>` handling with schema validation using new contracts.
   - Emit standardized outbound messages and queue entries using typed helpers.
   - Publish optional A2A events leveraging `MemoryEventTypes` for downstream metrics.
3. Ensure reconnection logic rehydrates subscriptions from typed state and queues only schema-compliant messages.

## Phase 4: Cross-Package Enforcement

1. Add boundary tests (or extend `structure:validate` fixtures if needed) ensuring API and
   memories packages depend on contracts rather than each other.
2. Update any import paths to flow through `@cortex-os/contracts` barrel exports.
3. Document new contracts in `packages/memories/README.md` or relevant docs for consumer clarity.

## Verification & Quality Gates

- `pnpm lint:smart` and `pnpm test:smart` focused on affected projects (`@cortex-os/contracts`, `@cortex-os/memories`, `api`).
- Add targeted Vitest suites for contracts and adapter integration.
- Run `pnpm structure:validate` to confirm boundary compliance.
- Capture coverage deltas to keep ≥90% threshold.

## Risks & Mitigations

- Prisma runtime generation latency → keep cached flag and add logging for first-run generation.
- WebSocket reconnection edge cases → expand tests for queue expiry and state resubscription.
- Contract breaking changes → version outbound message schema carefully and update clients in lockstep.
