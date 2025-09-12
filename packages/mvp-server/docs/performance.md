# Performance & Benchmarking

Use [k6](https://k6.io/) or [autocannon](https://github.com/mcollina/autocannon) for load testing.

```bash
autocannon http://localhost:3000/health
```

Optimize plugins to avoid blocking the event loop and enable `--max-old-space-size` for memory-intensive workloads.
