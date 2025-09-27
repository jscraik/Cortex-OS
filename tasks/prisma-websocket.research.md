# Prisma-WebSocket Type Safety Research

## Research Objective

Strengthen brAInwav Cortex-OS data-layer guarantees by enforcing fully typed Prisma access
patterns and refactoring the Realtime memory WebSocket adapter toward a contract-first,
event-driven design with explicit TypeScript message interfaces.

## Existing Implementation Notes

- `apps/api/src/db/prisma-client.ts` manually defines a narrow `PrismaClientType` interface
  instead of reusing the generated `@prisma/client` types. A dynamic import is used with a
  fallback stub that proxies methods to no-op async functions.
- The Prisma schema under `prisma/schema.prisma` includes relational models (`Task`,
  `Project`, `Evidence`, etc.) required by the API `/tasks` endpoint.
- `apps/api/src/routes/api-v1.ts` performs runtime casts (`as unknown as TaskDelegate`)
  to work with `prisma.task`. The router redefines small response shapes for API payloads.
- The repository depends on `@prisma/client@5.22.0`, but the generated client is only lazily
  ensured via `prisma generate` when the module import fails.
- `packages/memories/src/adapters/server.realtime.ts` exposes a monolithic
  `RealtimeMemoryServer` that:
  - Accepts arbitrary `Record<string, unknown>` WebSocket messages.
  - Manages connection state with mutable Maps but lacks explicit state-machine typing.
  - Emits untyped events via Node's `EventEmitter` and sends loosely defined `change` payloads.
  - Provides queueing logic without typed metadata (e.g., `QueuedMessage.data: unknown`).
- Memory streaming infrastructure
  (`packages/memories/src/adapters/store.streaming.ts`) already emits structured
  `ChangeEvent` objects. Contract definitions live in
  `libs/typescript/contracts/src/memory-events.ts`.

## Identified Gaps & Risks

- **Type drift**: Local Prisma interface diverges from the generated client, preventing
  static verification of new models or field changes.
- **Fallback ambiguity**: Stubbed Prisma client returns generic objects, making it hard to
  detect when the system is running without a real database connection.
- **WebSocket message ambiguity**: Lack of discriminated unions leads to runtime-only
  validation and brittle client handling.
- **Connection lifecycle**: No explicit state tracking for `connecting → authenticated →
  subscribed`, complicating reconnection flows and metrics accuracy.
- **Cross-package duplication**: Message shapes are defined inline within the adapter rather
  than through `libs/typescript/contracts`, increasing coupling to implementation details.
- **Boundary enforcement**: No guardrails ensure only approved namespaces/events flow
  between packages, nor any `A2A` event emission for downstream observability.

## Reference Patterns & Dependencies

- Contract-first approach already used for memory events in `libs/typescript/contracts/src/memory-events.ts` with Zod schemas.
- Tests in `packages/memories/tests/integration/realtime-server.test.ts` cover connection
  limits, subscription flow, and queueing, providing a safety net for refactoring.
- Observability expectations (brAInwav branding in logs/messages) are implemented through
  string constants (e.g., API router logging).
- Nx monorepo enforces import boundaries; shared types should flow through
  `libs/typescript/contracts` or dedicated `@cortex-os/*` packages.
- Using `@prisma/client` types directly allows inference of nested delegate shapes
  (`Prisma.TaskDelegate`), removing manual typing in the API route.

## Opportunities & Hypotheses

- Export a fully typed singleton from `prisma-client.ts` by importing `PrismaClient` and
  `Prisma` namespaces, while keeping fallback functionality behind a discriminated type.
- Introduce structured WebSocket message contracts (e.g., `RealtimeMemoryInboundMessage`,
  `RealtimeMemoryOutboundMessage`) with Zod schemas inside
  `libs/typescript/contracts` to enable runtime validation.
- Establish a connection state registry (auth, subscriptions, last activity) that surfaces
  typed snapshots for observability and metrics.
- Emit A2A events using existing `MemoryEventTypes` when broadcasting changes, tightening
  the link between memory operations and runtime analytics.
- Validate inbound messages against the contract schemas and respond with standardized
  error payloads carrying brAInwav branding.
- Extend tests to cover schema validation failures, reconnection state preservation, and
  contract-driven broadcasting.

## Open Questions / Considerations

- Ensure fallback Prisma client clearly communicates degraded mode to consumers—possibly via `isFallback` flag exports or logging.
- Decide whether to keep lazy `prisma generate` or move generation to install hooks to reduce first-request latency.
- Coordinate contract location: memory real-time message schemas likely belong in a new
  module under `libs/typescript/contracts/src/memory-realtime.ts` with exports aggregated
  in `index.ts`.
- Verify Nx boundary rules allow the API app to depend on the contracts package (likely already true via tsconfig references).
- Evaluate whether to emit brAInwav A2A events for connection lifecycle changes or keep metrics within the adapter.
