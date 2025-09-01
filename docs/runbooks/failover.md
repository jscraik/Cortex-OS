# Failover Runbook

Automates failover when primary services become unavailable.

## Preconditions
- Access to monitoring dashboard
- Node.js 20+ and pnpm 9+

## Steps
1. Trigger chaos scenario with deterministic seed:

   ```bash
   CHAOS_SEED=42 node ops/staging/chaos.mjs
   ```

2. Observe circuit breaker status via metrics:

   ```bash
   pnpm --filter @cortex-os/orchestration run status
   ```

3. Verify secondary replicas become leader:

   ```bash
   pnpm --filter @cortex-os/orchestration run check-leader
   ```

4. Confirm SLOs restored within 5m MTTR.

5. Record outcome in incident tracker.
