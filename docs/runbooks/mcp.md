# MCP Core Runbook

## Scope
Operational procedures for MCP Core package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter mcp lint`
2. `pnpm --filter mcp test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/mcp:${VERSION} packages/mcp`
2. Push image: `docker push cortex/mcp:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/mcp/`
4. Verify: `kubectl rollout status deploy/mcp`

## Verification
1. `kubectl get pods -l app=mcp`
2. `curl -fsS http://mcp.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/mcp`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/mcp --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/mcp`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `mcp-down` pages team `MCP Core On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `MCP Core On-Call`.
3. Use channel `#inc-mcp` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/mcp/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/mcp`
3. Verify with health check.

## Escalation
- Primary: MCP Core On-Call <ops+mcp@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
