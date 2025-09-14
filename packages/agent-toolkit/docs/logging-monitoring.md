# Logging & Monitoring

Scripts log operational details to `stderr`. Capture logs by redirecting:

```bash
just scout pattern src/ 2>scout.log
```

Parse JSON results with tools like `jq` and forward logs to your observability stack as needed.
