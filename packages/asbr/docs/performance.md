# Performance & Benchmarking

Enable internal metrics during tests:
```bash
PERF_METRICS=1 pnpm --filter @cortex-os/asbr test:perf
```

Use the results to profile slow handlers and optimize routes. Configure caching TTLs in the server for high-throughput scenarios.
