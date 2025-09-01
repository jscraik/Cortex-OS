# Cortex Py Runbook

## Scope
Operational procedures for Cortex Py: deployment, rollback, failover, monitoring, incident response and disaster recovery.

## Pre-checks
1. `uv run ruff check .`
2. `uv run pytest`
3. Ensure Docker registry access and Kubernetes context.

## Deployment
1. Build image (installs Python dependencies with uv): `docker build -t cortex/cortex-py:${VERSION} apps/cortex-py`
   - Ensure your Dockerfile in `apps/cortex-py` includes a step like: `RUN uv pip install -r requirements.txt`
2. Push image: `docker push cortex/cortex-py:${VERSION}`
3. Rollout: `kubectl apply -f infra/k8s/cortex-py/`
4. Verify: `kubectl rollout status deploy/cortex-py`

## Verification
1. `kubectl get pods -l app=cortex-py`
2. `curl -fsS http://cortex-py.${DOMAIN}/healthz`

## Rollback
1. `kubectl rollout undo deploy/cortex-py`
2. Repeat verification steps.

## Failover
1. Ensure >=2 replicas: `kubectl scale deploy/cortex-py --replicas=2`
2. Drain node to test HA: `kubectl drain <node> --ignore-daemonsets --delete-local-data`
3. Confirm service available.

## Monitoring & Alerting
- Logs: `kubectl logs -f deploy/cortex-py`
- Metrics: Prometheus scrape endpoint `/metrics`
- Alert: rule `cortex-py-down` pages team `Cortex Py On-Call`.

## Incident Response
1. Classify severity (S1,S2,S3).
2. Page `Cortex Py On-Call`.
3. Use channel `#inc-cortex-py` for coordination.

## Disaster Recovery
1. Restore config: `kubectl apply -f backups/cortex-py/<DATE>.yaml`
2. Restart: `kubectl rollout restart deploy/cortex-py`
3. Verify with health check.

## Escalation
- Primary: Cortex Py On-Call <ops+cortex-py@cortex.dev>
- Secondary: Core Ops <ops@cortex.dev>
