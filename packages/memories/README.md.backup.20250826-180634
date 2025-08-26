# @cortex-os/memories

Production-grade scaffold for a memories module inside the ASBR monorepo.

- ESM-only, TypeScript, tsup builds
- Hexagonal ports (MemoryStore, Embedder) with swappable adapters
- JSON Schema + Zod for validation; Python client uses Pydantic
- In-memory adapter for tests; Prisma/Postgres for prod; SQLite stub placeholder
- OpenTelemetry spans in service methods

Scripts
- `pnpm build` – build with tsup
- `pnpm test` – run unit tests with Vitest
- `pnpm prisma:gen` – generate Prisma client
- `pnpm db:migrate` – deploy Prisma migrations

Integration
- Bind `MemoryService` in `apps/cortex-os/src/boot.ts` and expose HTTP routes: `POST /memories`, `GET /memories/:id`, `POST /memories/search`.

Upgrade path
- Add pgvector + ANN for vector search
- Add policy enforcement and compaction jobs

