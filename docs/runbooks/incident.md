# Incident Response Runbook

Documented steps to handle resilience incidents.

## Detection
- Alerts from observability dashboards
- Failing chaos experiments

## Response
1. Notify on-call via #incidents channel.
2. Execute [Failover Runbook](./failover.md).
3. Collect logs and metrics:

   ```bash
   pnpm --filter @cortex-os/observability run collect --output logs/incident
   ```

4. Post-mortem template recorded in docs/postmortems.

## Resolution
- Verify SLOs.
- Close incident ticket with root cause and follow-up actions.
