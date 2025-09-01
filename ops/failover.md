# Failover Plan

1. Monitor SLO dashboards for error rate and latency breaches.
2. If primary region is degraded, trigger standby via `kubectl apply -f ops/standby.yaml`.
3. Verify traffic shift with `kubectl get pods -n cortex`.
4. After recovery, revert using `kubectl delete -f ops/standby.yaml`.
5. Record incident in tracking system.
