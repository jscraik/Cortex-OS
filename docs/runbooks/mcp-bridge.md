# MCP Bridge Runbook

## Scope
Operational procedures for MCP Bridge package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter mcp-bridge lint`
2. `pnpm --filter mcp-bridge test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/mcp-bridge:${VERSION} packages/mcp-bridge`
2. Push image: `docker push cortex/mcp-bridge:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/mcp-bridge/`
4. Verify: `kubectl rollout status deploy/mcp-bridge`

## Verification
1. `kubectl get pods -l app=mcp-bridge`
2. `curl -fsS http://mcp-bridge.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/mcp-bridge`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/mcp-bridge --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/mcp-bridge`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `mcp-bridge-down` pages team `MCP Bridge On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `MCP Bridge On-Call`.
3. Use channel `#inc-mcp-bridge` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/mcp-bridge/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/mcp-bridge`
3. Verify with health check.

## Escalation
- Primary: MCP Bridge On-Call <ops+mcp-bridge@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
