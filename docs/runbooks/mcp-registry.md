# MCP Registry Runbook

## Scope
Operational procedures for MCP Registry package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter mcp-registry lint`
2. `pnpm --filter mcp-registry test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/mcp-registry:${VERSION} packages/mcp-registry`
2. Push image: `docker push cortex/mcp-registry:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/mcp-registry/`
4. Verify: `kubectl rollout status deploy/mcp-registry`

## Verification
1. `kubectl get pods -l app=mcp-registry`
2. `curl -fsS http://mcp-registry.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/mcp-registry`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/mcp-registry --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/mcp-registry`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `mcp-registry-down` pages team `MCP Registry On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `MCP Registry On-Call`.
3. Use channel `#inc-mcp-registry` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/mcp-registry/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/mcp-registry`
3. Verify with health check.

## Escalation
- Primary: MCP Registry On-Call <ops+mcp-registry@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
