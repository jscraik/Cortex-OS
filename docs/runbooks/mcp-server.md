# MCP Server Runbook

## Scope
Operational procedures for MCP Server package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter mcp-server lint`
2. `pnpm --filter mcp-server test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/mcp-server:${VERSION} packages/mcp-server`
2. Push image: `docker push cortex/mcp-server:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/mcp-server/`
4. Verify: `kubectl rollout status deploy/mcp-server`

## Verification
1. `kubectl get pods -l app=mcp-server`
2. `curl -fsS http://mcp-server.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/mcp-server`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/mcp-server --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/mcp-server`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `mcp-server-down` pages team `MCP Server On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `MCP Server On-Call`.
3. Use channel `#inc-mcp-server` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/mcp-server/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/mcp-server`
3. Verify with health check.

## Escalation
- Primary: MCP Server On-Call <ops+mcp-server@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
