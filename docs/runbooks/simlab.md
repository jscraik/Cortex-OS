# Simlab Runbook

## Scope
Operational procedures for Simlab package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter simlab lint`
2. `pnpm --filter simlab test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/simlab:${VERSION} packages/simlab`
2. Push image: `docker push cortex/simlab:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/simlab/`
4. Verify: `kubectl rollout status deploy/simlab`

## Verification
1. `kubectl get pods -l app=simlab`
2. `curl -fsS http://simlab.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/simlab`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/simlab --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/simlab`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `simlab-down` pages team `Simlab On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Simlab On-Call`.
3. Use channel `#inc-simlab` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/simlab/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/simlab`
3. Verify with health check.

## Escalation
- Primary: Simlab On-Call <ops+simlab@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
