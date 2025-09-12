# User Guide

## Sending a Request
Example using `curl` to query the RAG endpoint:
```bash
curl -X POST http://localhost:3333/rag \
  -H 'Content-Type: application/json' \
  -d '{"query":"What is Cortex?"}'
```

## Checking Metrics
If `ENABLE_METRICS=true`, visit `http://localhost:3333/metrics` to view Prometheus metrics for scraping.

## Keyboard Shortcuts
N/A – the gateway does not expose a user interface.
