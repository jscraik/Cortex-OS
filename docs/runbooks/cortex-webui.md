# Cortex WebUI Runbook

## Scope
Operational procedures for Cortex WebUI: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter cortex-webui lint`
2. `pnpm --filter cortex-webui test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/cortex-webui:${VERSION} apps/cortex-webui`
2. Push image: `docker push cortex/cortex-webui:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-webui/`
4. Verify: `kubectl rollout status deploy/cortex-webui`

## Verification
1. `kubectl get pods -l app=cortex-webui`
2. `curl -fsS http://cortex-webui.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-webui`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-webui --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-webui`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-webui-down` pages team `Cortex WebUI On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex WebUI On-Call`.
3. Use channel `#inc-cortex-webui` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-webui/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-webui`
3. Verify with health check.

## Escalation
- Primary: Cortex WebUI On-Call <ops+cortex-webui@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
