# ML Inference Service Audit

## Overview
- **Service**: `services/ml-inference`
- **Focus Areas**: model hosting, batching, caching, safety, observability

## Findings
| Check | Status | Notes |
| --- | --- | --- |
| Model registry | ❌ | No registry or model version tracking |
| A/B & canary | ❌ | No traffic splitting mechanisms |
| Rate limits | ❌ | No request throttling |
| Batching | ❌ | Only single-request processing |
| Caching | ✅ | In-memory LRU cache with metrics |
| Prompt/response logging | ✅ | Redacts digits before logging |
| Safety filters | ✅ | Basic banned-word filter |
| Observability | ✅ | `/health`, `/ready`, `/metrics` expose model & commit |
| Budget tracking | ❌ | No accounting of compute costs |

## Test Plan Results
- Load tests: concurrent requests handled without errors.
- Latency SLO: `/predict` responses <100 ms.
- Cache correctness: repeated prompts served from cache.
- Safety filter: blocked banned prompts with HTTP 400.

## Fix Plan
1. Integrate model registry for versioned deployments.
2. Implement A/B and canary routing with gradual traffic shifting.
3. Add rate limiting and request budgets per client.
4. Support batch inference for throughput gains.
5. Track per-request compute budget and surface in metrics.

## Score
- **Coverage**: 4/9 checks → `44%`

