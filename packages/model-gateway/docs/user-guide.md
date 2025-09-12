# User Guide

## Sending a Chat Request

```bash
curl -X POST http://127.0.0.1:8081/chat \
  -H 'Content-Type: application/json' \
  -d '{"msgs":[{"role":"user","content":"hi"}]}'
```

## Toggling Privacy Mode

```bash
curl -X POST http://127.0.0.1:8081/privacy \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true}'
```

## Retrieving Metrics

```bash
curl http://127.0.0.1:8081/metrics
```

Use these workflows during development to verify routing and provider selection.
