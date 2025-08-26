# Memories Package Audit

## Scope
- Package: `packages/memories`
- Focus: stores, adapters, retention, privacy

## Checks
- **Persistence correctness**: In-memory store handles round-trip upsert/get. SQLite adapter unimplemented. Qdrant adapter relies on external service.
- **Compaction**: No explicit compaction routines; `purgeExpired` stubbed in `InMemoryStore`.
- **TTL/Retention**: `MemoryService` computes `expireAt` and calls `deleteExpired`; in-memory adapter lacks TTL enforcement.
- **Encryption at rest/in transit**: No encryption logic found in adapters; relies on underlying services (Qdrant/Neo4j).
- **Access logs**: No auditing hooks for reads/writes.

## DPIA Checklist
- [ ] Data minimisation
- [ ] Purpose limitation
- [ ] Storage limitation / TTL
- [ ] Encryption for PII
- [ ] Access logging and alerts

## Audit Trails
Current code lacks persistent audit trail; recommend implementing structured logging of CRUD operations with tenant/user context.

## Test Coverage Added
- Persistence round-trip for in-memory store
- Load recall of memories under stress
- PII redaction on storage

## Fix Plan
1. Implement TTL enforcement in all store adapters
2. Add encryption utilities for local stores and TLS enforcement for remote adapters
3. Introduce audit logging hooks for access events
4. Complete SQLite store implementation
5. Expand DPIA checklist automation

## Score
- **Security**: 5/10
- **Privacy**: 4/10
- **Reliability**: 6/10

