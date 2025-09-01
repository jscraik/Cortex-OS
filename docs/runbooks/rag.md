# RAG Runbook

## Scope
Operational procedures for RAG package: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `pnpm --filter rag lint`
2. `pnpm --filter rag test`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image: `docker build -t cortex/rag:${VERSION} packages/rag`
2. Push image: `docker push cortex/rag:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/rag/`
4. Verify: `kubectl rollout status deploy/rag`

## Verification
1. `kubectl get pods -l app=rag`
2. `curl -fsS http://rag.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/rag`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/rag --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/rag`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `rag-down` pages team `RAG On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `RAG On-Call`.
3. Use channel `#inc-rag` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/rag/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/rag`
3. Verify with health check.

## Escalation
- Primary: RAG On-Call <ops+rag@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
