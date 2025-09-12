# Logging & Monitoring

ASBR emits structured logs via `logInfo` and `logError` utilities. Direct output to files or systemd journals as needed.

To collect metrics, expose `PERF_METRICS=1` in test runs or integrate the event stream with external observability tools.
