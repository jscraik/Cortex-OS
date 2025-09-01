# Memories Runbook

## Scope
Operational procedures for Memories package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter memories lint`
2. `pnpm --filter memories test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/memories:${VERSION} packages/memories`
2. Push image: `docker push cortex/memories:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/memories/`
4. Verify: `kubectl rollout status deploy/memories`

## Verification
1. `kubectl get pods -l app=memories`
2. `curl -fsS http://memories.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/memories`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/memories --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/memories`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `memories-down` pages team `Memories On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Memories On-Call`.
3. Use channel `#inc-memories` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/memories/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/memories`
3. Verify with health check.

## Escalation
- Primary: Memories On-Call <ops+memories@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
