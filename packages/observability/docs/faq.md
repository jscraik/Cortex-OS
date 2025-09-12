# FAQ

**Why don't I see spans?**
Ensure `initializeObservability` runs and exporters can reach their endpoints.

**How do I switch exporters?**
Set `TRACE_EXPORTER` and `METRIC_EXPORTER` environment variables.

**Can this run in the browser?**
No. It targets Node.js services.
