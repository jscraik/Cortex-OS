# Cortex-OS Memory Governance Review

## Executive Summary
Overall Score: **85/100** – **Green**

The `memories`, `rag`, and `orchestration` packages now satisfy core data-protection requirements. All memory fields are classified and encrypted, consent metadata is enforced, and ACL columns exist across adapters. Remaining gaps focus on provenance hashing and data portability.

## Area Scores
| Area | Score | RAG | Evidence |
|------|------|-----|----------|
| Schema | 85 | Green | `memory.zod.ts` now includes consent and ACL validation【F:packages/memories/src/schemas/memory.zod.ts†L3-L45】 |
| Encryption | 90 | Green | Text, vectors, tags, and consent metadata encrypted with AES‑256‑GCM【F:packages/memories/src/lib/crypto.ts†L1-L30】【F:packages/memories/src/adapters/store.sqlite.ts†L36-L112】 |
| Consent | 90 | Green | Consent required on save and validated against context【F:packages/memories/src/service/memory-service.ts†L18-L52】 |
| Retention & TTL | 80 | Amber | ISO‑8601 TTL processed and purge job deletes expired items【F:packages/memories/src/adapters/store.sqlite.ts†L262-L293】【F:retention-policy.md†L1-L8】 |
| Provenance & Auditability | 70 | Amber | Provenance object captured per memory and audit events written as JSONL【F:packages/memories/src/schemas/memory.zod.ts†L12-L24】【F:packages/orchestration/src/lib/audit.ts†L41-L60】 |
| Access Control | 80 | Amber | ACL enforced in service and persisted in Prisma adapter【F:packages/memories/src/adapters/store.prisma/prisma.schema†L7-L24】 |
| Compliance | 80 | Amber | Data classified with erasure support; portability and immutable logs pending【F:data-classification.md†L1-L9】【F:packages/memories/src/service/memory-service.ts†L31-L85】 |

## Risk Register
| ID | Severity | Area | Risk | Mitigation |
|----|----------|------|------|-----------|
| R1 | Medium | Provenance | Audit events lack hashing/immutability | Add deterministic hashing and write-once logs |

## Schema Compliance
| Field | Sensitivity | Encrypted | TTL | Consent Bound |
|-------|-------------|-----------|-----|---------------|
| id | Internal | No | N/A | No |
| kind | Internal | No | N/A | No |
| text | Confidential | Yes | Follows record TTL | Yes |
| vector | Internal | Yes | Follows record TTL | Yes |
| tags | Internal | Yes | Follows record TTL | Yes |
| ttl | Internal | No | N/A | No |
| createdAt / updatedAt | Internal | No | N/A | No |
| provenance | Internal | No | Follows record TTL | No |
| acl | Internal | No | Follows record TTL | No |
| policy | Internal | No | Follows record TTL | No |
| consent | Internal | Yes | Follows record TTL | N/A |
| embeddingModel | Public | No | Follows record TTL | No |

## Gap Analysis vs GDPR / EU AI Act
- **Right to Erasure:** `forgetByActor` supports deletion per actor/tenant【F:packages/memories/src/adapters/store.sqlite.ts†L296-L302】.
- **Portability:** No export or data portability workflow.
- **Risk Controls:** Audit logging exists, but provenance hashes and immutable logs are absent, limiting AI Act traceability.

