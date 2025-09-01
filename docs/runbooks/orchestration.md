# Orchestration Runbook

## Scope
Operational procedures for Orchestration package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter orchestration lint`
2. `pnpm --filter orchestration test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/orchestration:${VERSION} packages/orchestration`
2. Push image: `docker push cortex/orchestration:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/orchestration/`
4. Verify: `kubectl rollout status deploy/orchestration`

## Verification
1. `kubectl get pods -l app=orchestration`
2. `curl -fsS http://orchestration.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/orchestration`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/orchestration --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/orchestration`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `orchestration-down` pages team `Orchestration On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Orchestration On-Call`.
3. Use channel `#inc-orchestration` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/orchestration/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/orchestration`
3. Verify with health check.

## Escalation
- Primary: Orchestration On-Call <ops+orchestration@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
