# A2A Runbook

## Scope
Operational procedures for A2A package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter a2a lint`
2. `pnpm --filter a2a test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/a2a:${VERSION} packages/a2a`
2. Push image: `docker push cortex/a2a:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/a2a/`
4. Verify: `kubectl rollout status deploy/a2a`

## Verification
1. `kubectl get pods -l app=a2a`
2. `curl -fsS http://a2a.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/a2a`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/a2a --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/a2a`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `a2a-down` pages team `A2A On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `A2A On-Call`.
3. Use channel `#inc-a2a` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/a2a/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/a2a`
3. Verify with health check.

## Escalation
- Primary: A2A On-Call <ops+a2a@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
