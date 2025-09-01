# Cortex CLI Runbook

## Scope
Operational procedures for Cortex CLI: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter cortex-cli lint`
2. `pnpm --filter cortex-cli test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/cortex-cli:${VERSION} apps/cortex-cli`
2. Push image: `docker push cortex/cortex-cli:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-cli/`
4. Verify: `kubectl rollout status deploy/cortex-cli`

## Verification
1. `kubectl get pods -l app=cortex-cli`
2. `curl -fsS http://cortex-cli.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-cli`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-cli --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-cli`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-cli-down` pages team `Cortex CLI On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex CLI On-Call`.
3. Use channel `#inc-cortex-cli` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-cli/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-cli`
3. Verify with health check.

## Escalation
- Primary: Cortex CLI On-Call <ops+cortex-cli@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
