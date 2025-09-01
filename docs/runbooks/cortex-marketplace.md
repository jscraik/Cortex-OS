# Cortex Marketplace Runbook

## Scope
Operational procedures for Cortex Marketplace: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter cortex-marketplace lint`
2. `pnpm --filter cortex-marketplace test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/cortex-marketplace:${VERSION} apps/cortex-marketplace`
2. Push image: `docker push cortex/cortex-marketplace:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-marketplace/`
4. Verify: `kubectl rollout status deploy/cortex-marketplace`

## Verification
1. `kubectl get pods -l app=cortex-marketplace`
2. `curl -fsS http://cortex-marketplace.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-marketplace`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-marketplace --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-marketplace`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-marketplace-down` pages team `Cortex Marketplace On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex Marketplace On-Call`.
3. Use channel `#inc-cortex-marketplace` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-marketplace/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-marketplace`
3. Verify with health check.

## Escalation
- Primary: Cortex Marketplace On-Call <ops+cortex-marketplace@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
