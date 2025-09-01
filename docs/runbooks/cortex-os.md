# Cortex OS Runbook

## Scope
Operational procedures for Cortex OS: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter cortex-os lint`
2. `pnpm --filter cortex-os test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/cortex-os:${VERSION} apps/cortex-os`
2. Push image: `docker push cortex/cortex-os:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-os/`
4. Verify: `kubectl rollout status deploy/cortex-os`

## Verification
1. `kubectl get pods -l app=cortex-os`
2. `curl -fsS http://cortex-os.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-os`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-os --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-os`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-os-down` pages team `Cortex OS On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex OS On-Call`.
3. Use channel `#inc-cortex-os` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-os/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-os`
3. Verify with health check.

## Escalation
- Primary: Cortex OS On-Call <ops+cortex-os@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
