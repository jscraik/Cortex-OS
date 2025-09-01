# Cortex TUI Runbook

## Scope
Operational procedures for Cortex TUI: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter cortex-tui lint`
2. `pnpm --filter cortex-tui test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/cortex-tui:${VERSION} apps/cortex-tui`
2. Push image: `docker push cortex/cortex-tui:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-tui/`
4. Verify: `kubectl rollout status deploy/cortex-tui`

## Verification
1. `kubectl get pods -l app=cortex-tui`
2. `curl -fsS http://cortex-tui.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-tui`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-tui --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-tui`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-tui-down` pages team `Cortex TUI On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex TUI On-Call`.
3. Use channel `#inc-cortex-tui` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-tui/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-tui`
3. Verify with health check.

## Escalation
- Primary: Cortex TUI On-Call <ops+cortex-tui@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
