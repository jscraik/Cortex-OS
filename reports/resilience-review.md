# Cortex-OS Resilience Assessment

## Executive Summary
- **Overall Score:** 61
- **Overall RAG:** Amber
- Chaos workflow and runbooks improve resilience posture, but redundancy and observability still require investment.

## Area Scores
| Area | Score | RAG | Evidence |
| --- | --- | --- | --- |
| Redundancy & Failover | 60 | Amber | `packages/orchestration/src/providers/mlx-first-provider.ts` lines 60-96【F:packages/orchestration/src/providers/mlx-first-provider.ts†L60-L96】 |
| Chaos Testing | 50 | Amber | `.github/workflows/chaos.yml` lines 1-29【F:.github/workflows/chaos.yml†L1-L29】; `ops/staging/chaos.mjs` lines 4-24【F:ops/staging/chaos.mjs†L4-L24】 |
| Graceful Degradation | 70 | Amber | `packages/a2a/a2a-core/src/dlq.ts` lines 9-43【F:packages/a2a/a2a-core/src/dlq.ts†L9-L43】; `apps/cortex-webui/utils/sse.ts` lines 20-61【F:apps/cortex-webui/utils/sse.ts†L20-L61】 |
| Observability | 75 | Amber | `packages/observability/src/metrics/index.ts` lines 1-28【F:packages/observability/src/metrics/index.ts†L1-L28】 |
| Recovery | 50 | Red | `packages/orchestration/src/lib/circuit-breaker.ts` lines 30-74【F:packages/orchestration/src/lib/circuit-breaker.ts†L30-L74】 |
| Runbooks | 60 | Amber | `docs/runbooks/failover.md` lines 1-30【F:docs/runbooks/failover.md†L1-L30】; `docs/runbooks/incident.md` lines 1-22【F:docs/runbooks/incident.md†L1-L22】 |

## Resilience Experiment Matrix
| Fault Type | cortex-os | cortex-cli | cortex-tui | cortex-webui | cortex-marketplace | cortex-py | orchestration | a2a | mcp/* | rag | memories | simlab |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Network Partition | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Service Crash | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Dependency Failure | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Resource Exhaustion | △ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | △ | ✗ | △ | ✗ | ✗ |

Legend: ✓ covered, △ partial, ✗ none.

## Risk Register
| ID | Severity | Area | Description | Mitigation |
| --- | --- | --- | --- | --- |
| R3 | Medium | Redundancy | No leader election or replica management | Implement leader election in orchestration and a2a layers |
| R4 | Medium | Observability | No SLO dashboards or alerting | Add dashboards and alert rules for failover events |

## Chaos Backlog
- Network partition tests between services
- CPU and memory exhaustion scenarios
- Dependency outage simulations (e.g., database, message bus)
- Latency injection and circuit-breaker recovery validation
